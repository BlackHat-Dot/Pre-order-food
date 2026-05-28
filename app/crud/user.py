from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.user import User
from app.utils.phone import (
    normalize_e164,
)


# ─────────────────────────────────────────────────────────────
# Phone Helpers
# ─────────────────────────────────────────────────────────────

def extract_digits(
    value: str,
) -> str:

    return "".join(
        ch
        for ch in value
        if ch.isdigit()
    )


# ─────────────────────────────────────────────────────────────
# User By Phone
# ─────────────────────────────────────────────────────────────

async def get_user_by_phone(
    db: AsyncSession,
    phone: str,
) -> User | None:

    try:
        normalized = (
            normalize_e164(phone)
        )

    except ValueError:
        return None

    variants = {
        phone.strip(),
        normalized,
    }

    digits = extract_digits(
        normalized
    )

    if (
        normalized.startswith("+91")
        and len(digits) == 12
    ):
        variants.add(
            digits[-10:]
        )

    stmt = select(User).where(
        or_(
            *[
                User.phone == value
                for value in variants
            ]
        )
    )

    result = await db.execute(
        stmt
    )

    return (
        result.scalar_one_or_none()
    )


# ─────────────────────────────────────────────────────────────
# User By ID
# ─────────────────────────────────────────────────────────────

async def get_user_by_id(
    db: AsyncSession,
    user_id: str,
) -> User | None:

    stmt = select(User).where(
        User.id == user_id
    )

    result = await db.execute(
        stmt
    )

    return (
        result.scalar_one_or_none()
    )


# ─────────────────────────────────────────────────────────────
# User By Email
# ─────────────────────────────────────────────────────────────

async def get_user_by_email(
    db: AsyncSession,
    email: str,
) -> User | None:

    stmt = select(User).where(
        User.email == email
    )

    result = await db.execute(
        stmt
    )

    return (
        result.scalar_one_or_none()
    )