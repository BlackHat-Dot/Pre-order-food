from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
)
from jose import JWTError
from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    get_current_user,
    require_roles,
)
from app.core.security import (
    decode_otp_proof_token,
    hash_password,
    verify_password,
)
from app.crud.user import (
    get_user_by_email,
    get_user_by_phone,
)
from app.db.session import get_db
from app.models.phone_audit import (
    PhoneAuditLog,
)
from app.models.user import User
from app.schemas.user import UserOut
from app.utils.ids import new_id
from app.utils.phone import (
    normalize_e164,
)
from app.api.v1.endpoints.orders import create_notification

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
    )

    email: EmailStr | None = None

    phone: str | None = Field(
        default=None,
    )

    email_verification_token: str | None = (
        Field(
            default=None,
            max_length=2048,
        )
    )

    phone_verification_token: str | None = (
        Field(
            default=None,
            max_length=2048,
        )
    )

    current_password: str | None = Field(
        default=None,
        max_length=128,
    )

    @field_validator(
        "email",
        mode="before",
    )
    @classmethod
    def normalize_email(
        cls,
        value: object,
    ) -> object:
        if (
            isinstance(value, str)
            and not value.strip()
        ):
            return None

        return value

    @field_validator(
        "phone",
        mode="before",
    )
    @classmethod
    def normalize_phone(
        cls,
        value: object,
    ) -> object:
        if (
            value is None
            or (
                isinstance(value, str)
                and not value.strip()
            )
        ):
            return None

        try:
            return normalize_e164(
                str(value)
            )

        except ValueError as exc:
            raise ValueError(
                str(exc)
            ) from exc


