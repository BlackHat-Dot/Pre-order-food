from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    get_current_user_optional,
)
from app.core.security import (
    create_otp_proof_token,
)
from app.crud.user import (
    get_user_by_email,
    get_user_by_phone,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.verification import (
    Msg91VerifyRequest,
    SendOtpRequest,
    VerifyOtpRequest,
)
from app.services.msg91 import (
    check_msg91_rate_limit,
    verify_msg91_token,
)
from app.services.otp_verification import (
    OtpVerificationService,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Verification"],
)

PHONE_PURPOSES = {
    "signup_phone",
    "profile_phone",
}

EMAIL_PURPOSES = {
    "profile_email",
}


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def get_target(
    body: SendOtpRequest | VerifyOtpRequest,
) -> str:
    if body.channel == "phone":
        return str(body.phone)

    return str(body.email).lower()


async def validate_email_verification_request(
    db: AsyncSession,
    user: User | None,
    body: SendOtpRequest,
    email: str,
) -> None:
    if body.channel != "email":
        raise HTTPException(
            status_code=400,
            detail=(
                "profile_email requires "
                "email channel"
            ),
        )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Login required",
        )

    existing = await get_user_by_email(
        db,
        email,
    )

    if (
        existing
        and existing.id != user.id
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Email already in use"
            ),
        )


async def validate_msg91_request(
    db: AsyncSession,
    user: User | None,
    body: Msg91VerifyRequest,
) -> None:
    existing = await get_user_by_phone(
        db,
        body.phone,
    )

    if body.purpose == "signup_phone":
        if existing:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Phone already "
                    "registered"
                ),
            )

        return

    if body.purpose == "profile_phone":
        if not user:
            raise HTTPException(
                status_code=401,
                detail=(
                    "Authentication required"
                ),
            )

        if (
            existing
            and existing.id != user.id
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Phone already in use"
                ),
            )

        return

    raise HTTPException(
        status_code=400,
        detail="Unsupported purpose",
    )


def build_msg91_proof_token(
    purpose: str,
    verified_phone: str,
    user: User | None,
) -> str:
    if purpose == "signup_phone":
        return create_otp_proof_token(
            vtype="phone_signup",
            phone=verified_phone,
            ttl_seconds=900,
        )

    assert user is not None

    return create_otp_proof_token(
        vtype="phone_profile",
        phone=verified_phone,
        user_id=user.id,
        ttl_seconds=900,
    )


# ─────────────────────────────────────────────────────────────
# Send OTP
# ─────────────────────────────────────────────────────────────

@router.post("/send-otp")
async def send_otp(
    body: SendOtpRequest,
    request: Request,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User | None,
        Depends(
            get_current_user_optional
        ),
    ],
) -> dict:
    if body.purpose not in EMAIL_PURPOSES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported purpose"
            ),
        )

    target = get_target(body)

    await validate_email_verification_request(
        db=db,
        user=user,
        body=body,
        email=target,
    )

    service = OtpVerificationService(
        db,
        user_name=(
            user.name
            if user else None
        ),
    )

    result = await service.send_otp(
        channel=body.channel,
        target=target,
        purpose=body.purpose,
    )

    if result.get("ok"):
        return result

    error = result.get("error")

    if error in {
        "rate_limited",
        "cooldown",
    }:
        raise HTTPException(
            status_code=429,
            detail={
                "error": error,
                "message": result.get(
                    "message",
                    "Too many requests",
                ),
                "resend_in_seconds": (
                    result.get(
                        "resend_in_seconds",
                        60,
                    )
                ),
                "cooldown_seconds": (
                    result.get(
                        "cooldown_seconds",
                        60,
                    )
                ),
            },
        )

    if error == "delivery_failed":
        raise HTTPException(
            status_code=502,
            detail=result.get(
                "message",
                "Email delivery failed",
            ),
        )

    raise HTTPException(
        status_code=400,
        detail=result,
    )


# ─────────────────────────────────────────────────────────────
# Verify OTP
# ─────────────────────────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(
    body: VerifyOtpRequest,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User | None,
        Depends(
            get_current_user_optional
        ),
    ],
) -> dict:
    target = get_target(body)

    acting_user_id = None

    if body.purpose == "profile_email":
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Login required",
            )

        acting_user_id = user.id

    service = OtpVerificationService(
        db
    )

    result = await service.verify_otp(
        channel=body.channel,
        target=target,
        purpose=body.purpose,
        code=body.code,
        acting_user_id=acting_user_id,
    )

    if result.get("ok"):
        return result

    error = result.get("error")

    if error == "expired_otp":
        raise HTTPException(
            status_code=410,
            detail=result,
        )

    raise HTTPException(
        status_code=400,
        detail=result,
    )


# ─────────────────────────────────────────────────────────────
# Verify MSG91
# ─────────────────────────────────────────────────────────────

@router.post("/verify-msg91")
async def verify_msg91(
    body: Msg91VerifyRequest,
    request: Request,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User | None,
        Depends(
            get_current_user_optional
        ),
    ],
) -> dict:
    client_ip = (
        request.client.host
        if request.client
        else "unknown"
    )

    if not check_msg91_rate_limit(
        client_ip
    ):
        raise HTTPException(
            status_code=429,
            detail=(
                "Too many verification "
                "attempts"
            ),
        )

    await validate_msg91_request(
        db=db,
        user=user,
        body=body,
    )

    try:
        verified_phone = (
            await verify_msg91_token(
                body.access_token,
                body.phone,
            )
        )

    except ValueError as exc:
        logger.warning(
            (
                "MSG91 verification failed "
                "ip=%s phone=%s error=%s"
            ),
            client_ip,
            body.phone,
            exc,
        )

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    token = build_msg91_proof_token(
        purpose=body.purpose,
        verified_phone=verified_phone,
        user=user,
    )

    logger.info(
        (
            "MSG91 verified "
            "purpose=%s ip=%s "
            "phone=%s"
        ),
        body.purpose,
        client_ip,
        verified_phone,
    )

    return {
        "ok": True,
        "verification_token": token,
        "token_expires_in_seconds": 900,
        "phone": verified_phone,
    }