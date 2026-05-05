from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.order import Order
from app.models.shop import Shop
from app.models.user import User
from app.schemas.user import UserOut


router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: str | None = None,
) -> list[UserOut]:
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return [UserOut.model_validate(u) for u in rows]


@router.patch("/users/{user_id}/active")
async def set_user_active(
    user_id: str,
    is_active: bool,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    user = await db.get(User, user_id)
    if not user:
        return {"updated": False}
    user.is_active = is_active
    await db.commit()
    return {"updated": True, "user_id": user.id, "is_active": user.is_active}


@router.get("/shops")
async def list_shops_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[dict]:
    stmt = select(Shop).order_by(Shop.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return [{"id": s.id, "name": s.name, "is_verified": s.is_verified, "is_active": s.is_active} for s in rows]


@router.patch("/shops/{shop_id}/verify")
async def verify_shop(shop_id: str, verified: bool, db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[User, Depends(require_roles("admin"))]) -> dict:
    shop = await db.get(Shop, shop_id)
    if not shop:
        return {"updated": False}
    shop.is_verified = verified
    await db.commit()
    return {"updated": True, "shop_id": shop.id, "is_verified": shop.is_verified}


@router.patch("/shops/{shop_id}/active")
async def set_shop_active(shop_id: str, is_active: bool, db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[User, Depends(require_roles("admin"))]) -> dict:
    shop = await db.get(Shop, shop_id)
    if not shop:
        return {"updated": False}
    shop.is_active = is_active
    await db.commit()
    return {"updated": True, "shop_id": shop.id, "is_active": shop.is_active}


@router.get("/orders")
async def list_orders_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[dict]:
    stmt = select(Order)
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    stmt = stmt.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return [{"id": o.id, "customer_id": o.customer_id, "shop_id": o.shop_id, "status": o.status, "total_price": o.total_price} for o in rows]


@router.get("/analytics/overview")
async def analytics_overview(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    next_month = month_start + timedelta(days=32)
    next_month = datetime(next_month.year, next_month.month, 1)

    users = (await db.execute(select(func.count(User.id)))).scalar_one()
    shops = (await db.execute(select(func.count(Shop.id)))).scalar_one()
    orders = (await db.execute(select(func.count(Order.id)))).scalar_one()
    revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total_price), 0.0)).where(
                Order.created_at >= month_start, Order.created_at < next_month, Order.status != "cancelled"
            )
        )
    ).scalar_one()
    return {"users": int(users), "shops": int(shops), "orders": int(orders), "month_revenue": float(revenue)}