class PasswordUpdate(BaseModel):
    current_password: str = Field(
        min_length=8,
        max_length=128,
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

async def get_user_or_404(
    db: AsyncSession,
    user_id: str,
) -> User:
    user = await db.get(
        User,
        user_id,
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


async def validate_email_change(
    db: AsyncSession,
    user: User,
    new_email: str,
    email_token: str | None,
    current_password: str | None,
) -> str:
    if (
        user.email
        and user.email_verified
    ):
        if not current_password:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Current password "
                    "required"
                ),
            )

        if not verify_password(
            current_password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=400,
                detail="Incorrect password",
            )

    if not email_token:
        raise HTTPException(
            status_code=400,
            detail=(
                "Email verification "
                "required"
            ),
        )

    try:
        proof = decode_otp_proof_token(
            email_token
        )

    except JWTError as exc:
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid email "
                "verification token"
            ),
        ) from exc

    if (
        proof.get("vtype")
        != "email_profile"
        or str(
            proof.get("uid") or ""
        ) != str(user.id)
        or str(
            proof.get("email") or ""
        ).lower()
        != new_email.lower()
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Email verification "
                "mismatch"
            ),
        )

    existing = await get_user_by_email(
        db,
        new_email,
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

    return new_email


async def validate_phone_change(
    db: AsyncSession,
    user: User,
    new_phone: str,
    phone_token: str | None,
    current_password: str | None,
) -> str:
    if not current_password:
        raise HTTPException(
            status_code=400,
            detail=(
                "Current password "
                "required"
            ),
        )

    if not verify_password(
        current_password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="Incorrect password",
        )

    if not phone_token:
        raise HTTPException(
            status_code=400,
            detail=(
                "Phone verification "
                "required"
            ),
        )

    try:
        proof = decode_otp_proof_token(
            phone_token
        )

    except JWTError as exc:
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid phone "
                "verification token"
            ),
        ) from exc

    if (
        proof.get("vtype")
        != "phone_profile"
        or str(
            proof.get("uid") or ""
        ) != str(user.id)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Phone verification "
                "mismatch"
            ),
        )

    try:
        verified_phone = normalize_e164(
            str(
                proof.get("phone")
                or ""
            )
        )

        normalized_phone = normalize_e164(
            new_phone
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid phone number"
            ),
        )

    if verified_phone != normalized_phone:
        raise HTTPException(
            status_code=400,
            detail=(
                "Verified phone mismatch"
            ),
        )

    existing = await get_user_by_phone(
        db,
        normalized_phone,
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

    return normalized_phone


async def create_phone_audit_log(
    db: AsyncSession,
    request: Request,
    user: User,
    old_phone: str,
    new_phone: str,
) -> None:
    client_ip = (
        request.client.host
        if request.client
        else "unknown"
    )

    audit = PhoneAuditLog(
        id=new_id(),
        user_id=user.id,
        action="changed",
        old_phone=old_phone,
        new_phone=new_phone,
        ip_address=client_ip,
    )

    db.add(audit)

    logger.info(
        (
            "Phone changed "
            "user_id=%s old=%s "
            "new=%s ip=%s"
        ),
        user.id,
        old_phone,
        new_phone,
        client_ip,
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
    return UserOut.model_validate(
        user
    )


# ─────────────────────────────────────────────────────────────
# Update Profile
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/me",
    response_model=UserOut,
)
async def update_profile(
    payload: ProfileUpdate,
    request: Request,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> UserOut:
    updates = payload.model_dump(
        exclude_unset=True
    )

    email_token = updates.pop(
        "email_verification_token",
        None,
    )

    phone_token = updates.pop(
        "phone_verification_token",
        None,
    )

    current_password = updates.pop(
        "current_password",
        None,
    )

    # ─────────────────────────────────────────
    # Name
    # ─────────────────────────────────────────

    if "name" in updates:
        user.name = updates["name"]

    # ─────────────────────────────────────────
    # Email
    # ─────────────────────────────────────────

    if "email" in updates:
        new_email = updates["email"]

        if new_email is None:
            user.email = None
            user.email_verified = False

        elif (
            new_email.lower()
            != (user.email or "").lower()
        ):
            validated_email = (
                await validate_email_change(
                    db=db,
                    user=user,
                    new_email=new_email,
                    email_token=email_token,
                    current_password=current_password,
                )
            )

            user.email = validated_email
            user.email_verified = True

            await create_notification(
                db=db,
                user_id=user.id,
                title="Email Updated",
                message="Your email address has been updated successfully.",
            )

        elif (
            email_token
            and not user.email_verified
        ):
            try:
                proof = (
                    decode_otp_proof_token(
                        email_token
                    )
                )

            except JWTError as exc:
                raise HTTPException(
                    status_code=401,
                    detail=(
                        "Invalid email "
                        "verification token"
                    ),
                ) from exc

            if (
                proof.get("vtype")
                != "email_profile"
                or str(
                    proof.get("uid")
                    or ""
                ) != str(user.id)
                or str(
                    proof.get("email")
                    or ""
                ).lower()
                != new_email.lower()
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Email verification "
                        "mismatch"
                    ),
                )

            user.email_verified = True

    # ─────────────────────────────────────────
    # Phone
    # ─────────────────────────────────────────

    if "phone" in updates:
        new_phone = updates["phone"]

        if (
            new_phone
            and new_phone != user.phone
        ):
            validated_phone = (
                await validate_phone_change(
                    db=db,
                    user=user,
                    new_phone=new_phone,
                    phone_token=phone_token,
                    current_password=current_password,
                )
            )

            old_phone = user.phone

            user.phone = validated_phone
            user.phone_verified = True

            await create_phone_audit_log(
                db=db,
                request=request,
                user=user,
                old_phone=old_phone,
                new_phone=validated_phone,
            )

            await create_notification(
                db=db,
                user_id=user.id,
                title="Phone Number Updated",
                message="Your phone number has been updated successfully.",
            )

    await db.commit()
    await db.refresh(user)

    return UserOut.model_validate(
        user
    )


# ─────────────────────────────────────────────────────────────
# Update Password
# ─────────────────────────────────────────────────────────────

@router.patch("/me/password")
async def update_password(
    payload: PasswordUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> dict:
    if not verify_password(
        payload.current_password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Current password "
                "is incorrect"
            ),
        )

    if (
        payload.current_password
        == payload.new_password
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "New password must "
                "be different"
            ),
        )

    user.password_hash = hash_password(
        payload.new_password
    )

    await create_notification(
        db=db,
        user_id=user.id,
        title="Password Changed",
        message="Your account password was changed successfully.",
    )

    await db.commit()

    return {
        "message": (
            "Password updated"
        )
    }


# ─────────────────────────────────────────────────────────────
# Get User By ID
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{user_id}",
    response_model=UserOut,
)
async def get_user(
    user_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(
            require_roles("admin")
        ),
    ],
) -> UserOut:
    user = await get_user_or_404(
        db,
        user_id,
    )

    return UserOut.model_validate(
        user
    )