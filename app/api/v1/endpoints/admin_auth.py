from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import rate_limit_auth
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decrypt_totp_secret,
    set_auth_cookies,
    verify_password,
    verify_totp_code,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.utils.phone import normalize_e164

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/auth",
    tags=["Admin Auth"],
)


class AdminLoginRequest(BaseModel):
    username: str
    password: str
    totp_code: str | None = None


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_auth)],
)
async def admin_login(
    payload: AdminLoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    raw_user = payload.username.strip()
    norm_phone = None
    try:
        norm_phone = normalize_e164(raw_user)
    except Exception:
        pass

    filters = [User.name == raw_user]
    if norm_phone:
        filters.append(User.phone == norm_phone)
    else:
        filters.append(User.phone == raw_user)

    stmt = select(User).where(or_(*filters))
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or user.role != "admin" or not user.is_active:
        logger.warning("Failed admin login attempt for username=%s", raw_user)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    if not verify_password(payload.password, user.password_hash):
        logger.warning("Invalid password for admin user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    # Enforce TOTP 2FA when configured
    if user.totp_enabled:
        if not payload.totp_code or not payload.totp_code.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="TOTP 2FA code is required",
            )
        if not user.totp_secret_encrypted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Admin 2FA configuration error on server",
            )
        totp_secret = decrypt_totp_secret(user.totp_secret_encrypted)
        if not verify_totp_code(totp_secret, payload.totp_code):
            logger.warning("Invalid TOTP 2FA verification for admin user_id=%s", user.id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP 2FA code",
            )

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)

    set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )
