from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import basic_rate_limit, get_current_user, require_roles
from app.db.session import get_db
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem
from app.models.shop import Shop
from app.models.user import User
from app.schemas.shop import ShopCreate, ShopOut, ShopStatusUpdate, ShopUpdate
from app.services.cache import cache_delete, cache_get_json, cache_set_json
from app.utils.ids import new_id


router = APIRouter(prefix="/shops", tags=["Shops"], dependencies=[Depends(basic_rate_limit)])


@router.post("", response_model=ShopOut, status_code=201)
async def create_shop(
    payload: ShopCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> ShopOut:
    shop = Shop(
        id=new_id(),
        owner_id=user.id,
        name=payload.name,
        phone=payload.phone,
        description=payload.description,
        address_line=payload.address_line,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        category=payload.category,
        opening_hours=payload.opening_hours,
        is_verified=(user.role == "admin"),
    )
    db.add(shop)
    await db.commit()
    await db.refresh(shop)
    await cache_delete("shops:list:*")
    return ShopOut.model_validate(shop)


@router.get("", response_model=list[ShopOut])
async def list_shops(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    city: str | None = None,
    category: str | None = None,
    q: str | None = None,
) -> list[ShopOut]:
    key = f"shops:list:{page}:{page_size}:{city}:{category}:{q}"
    cached = await cache_get_json(key)
    if cached:
        return [ShopOut.model_validate(row) for row in cached]

    stmt = select(Shop).where(Shop.is_active.is_(True))
    if city:
        stmt = stmt.where(Shop.city.ilike(f"%{city}%"))
    if category:
        stmt = stmt.where(Shop.category.ilike(f"%{category}%"))
    if q:
        stmt = stmt.where(Shop.name.ilike(f"%{q}%"))
    stmt = stmt.order_by(Shop.rating_avg.desc(), Shop.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    payload = [ShopOut.model_validate(x).model_dump(mode="json") for x in rows]
    await cache_set_json(key, payload, ttl_seconds=120)
    return [ShopOut.model_validate(x) for x in payload]


@router.get("/{shop_id}", response_model=ShopOut)
async def get_shop(shop_id: str, db: Annotated[AsyncSession, Depends(get_db)]) -> ShopOut:
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    return ShopOut.model_validate(shop)


@router.get("/me/list", response_model=list[ShopOut])
async def my_shops(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> list[ShopOut]:
    stmt = select(Shop).where(Shop.owner_id == user.id).order_by(Shop.created_at.desc())
    result = await db.execute(stmt)
    return [ShopOut.model_validate(x) for x in result.scalars().all()]


@router.patch("/{shop_id}", response_model=ShopOut)
async def update_shop(
    shop_id: str,
    payload: ShopUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> ShopOut:
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(shop, k, v)
    await db.commit()
    await db.refresh(shop)
    await cache_delete("shops:list:*")
    return ShopOut.model_validate(shop)


@router.patch("/{shop_id}/status", response_model=ShopOut)
async def set_shop_status(
    shop_id: str,
    payload: ShopStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> ShopOut:
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")
    shop.is_open = payload.is_open
    shop.is_accepting_orders = payload.is_accepting_orders
    await db.commit()
    await db.refresh(shop)
    return ShopOut.model_validate(shop)


@router.get("/{shop_id}/dashboard")
async def dashboard(shop_id: str, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(require_roles("shop_owner", "admin"))]) -> dict:
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")

    now = datetime.utcnow()
    start = datetime(now.year, now.month, now.day)
    end = start + timedelta(days=1)

    rev = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total_price), 0.0)).where(
                Order.shop_id == shop_id,
                Order.created_at >= start,
                Order.created_at < end,
                Order.status != "cancelled",
            )
        )
    ).scalar_one()
    by_status_rows = (
        await db.execute(
            select(Order.status, func.count(Order.id))
            .where(Order.shop_id == shop_id, Order.created_at >= start, Order.created_at < end)
            .group_by(Order.status)
        )
    ).all()

    popular_rows = (
        await db.execute(
            select(OrderItem.item_name_snapshot, func.sum(OrderItem.quantity).label("qty"))
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.shop_id == shop_id, Order.created_at >= start, Order.created_at < end)
            .group_by(OrderItem.item_name_snapshot)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(10)
        )
    ).all()

    peak_rows = (
        await db.execute(
            select(func.extract("hour", Order.created_at).label("h"), func.count(Order.id))
            .where(Order.shop_id == shop_id, Order.created_at >= start, Order.created_at < end)
            .group_by("h")
            .order_by("h")
        )
    ).all()

    return {
        "shop_id": shop_id,
        "today_revenue": float(rev),
        "order_count_by_status": {status: int(count) for status, count in by_status_rows},
        "most_popular_items": [{"name": n, "quantity": int(q)} for n, q in popular_rows],
        "peak_hours": [{"hour": int(h), "order_count": int(c)} for h, c in peak_rows],
    }


@router.get("/{shop_id}/stats")
async def shop_stats(shop_id: str, db: Annotated[AsyncSession, Depends(get_db)]) -> dict:
    total_orders = (
        await db.execute(select(func.count(Order.id)).where(Order.shop_id == shop_id))
    ).scalar_one()
    active_items = (
        await db.execute(select(func.count(MenuItem.id)).where(MenuItem.shop_id == shop_id, MenuItem.is_available.is_(True)))
    ).scalar_one()
    return {"shop_id": shop_id, "total_orders": int(total_orders), "active_items": int(active_items)}

