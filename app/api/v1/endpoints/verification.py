from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_optional
from app.core.security import create_otp_proof_token
from app.crud.user import get_user_by_email, get_user_by_phone
from app.db.session import get_db
from app.models.user import User
from app.schemas.verification import Msg91VerifyRequest, SendOtpRequest, VerifyOtpRequest
from app.services.msg91 import check_msg91_rate_limit, verify_msg91_token
from app.services.otp_verification import OtpVerificationService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Verification"])


def _target_from_body(body: SendOtpRequest | VerifyOtpRequest) -> str:
    if body.channel == "phone":
        return str(body.phone)
    return str(body.email).lower()


@router.post("/send-otp")
async def send_otp(
    body: SendOtpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> dict:
    """
    Step 1: ask for an OTP (legacy in-house flow, kept for email verification).
    Phone verification now uses POST /verify-msg91 (MSG91 Widget).
    """
    target = _target_from_body(body)

    if body.purpose == "signup_phone":
        if body.channel != "phone":
            raise HTTPException(status_code=400, detail="signup_phone requires channel phone")
        existing = await get_user_by_phone(db, target)
        if existing:
            raise HTTPException(status_code=409, detail="Phone already registered")

    elif body.purpose == "profile_email":
        if body.channel != "email":
            raise HTTPException(status_code=400, detail="profile_email requires channel email")
        if not user:
            raise HTTPException(status_code=401, detail="Login required to verify email")
        other = await get_user_by_email(db, target)
        if other and other.id != user.id:
            raise HTTPException(status_code=409, detail="Email already in use")
    else:
        raise HTTPException(status_code=400, detail="Unsupported purpose")

    service = OtpVerificationService(db)
    result = await service.send_otp(channel=body.channel, target=target, purpose=body.purpose)
    if not result.get("ok"):
        code = result.get("error")
        if code in {"rate_limited", "otp_active"}:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=result)
        raise HTTPException(status_code=400, detail=result)
    return result


@router.post("/verify-otp")
async def verify_otp(
    body: VerifyOtpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> dict:
    """
    Step 2: verify OTP code (legacy flow, kept for email verification).
    Phone verification now uses POST /verify-msg91 (MSG91 Widget).
    """
    target = _target_from_body(body)

    if body.purpose == "profile_email":
        if not user:
            raise HTTPException(status_code=401, detail="Login required to verify email")
        acting_user_id = user.id
    else:
        acting_user_id = None

    service = OtpVerificationService(db)
    result = await service.verify_otp(
        channel=body.channel,
        target=target,
        purpose=body.purpose,
        code=body.code,
        acting_user_id=acting_user_id,
    )
    if not result.get("ok"):
        err = result.get("error")
        if err == "expired_otp":
            raise HTTPException(status_code=status.HTTP_410_GONE, detail=result)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result)
    return result


@router.post("/verify-msg91")
async def verify_msg91(
    body: Msg91VerifyRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> dict:
    """
    Exchange a MSG91 widget access_token for our own short-lived proof JWT.

    - purpose="signup_phone": no auth required; phone must not already exist.
    - purpose="profile_phone": auth required; issues a phone_profile proof token.

    The returned `verification_token` must be sent in the subsequent
    POST /auth/register or PATCH /users/me request.
    """
    client_ip = (request.client.host if request.client else None) or "unknown"

    # Per-IP rate limiting: max 10 verifications per minute
    if not check_msg91_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Please wait a minute and try again.",
        )

    if body.purpose == "signup_phone":
        # Ensure no account already uses this phone (prevent account enumeration via timing)
        existing = await get_user_by_phone(db, body.phone)
        if existing:
            raise HTTPException(status_code=409, detail="This phone number is already registered.")

    elif body.purpose == "profile_phone":
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to change phone number.",
            )
        # Ensure no other account uses this phone
        existing = await get_user_by_phone(db, body.phone)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="This phone number is already in use by another account.")

    # Verify the MSG91 access_token server-side (cannot be forged by the client)
    try:
        verified_phone = await verify_msg91_token(body.access_token, body.phone)
    except ValueError as exc:
        logger.warning("[verify-msg91] Verification failed ip=%s phone=%s: %s", client_ip, body.phone, exc)
        raise HTTPException(status_code=400, detail=str(exc))

    # Issue our own short-lived proof JWT
    if body.purpose == "signup_phone":
        token = create_otp_proof_token(vtype="phone_signup", phone=verified_phone, ttl_seconds=900)
        logger.info("[verify-msg91] signup_phone verified ip=%s phone=%s", client_ip, verified_phone)
    else:  # profile_phone
        assert user is not None  # checked above
        token = create_otp_proof_token(
            vtype="phone_profile",
            phone=verified_phone,
            user_id=user.id,
            ttl_seconds=900,
        )
        logger.info(
            "[verify-msg91] profile_phone verified ip=%s user_id=%s phone=%s",
            client_ip, user.id, verified_phone,
        )

    return {
        "ok": True,
        "verification_token": token,
        "token_expires_in_seconds": 900,
        "phone": verified_phone,
    }
