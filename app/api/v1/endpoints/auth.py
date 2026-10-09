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
from app.core.deps import (
    decode_access_token,
    get_current_user,
    get_optional_token_from_request,
    is_token_revoked,
    rate_limit_auth,
    revoke_token,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    set_auth_cookies,
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

    if not user:
        try:
            norm = normalize_e164(username)
            user = await get_user_by_phone(db, norm)
        except Exception:
            pass

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
    dependencies=[Depends(rate_limit_auth)],
)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserOut:
    # Public registration strictly creates customer accounts.
    # Privileged roles (admin/shop_owner) cannot be registered publicly.
    if payload.role and payload.role != "customer":
        logger.warning("Attempted privileged role registration blocked: role=%s", payload.role)

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

    user_id = new_id()

    user = User(
        id=user_id,
        role="customer",
        name=payload.name,
        phone=normalized_phone,
        password_hash=hash_password(
            payload.password
        ),
        phone_verified=True,
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

@router.get(
    "/check-phone",
    dependencies=[Depends(rate_limit_auth)],
)
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
    dependencies=[Depends(rate_limit_auth)],
)
async def login(
    request: Request,
    response: Response,
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

    access_token = create_access_token(
        user.id,
        user.role,
    )
    refresh_token = create_refresh_token(
        user.id,
        user.role,
    )

    set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


# ─────────────────────────────────────────────────────────────
# Refresh Token
# ─────────────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_auth)],
)
async def refresh_token(
    payload: RefreshTokenRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    if await is_token_revoked(payload.refresh_token):
        raise HTTPException(
            status_code=401,
            detail="Refresh token has been revoked",
        )

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

    # Rotate refresh token: revoke current one
    await revoke_token(payload.refresh_token, exp_timestamp=data.get("exp"))

    new_access = create_access_token(
        user.id,
        user.role,
    )
    new_refresh = create_refresh_token(
        user.id,
        user.role,
    )

    set_auth_cookies(response, new_access, new_refresh)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
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
async def logout(
    request: Request,
    response: Response,
) -> Response:
    token = await get_optional_token_from_request(request)
    if token:
        await revoke_token(token)

    refresh_cookie = request.cookies.get("refresh_token")
    if refresh_cookie:
        await revoke_token(refresh_cookie)

    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
    )
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response