from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_roles
from app.core.security import decode_otp_proof_token, hash_password, verify_password
from app.crud.user import get_user_by_email, get_user_by_phone
from app.db.session import get_db
from app.models.phone_audit import PhoneAuditLog
from app.models.user import User
from app.schemas.user import UserOut
from app.utils.ids import new_id
from app.utils.phone import normalize_e164

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None)
    # Required when changing email
    email_verification_token: str | None = Field(default=None, max_length=2048)
    # Required when changing email AND current email is already verified (security gate)
    current_password: str | None = Field(default=None, max_length=128)
    # Required when changing phone number
    phone_verification_token: str | None = Field(default=None, max_length=2048)

    @field_validator("email", mode="before")
    @classmethod
    def empty_email(cls, v: object) -> object:
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("phone", mode="before")
    @classmethod
    def normalise_phone(cls, v: object) -> object:
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        try:
            return normalize_e164(str(v))
        except ValueError as exc:
            raise ValueError(str(exc)) from exc


class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


@router.get("/me", response_model=UserOut)
async def me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    payload: ProfileUpdate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> UserOut:
    data = payload.model_dump(exclude_unset=True)
    email_token = data.pop("email_verification_token", None)
    phone_token = data.pop("phone_verification_token", None)
    current_password = data.pop("current_password", None)

    # ── Email change ──────────────────────────────────────────────────────────
    if "email" in data:
        new_email: str | None = data["email"]

        if new_email is None:
            # Removing email entirely
            user.email = None
            user.email_verified = False
            data.pop("email")

        elif new_email.lower() != (user.email or "").lower():
            # Changing to a new email address

            # Security gate: if the user currently has a VERIFIED email, require password
            if user.email and user.email_verified:
                if not current_password:
                    raise HTTPException(
                        status_code=400,
                        detail="Your current password is required to change a verified email address.",
                    )
                if not verify_password(current_password, user.password_hash):
                    raise HTTPException(status_code=400, detail="Incorrect password.")

            # Require proof token for all email changes
            if not email_token:
                raise HTTPException(
                    status_code=400,
                    detail="Verify your new email address before saving.",
                )
            try:
                proof = decode_otp_proof_token(email_token)
            except JWTError as ex:
                raise HTTPException(status_code=401, detail="Email verification token is invalid or expired.") from ex

            if (
                proof.get("vtype") != "email_profile"
                or str(proof.get("uid") or "") != str(user.id)
                or str(proof.get("email") or "").lower() != new_email.lower()
            ):
                raise HTTPException(status_code=400, detail="Email verification token does not match.")

            # Duplicate check
            existing = await get_user_by_email(db, new_email)
            if existing and existing.id != user.id:
                raise HTTPException(status_code=409, detail="This email address is already in use.")

            user.email = new_email
            user.email_verified = True
            data.pop("email")
        else:
            # Email unchanged
            if email_token and not user.email_verified:
                try:
                    proof = decode_otp_proof_token(email_token)
                except JWTError as ex:
                    raise HTTPException(status_code=401, detail="Email verification token is invalid or expired.") from ex

                if (
                    proof.get("vtype") != "email_profile"
                    or str(proof.get("uid") or "") != str(user.id)
                    or str(proof.get("email") or "").lower() != new_email.lower()
                ):
                    raise HTTPException(status_code=400, detail="Email verification token does not match.")
                user.email_verified = True
            data.pop("email")

    # ── Phone change ──────────────────────────────────────────────────────────
    if "phone" in data:
        new_phone: str | None = data.pop("phone")

        if new_phone and new_phone != user.phone:
            # Require current password to change phone
            if not current_password:
                raise HTTPException(
                    status_code=400,
                    detail="Your current password is required to change your phone number.",
                )
            if not verify_password(current_password, user.password_hash):
                raise HTTPException(status_code=400, detail="Incorrect password.")

            # Require MSG91 proof token
            if not phone_token:
                raise HTTPException(
                    status_code=400,
                    detail="Phone number verification is required before making this change.",
                )
            try:
                proof = decode_otp_proof_token(phone_token)
            except JWTError as ex:
                raise HTTPException(status_code=401, detail="Phone verification token is invalid or expired.") from ex

            if proof.get("vtype") != "phone_profile":
                raise HTTPException(status_code=400, detail="Invalid phone verification token type.")
            if str(proof.get("uid") or "") != str(user.id):
                raise HTTPException(status_code=400, detail="Phone verification token does not match your account.")

            try:
                proof_phone = normalize_e164(str(proof.get("phone") or ""))
                new_phone_norm = normalize_e164(new_phone)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid phone number in verification token.")

            if proof_phone != new_phone_norm:
                raise HTTPException(status_code=400, detail="Verified phone does not match the submitted number.")

            # Duplicate check
            existing = await get_user_by_phone(db, new_phone_norm)
            if existing and existing.id != user.id:
                raise HTTPException(status_code=409, detail="This phone number is already in use.")

            old_phone = user.phone
            user.phone = new_phone_norm
            user.phone_verified = True

            # Audit log
            client_ip = (request.client.host if request.client else None) or "unknown"
            audit = PhoneAuditLog(
                id=new_id(),
                user_id=user.id,
                action="changed",
                old_phone=old_phone,
                new_phone=new_phone_norm,
                ip_address=client_ip,
            )
            db.add(audit)
            logger.info(
                "[profile] phone changed user_id=%s old=%s new=%s ip=%s",
                user.id, old_phone, new_phone_norm, client_ip,
            )

    # Apply remaining safe fields (name only at this point)
    safe_fields = {"name"}
    for k, v in data.items():
        if k in safe_fields:
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
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current.")
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password updated"}


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> UserOut:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut.model_validate(user)
