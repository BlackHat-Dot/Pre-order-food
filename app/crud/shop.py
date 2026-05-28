from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)
from sqlalchemy.orm import (
    selectinload,
)

from app.models.shop import Shop


# ─────────────────────────────────────────────────────────────
# Single Shop
# ─────────────────────────────────────────────────────────────

async def get_shop_by_id(
    db: AsyncSession,
    shop_id: str,
) -> Shop | None:

    stmt = (
        select(Shop)
        .where(
            Shop.id == shop_id
        )
    )

    result = await db.execute(
        stmt
    )

    return (
        result.scalar_one_or_none()
    )


# ─────────────────────────────────────────────────────────────
# Shop Listing
# ─────────────────────────────────────────────────────────────

async def list_shops(
    db: AsyncSession,
    offset: int = 0,
    limit: int = 20,
    city: str | None = None,
    category: str | None = None,
    q: str | None = None,
) -> list[Shop]:

    stmt = (
        select(Shop)
        .where(
            Shop.is_active.is_(
                True
            ),
            Shop.is_verified.is_(
                True
            ),
        )
    )

    if city:
        stmt = stmt.where(
            Shop.city.ilike(
                f"%{city.strip()}%"
            )
        )

    if category:
        stmt = stmt.where(
            Shop.category.ilike(
                f"%{category.strip()}%"
            )
        )

    if q:
        query = q.strip()

        stmt = stmt.where(
            Shop.name.ilike(
                f"%{query}%"
            )
        )

    stmt = (
        stmt.order_by(
            Shop.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(
        stmt
    )

    return list(
        result.scalars().all()
    )


# ─────────────────────────────────────────────────────────────
# Shop With Menu
# ─────────────────────────────────────────────────────────────

async def get_shop_with_menu(
    db: AsyncSession,
    shop_id: str,
) -> Shop | None:

    stmt = (
        select(Shop)
        .where(
            Shop.id == shop_id,
            Shop.is_active.is_(
                True
            ),
        )
        .options(
            selectinload(
                Shop.items
            )
        )
    )

    result = await db.execute(
        stmt
    )

    return (
        result.scalar_one_or_none()
    )