from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token, decode_otp_proof_token, hash_password, verify_password
from app.crud.user import get_user_by_phone, get_user_by_email
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RefreshTokenRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.utils.ids import new_id


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: RegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]) -> UserOut:
    if payload.role == "admin":
        raise HTTPException(status_code=403, detail="Admin registration is restricted")

    # Server-side proof that the phone OTP flow succeeded (cannot be skipped from the browser alone).
    try:
        proof = decode_otp_proof_token(payload.phone_verification_token)
    except JWTError as ex:
        raise HTTPException(status_code=401, detail="Invalid or expired phone verification") from ex
    if proof.get("vtype") != "phone_signup" or proof.get("phone") != payload.phone:
        raise HTTPException(status_code=400, detail="Phone verification mismatch")

    existing = await get_user_by_phone(db, payload.phone)
    if existing:
        raise HTTPException(status_code=409, detail="Phone already registered")

    if payload.email:
        existing = await get_user_by_email(db, payload.email)
        if existing:
            raise HTTPException(status_code=409, detail="email already registered")

    user = User(
        id=new_id(),
        role=payload.role,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone_verified=True,
        email_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    username = ""
    password = ""
    content_type = (request.headers.get("content-type") or "").lower()
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        username = str(form.get("username") or form.get("email") or form.get("phone") or "").strip()
        password = str(form.get("password") or "").strip()
    else:
        payload = await request.json()
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Invalid login payload")
        username = str(payload.get("username") or payload.get("email") or payload.get("phone") or "").strip()
        password = str(payload.get("password") or "").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username/email/phone and password are required")

    # Backward compatibility: accept email or phone
    user = await get_user_by_phone(db, username)
    if not user and "@" in username:
        user = await get_user_by_email(db, username)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.phone_verified:
        raise HTTPException(status_code=403, detail="Phone not verified")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshTokenRequest, db: Annotated[AsyncSession, Depends(get_db)]) -> TokenResponse:
    try:
        data = jwt.decode(payload.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as ex:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from ex
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = data.get("sub")
    role = data.get("role")
    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
    )


@router.get("/me", response_model=UserOut)
async def me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)

