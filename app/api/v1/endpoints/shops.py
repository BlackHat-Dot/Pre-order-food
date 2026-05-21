from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Integer, cast, func, select, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

# REMOVED basic_rate_limit to bypass Redis!
from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.menu import MenuItem, MenuItemVariant  # 🚀 Added variant model import
from app.models.order import Order, OrderItem
from app.models.shop import Shop
from app.models.user import User
from app.schemas.shop import ShopCreate, ShopOut, ShopStatusUpdate, ShopUpdate
from app.services.cache import cache_delete, cache_get_json, cache_set_json
from app.utils.ids import new_id

# FIXED: Removed the Redis basic_rate_limit dependency
router = APIRouter(prefix="/shops", tags=["Shops"])


def _hour_bucket_expr(db: AsyncSession, column):
    dialect = db.bind.dialect.name if db.bind is not None else ""
    if dialect == "sqlite":
        return cast(func.strftime("%H", column), Integer)
    return cast(func.extract("hour", column), Integer)


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
        image_url=payload.image_url,
        loyalty_discount_per_point=payload.loyalty_discount_per_point or 0.1,
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

    # Public listing should only expose active and verified shops.
    stmt = select(Shop).where(Shop.is_active.is_(True), Shop.is_verified.is_(True))
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


# FIXED: Proper SQLAlchemy PostgreSQL Aggregation for Dashboard
@router.get("/{shop_id}/dashboard")
async def get_shop_dashboard(shop_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Use SQLAlchemy to aggregate metrics for the shop
    stmt = select(
        func.count(Order.id).label("total_orders"),
        func.sum(case((Order.status == "completed", Order.total_price), else_=0)).label("total_revenue"),
        func.sum(case((Order.status.in_(["pending", "accepted", "preparing"]), 1), else_=0)).label("pending_orders"),
        func.sum(case((Order.status == "completed", 1), else_=0)).label("completed_orders"),
        func.sum(case((Order.created_at >= today, 1), else_=0)).label("today_orders")
    ).where(Order.shop_id == shop_id)

    result = await db.execute(stmt)
    row = result.first()

    if not row:
        return {
            "total_orders": 0, 
            "total_revenue": 0, 
            "pending_orders": 0, 
            "completed_orders": 0, 
            "today_orders": 0
        }

    return {
        "total_orders": int(row.total_orders or 0),
        "total_revenue": float(row.total_revenue or 0.0),
        "pending_orders": int(row.pending_orders or 0),
        "completed_orders": int(row.completed_orders or 0),
        "today_orders": int(row.today_orders or 0)
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


# ─── 🚀 ADDED: SHOP OWNER INCOMING ORDERS TAB FEED ENDPOINT ──────────────────

@router.get("/{shop_id}/orders")
async def list_shop_orders_owner(
    shop_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: str | None = Query(default=None),
) -> list[dict]:
    # 1. Verify shop access rights
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop profile not isolated")
    if current_user.role != "admin" and shop.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access context")

    # 2. Extract paginated distinct parent order keys to keep relationship arrays intact
    id_stmt = select(Order.id).where(Order.shop_id == shop_id)
    if status and status != "all":
        id_stmt = id_stmt.where(Order.status == status)
    id_stmt = id_stmt.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    
    order_ids = (await db.execute(id_stmt)).scalars().all()
    if not order_ids:
        return []

    # 3. Pull parent datasets together with nested items records safely
    stmt = (
        select(Order)
        .options(joinedload(Order.items))
        .where(Order.id.in_(order_ids))
        .order_by(Order.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().unique().all()

    result = []
    for o in rows:
        result.append({
            "id": o.id,
            "status": o.status,
            "total_price": float(o.total_price),
            "payment_method": o.payment_method,
            "payment_status": o.payment_status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items": [
                {
                    "id": item.id,
                    "menu_item_name": getattr(item, "item_name_snapshot", None) or getattr(item, "name", "Item"),
                    "variant_name": getattr(item, "variant_name_snapshot", None),
                    "quantity": int(item.quantity),
                    "unit_price": float(getattr(item, "unit_price", 0) or getattr(item, "price", 0))
                }
                for item in o.items
            ]
        })
    return result


# ─── 🚀 FIXED: ITEM AVAILABILITY STRIP MUTATION TOGGLES (NO DELETE) ──────────

@router.patch("/{shop_id}/items/{item_id}/availability")
async def toggle_item_availability(
    shop_id: str,
    item_id: str,
    is_available: bool,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    shop = await db.get(Shop, shop_id)
    if not shop or (current_user.role != "admin" and shop.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized update scope")

    item = await db.get(MenuItem, item_id)
    if not item or item.shop_id != shop_id:
        raise HTTPException(status_code=404, detail="Target menu line item not found")

    # 🚀 FIXED: Marks flag state natively rather than issuing an irreversible deletion command
    item.is_available = is_available
    await db.commit()
    return {"updated": True, "item_id": item.id, "is_available": item.is_available}


@router.patch("/{shop_id}/variants/{variant_id}/availability")
async def toggle_variant_availability(
    shop_id: str,
    variant_id: str,
    is_available: bool,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    # 1. Verify credentials scope
    shop = await db.get(Shop, shop_id)
    if not shop or (current_user.role != "admin" and shop.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized update scope")

    # 2. Extract requested sub-variant option line
    variant = await db.get(MenuItemVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Target menu option configuration not found")

    # 🚀 FIXED: Allow options/add-on flags to be updated natively without execution drops
    variant.is_available = is_available
    await db.commit()
    return {"updated": True, "variant_id": variant.id, "is_available": variant.is_available}