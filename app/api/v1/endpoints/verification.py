from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user_optional
from app.crud.user import get_user_by_email, get_user_by_phone
from app.db.session import get_db
from app.models.user import User
from app.schemas.verification import SendOtpRequest, VerifyOtpRequest
from app.services.otp_verification import OtpVerificationService

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
    Step 1: ask for an OTP.
    - For signup phone, you must not already have an account with that phone.
    - For profile email, you must be logged in and the email must be free for other users.
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
        # Use 429 for rate limits / active OTP so the UI can show a friendly message.
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
    Step 2: user types the 6-digit code from the server logs (SMS is not wired yet).
    If the code is correct, we return a short verification_token used by /auth/register or PATCH /users/me.
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
