from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.crud.user import (
    get_user_by_email,
    get_user_by_phone,
)
from app.db.session import get_db
from app.models.phone_audit import PhoneAuditLog
from app.models.user import User
from app.schemas.auth import (
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.utils.ids import new_id
from app.utils.phone import normalize_e164

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


def extract_login_credentials(data: dict) -> tuple[str, str]:
    username = str(
        data.get("username")
        or data.get("email")
        or data.get("phone")
        or ""
    ).strip()

    password = str(
        data.get("password") or ""
    ).strip()

    return username, password


async def get_login_payload(request: Request) -> tuple[str, str]:
    content_type = (
        request.headers.get("content-type") or ""
    ).lower()

    if (
        "application/x-www-form-urlencoded"
        in content_type
        or "multipart/form-data"
        in content_type
    ):
        form = await request.form()

        return extract_login_credentials(dict(form))

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid request body",
        )

    if not isinstance(body, dict):
        raise HTTPException(
            status_code=400,
            detail="Invalid login payload",
        )

    return extract_login_credentials(body)


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str,
) -> User:
    user = await get_user_by_phone(db, username)

    if not user and "@" in username:
        user = await get_user_by_email(db, username)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    if not verify_password(
        password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    if not user.phone_verified:
        raise HTTPException(
            status_code=403,
            detail="Phone not verified",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive",
        )

    return user


# ─────────────────────────────────────────────────────────────
# Register
# ─────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserOut:
    if payload.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin registration is restricted",
        )

    try:
        normalized_phone = normalize_e164(
            payload.phone
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number",
        )

    existing_phone = await get_user_by_phone(
        db,
        normalized_phone,
    )

    if existing_phone:
        raise HTTPException(
            status_code=409,
            detail="Phone already registered",
        )

    if payload.email:
        existing_email = await get_user_by_email(
            db,
            payload.email,
        )

        if existing_email:
            raise HTTPException(
                status_code=409,
                detail="Email already registered",
            )

    user_id = new_id()

    user = User(
        id=user_id,
        role=payload.role,
        name=payload.name,
        phone=normalized_phone,
        email=payload.email,
        password_hash=hash_password(
            payload.password
        ),
        phone_verified=True,
        email_verified=False,
    )

    db.add(user)

    client_ip = (
        request.client.host
        if request.client else "unknown"
    )

    audit_log = PhoneAuditLog(
        id=new_id(),
        user_id=user_id,
        action="registered",
        old_phone=None,
        new_phone=normalized_phone,
        ip_address=client_ip,
    )

    db.add(audit_log)

    await db.commit()
    await db.refresh(user)

    logger.info(
        "New user registered: id=%s role=%s ip=%s",
        user_id,
        payload.role,
        client_ip,
    )

    return UserOut.model_validate(user)

@router.get("/check-phone")
async def check_phone(
    phone: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        normalized_phone = normalize_e164(phone)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number",
        )

    user = await get_user_by_phone(
        db,
        normalized_phone,
    )

    return {
        "exists": user is not None
    }


# ─────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    username, password = await get_login_payload(
        request
    )

    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail="Username and password are required",
        )

    user = await authenticate_user(
        db,
        username,
        password,
    )

    return TokenResponse(
        access_token=create_access_token(
            user.id,
            user.role,
        ),
        refresh_token=create_refresh_token(
            user.id,
            user.role,
        ),
    )


# ─────────────────────────────────────────────────────────────
# Refresh Token
# ─────────────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    try:
        data = jwt.decode(
            payload.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[
                settings.JWT_ALGORITHM
            ],
        )
    except JWTError as ex:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
        ) from ex

    if data.get("type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail="Invalid token type",
        )

    user_id = data.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload",
        )

    user = await db.get(User, user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    return TokenResponse(
        access_token=create_access_token(
            user.id,
            user.role,
        ),
        refresh_token=create_refresh_token(
            user.id,
            user.role,
        ),
    )


# ─────────────────────────────────────────────────────────────
# Current User
# ─────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserOut,
)
async def me(
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> UserOut:
    return UserOut.model_validate(user)


# ─────────────────────────────────────────────────────────────
# Logout
# ─────────────────────────────────────────────────────────────

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout() -> Response:
    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )