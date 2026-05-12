from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_roles
from app.core.security import decode_otp_proof_token, hash_password, verify_password
from app.crud.user import get_user_by_email, get_user_by_phone
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut


router = APIRouter(prefix="/users", tags=["Users"])


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=8, max_length=20)
    email_verification_token: str | None = Field(default=None, max_length=2048)

    @field_validator("email", mode="before")
    @classmethod
    def empty_email(cls, v: object) -> object:
        if isinstance(v, str) and not v.strip():
            return None
        return v


class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


@router.get("/me", response_model=UserOut)
async def me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    payload: ProfileUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> UserOut:
    if payload.email and payload.email != user.email:
        existing = await get_user_by_email(db, payload.email)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Email already in use")
    if payload.phone and payload.phone != user.phone:
        existing = await get_user_by_phone(db, payload.phone)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Phone already in use")

    data = payload.model_dump(exclude_unset=True)
    token = data.pop("email_verification_token", None)

    if "email" in data:
        new_email = data["email"]
        if new_email is None:
            user.email_verified = False
        elif new_email != user.email:
            if not token:
                raise HTTPException(status_code=400, detail="Verify the new email before saving (missing token)")
            try:
                proof = decode_otp_proof_token(token)
            except JWTError as ex:
                raise HTTPException(status_code=401, detail="Invalid or expired email verification") from ex
            if (
                proof.get("vtype") != "email_profile"
                or str(proof.get("uid") or "") != str(user.id)
                or str(proof.get("email") or "").lower() != str(new_email).lower()
            ):
                raise HTTPException(status_code=400, detail="Email verification mismatch")
            user.email_verified = True

    for k, v in data.items():
        setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.patch("/me/password")
async def update_password(
    payload: PasswordUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password updated"}


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: str, db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[User, Depends(require_roles("admin"))]) -> UserOut:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut.model_validate(user)

