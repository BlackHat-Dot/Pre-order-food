from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.shop import Shop


async def get_shop_by_id(db: AsyncSession, shop_id: str) -> Shop | None:
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    return result.scalar_one_or_none()


async def list_shops(db: AsyncSession, offset: int, limit: int, city: str | None, category: str | None, q: str | None) -> list[Shop]:
    stmt = select(Shop).where(Shop.is_active.is_(True), Shop.is_verified.is_(True))
    if city:
        stmt = stmt.where(Shop.city.ilike(f"%{city}%"))
    if category:
        stmt = stmt.where(Shop.category.ilike(f"%{category}%"))
    if q:
        stmt = stmt.where(Shop.name.ilike(f"%{q}%"))
    stmt = stmt.order_by(Shop.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_shop_with_menu(db: AsyncSession, shop_id: str) -> Shop | None:
    stmt = select(Shop).where(Shop.id == shop_id).options(selectinload(Shop.items))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

