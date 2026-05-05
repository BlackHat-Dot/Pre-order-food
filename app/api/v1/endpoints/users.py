from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut


router = APIRouter(prefix="/users", tags=["Users"])


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None


class PasswordUpdate(BaseModel):
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
    for k, v in payload.model_dump(exclude_unset=True).items():
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
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password updated"}


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: str, db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[User, Depends(require_roles("admin"))]) -> UserOut:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut.model_validate(user)

