from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.utils.phone import normalize_e164


async def get_user_by_phone(db: AsyncSession, phone: str) -> User | None:
    """
    Look up a user by phone number. Handles both old 10-digit format and
    new E.164 format (+919876543210) stored in the database.
    """
    # 1. Exact match first (covers all stored formats)
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user:
        return user

    # 2. Try to normalise and match again (covers format differences)
    try:
        normalised = normalize_e164(phone)
    except ValueError:
        return None

    if normalised == phone:
        # Already tried this exact string above
        return None

    result = await db.execute(select(User).where(User.phone == normalised))
    user = result.scalar_one_or_none()
    if user:
        return user

    # 3. Cross-format compat: if searching E.164 (+91XXXXXXXXXX), also try 10-digit legacy
    if normalised.startswith("+91") and len(normalised) == 13:
        ten_digit = normalised[3:]
        result = await db.execute(select(User).where(User.phone == ten_digit))
        return result.scalar_one_or_none()

    # 4. If searching 10-digit, also try E.164 form
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        e164 = f"+91{digits}"
        result = await db.execute(select(User).where(User.phone == e164))
        return result.scalar_one_or_none()

    return None


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()
