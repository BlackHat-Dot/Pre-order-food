from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.deps import require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.order import Order
from app.models.shop import Shop
from app.models.user import User
from app.schemas.user import UserOut
from app.schemas.order import OrderOut
from app.utils.ids import new_id

router = APIRouter(prefix="/admin", tags=["Admin"])


def _day_bucket_expr(db: AsyncSession, column):
    dialect = db.bind.dialect.name if db.bind is not None else ""
    if dialect == "sqlite":
        return func.date(column)
    return func.date_trunc("day", column)


# ─── Users ───────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: str | None = None,
    search: str | None = None,
) -> list[UserOut]:
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            (User.name.ilike(term)) | (User.email.ilike(term)) | (User.phone.ilike(term))
        )
    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return [UserOut.model_validate(u) for u in rows]


@router.get("/users/count")
async def count_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    total = (await db.execute(select(func.count(User.id)))).scalar_one()
    by_role = (await db.execute(
        select(User.role, func.count(User.id)).group_by(User.role)
    )).all()
    active = (await db.execute(
        select(func.count(User.id)).where(User.is_active.is_(True))
    )).scalar_one()
    return {
        "total": int(total),
        "active": int(active),
        "by_role": {r: int(c) for r, c in by_role},
    }


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> UserOut:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}/active")
async def set_user_active(
    user_id: str,
    is_active: bool,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(400, "Cannot deactivate yourself")
    user.is_active = is_active
    await db.commit()
    return {"updated": True, "user_id": user.id, "is_active": user.is_active}


@router.patch("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    role: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    if role not in ("customer", "shop_owner", "admin"):
        raise HTTPException(400, "Invalid role")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(400, "Cannot change your own role")
    user.role = role
    await db.commit()
    return {"updated": True, "user_id": user.id, "role": user.role}


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user_admin(
    payload: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> UserOut:
    name = payload.get("name", "")
    phone = payload.get("phone", "")
    email = payload.get("email")
    password = payload.get("password", "")
    role = payload.get("role", "customer")
    if role not in ("customer", "shop_owner", "admin"):
        raise HTTPException(400, "Invalid role")
    if not name or not phone or not password:
        raise HTTPException(400, "name, phone and password are required")
    existing_phone = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if existing_phone:
        raise HTTPException(409, "Phone already registered")
    if email:
        existing_email = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing_email:
            raise HTTPException(409, "Email already registered")
    user = User(
        id=new_id(),
        name=name,
        phone=phone,
        email=email,
        role=role,
        password_hash=hash_password(password),
        is_active=True,
        phone_verified=True,
        email_verified=bool(email),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


# ─── Shops ────────────────────────────────────────────────────────────────────

@router.get("/shops")
async def list_shops_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    verified: bool | None = None,
    active: bool | None = None,
) -> list[dict]:
    stmt = select(Shop).options(joinedload(Shop.owner))
    if search:
        term = f"%{search}%"
        stmt = stmt.where((Shop.name.ilike(term)) | (Shop.city.ilike(term)) | (Shop.category.ilike(term)))
    if verified is not None:
        stmt = stmt.where(Shop.is_verified.is_(verified))
    if active is not None:
        stmt = stmt.where(Shop.is_active.is_(active))
    stmt = stmt.order_by(Shop.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    result = []
    for s in rows:
        owner = s.owner
        result.append({
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "city": s.city,
            "state": s.state,
            "phone": s.phone,
            "is_verified": s.is_verified,
            "is_active": s.is_active,
            "is_open": s.is_open,
            "is_accepting_orders": s.is_accepting_orders,
            "rating_avg": float(s.rating_avg),
            "rating_count": int(s.rating_count),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "owner_name": owner.name if owner else "Unknown",
            "owner_email": owner.email if owner else None,
            "owner_id": s.owner_id,
        })
    return result


@router.get("/shops/count")
async def count_shops(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    total = (await db.execute(select(func.count(Shop.id)))).scalar_one()
    verified = (await db.execute(select(func.count(Shop.id)).where(Shop.is_verified.is_(True)))).scalar_one()
    active = (await db.execute(select(func.count(Shop.id)).where(Shop.is_active.is_(True)))).scalar_one()
    open_now = (await db.execute(select(func.count(Shop.id)).where(Shop.is_open.is_(True)))).scalar_one()
    return {
        "total": int(total),
        "verified": int(verified),
        "active": int(active),
        "open_now": int(open_now),
    }


@router.patch("/shops/{shop_id}/verify")
async def verify_shop(
    shop_id: str,
    verified: bool,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    shop.is_verified = verified
    await db.commit()
    return {"updated": True, "shop_id": shop.id, "is_verified": shop.is_verified}


@router.patch("/shops/{shop_id}/active")
async def set_shop_active(
    shop_id: str,
    is_active: bool,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    shop.is_active = is_active
    await db.commit()
    return {"updated": True, "shop_id": shop.id, "is_active": shop.is_active}


# ─── Orders ───────────────────────────────────────────────────────────────────

@router.get("/orders")
async def list_orders_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[dict]:
    # 1. Fetch distinct parent IDs for clean pagination segments
    id_stmt = select(Order.id)
    if status_filter:
        id_stmt = id_stmt.where(Order.status == status_filter)
    id_stmt = id_stmt.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    
    order_ids = (await db.execute(id_stmt)).scalars().all()
    
    if not order_ids:
        return []

    # 2. Gather parent metrics along with relationships
    stmt = (
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.shop),
            selectinload(Order.items)
        )
        .where(Order.id.in_(order_ids))
        .order_by(Order.created_at.desc())
    )
    
    rows = (await db.execute(stmt)).scalars().unique().all()
    
    result = []
    for o in rows:
        result.append({
            "id": o.id,
            "customer_id": o.customer_id,
            "customer_name": o.customer.name if o.customer else "Unknown Customer",
            "customer_phone": o.customer.phone if o.customer else "No Number Linked",
            "shop_id": o.shop_id,
            "shop_name": o.shop.name if o.shop else "Unknown Store Front",
            "status": o.status,
            "total_price": float(o.total_price),
            "payment_method": o.payment_method,
            "payment_status": o.payment_status,
            "order_type": getattr(o, "order_type", "delivery"),
            "delivery_address": getattr(o, "delivery_address_id", None),
            "loyalty_points_used": int(getattr(o, "loyalty_points_used", 0) or 0),
            "discount_percentage": float(getattr(o, "discount_percentage", 0.0) or 0.0),
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items": [
                {
                    "id": item.id,
                    "menu_item_id": getattr(item, "menu_item_id", None) or getattr(item, "item_id", None),
                    "menu_item_name": getattr(item, "item_name_snapshot", None) or getattr(item, "name", "Unknown Item"),
                    "variant_name": getattr(item, "variant_name_snapshot", None),
                    "quantity": int(item.quantity),
                    "unit_price": float(getattr(item, "unit_price", 0.0))
                }
                for item in o.items
            ]
        })
    return result


# ─── Analytics ────────────────────────────────────────────────────────────────

@router.get("/analytics/overview")
async def analytics_overview(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> dict:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    users = (await db.execute(select(func.count(User.id)))).scalar_one()
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active.is_(True)))).scalar_one()
    shops = (await db.execute(select(func.count(Shop.id)))).scalar_one()
    verified_shops = (await db.execute(select(func.count(Shop.id)).where(Shop.is_verified.is_(True)))).scalar_one()
    orders = (await db.execute(select(func.count(Order.id)))).scalar_one()
    today_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )).scalar_one()

    month_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total_price), 0.0)).where(
            Order.created_at >= month_start, Order.payment_status == "paid"
        )
    )).scalar_one()

    today_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total_price), 0.0)).where(
            Order.created_at >= today_start, Order.payment_status == "paid"
        )
    )).scalar_one()

    week_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total_price), 0.0)).where(
            Order.created_at >= week_start, Order.payment_status == "paid"
        )
    )).scalar_one()

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total_price), 0.0)).where(Order.payment_status == "paid")
    )).scalar_one()

    cancelled = (await db.execute(
        select(func.count(Order.id)).where(Order.status == "cancelled")
    )).scalar_one()

    pending = (await db.execute(
        select(func.count(Order.id)).where(Order.status == "pending")
    )).scalar_one()

    return {
        "users": int(users),
        "active_users": int(active_users),
        "shops": int(shops),
        "verified_shops": int(verified_shops),
        "orders": int(orders),
        "today_orders": int(today_orders),
        "pending_orders": int(pending),
        "cancelled_orders": int(cancelled),
        "total_revenue": float(total_revenue),
        "month_revenue": float(month_revenue),
        "week_revenue": float(week_revenue),
        "today_revenue": float(today_revenue),
    }


@router.get("/analytics/trends")
async def analytics_trends(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    days: int = Query(30, ge=7, le=90),
) -> dict:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    order_day = _day_bucket_expr(db, Order.created_at).label("day")
    user_day = _day_bucket_expr(db, User.created_at).label("day")

    daily_orders = (
        await db.execute(
            select(
                order_day,
                func.count(Order.id).label("orders"),
                func.coalesce(func.sum(Order.total_price), 0.0).label("revenue"),
            )
            .where(Order.created_at >= since)
            .group_by(order_day)
            .order_by(order_day)
        )
    ).all()

    daily_users = (
        await db.execute(
            select(
                user_day,
                func.count(User.id).label("signups"),
            )
            .where(User.created_at >= since)
            .group_by(user_day)
            .order_by(user_day)
        )
    ).all()

    order_by_status = (await db.execute(
        select(Order.status, func.count(Order.id))
        .where(Order.created_at >= since)
        .group_by(Order.status)
    )).all()

    return {
        "daily_orders": [
            {
                "date": row.day.strftime("%Y-%m-%d") if hasattr(row.day, "strftime") else str(row.day)[:10],
                "orders": int(row.orders),
                "revenue": float(row.revenue),
            }
            for row in daily_orders
        ],
        "daily_signups": [
            {
                "date": row.day.strftime("%Y-%m-%d") if hasattr(row.day, "strftime") else str(row.day)[:10],
                "signups": int(row.signups),
            }
            for row in daily_users
        ],
        "order_by_status": {status: int(count) for status, count in order_by_status},
    }


@router.get("/analytics/top-shops")
async def top_shops(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    limit: int = Query(10, ge=1, le=50),
) -> list[dict]:
    rows = (await db.execute(
        select(
            Order.shop_id,
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_price), 0.0).label("revenue"),
        )
        .where(Order.payment_status == "paid")
        .group_by(Order.shop_id)
        .order_by(func.sum(Order.total_price).desc())
        .limit(limit)
    )).all()

    result = []
    for row in rows:
        shop = await db.get(Shop, row.shop_id)
        result.append({
            "shop_id": row.shop_id,
            "shop_name": shop.name if shop else "Unknown",
            "category": shop.category if shop else "—",
            "city": shop.city if shop else "—",
            "order_count": int(row.order_count),
            "revenue": float(row.revenue),
            "rating": float(shop.rating_avg) if shop else 0.0,
            "is_verified": shop.is_verified if shop else False,
        })
    return result


@router.get("/analytics/recent-orders")
async def recent_orders_analytics(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
    limit: int = Query(10, ge=1, le=50),
) -> list[dict]:
    rows = (await db.execute(
        select(Order).order_by(Order.created_at.desc()).limit(limit)
    )).scalars().all()
    result = []
    for o in rows:
        customer = await db.get(User, o.customer_id)
        shop = await db.get(Shop, o.shop_id)
        result.append({
            "id": o.id,
            "customer_name": customer.name if customer else "Unknown",
            "shop_name": shop.name if shop else "Unknown",
            "status": o.status,
            "total": float(o.total_price),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return result


@router.get("/analytics/revenue-by-category")
async def revenue_by_category(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> list[dict]:
    rows = (await db.execute(
        select(
            Shop.category,
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.total_price), 0.0).label("revenue"),
        )
        .join(Order, Order.shop_id == Shop.id)
        .where(Order.payment_status == "paid")
        .group_by(Shop.category)
        .order_by(func.sum(Order.total_price).desc())
    )).all()
    return [
        {"category": r.category, "orders": int(r.orders), "revenue": float(r.revenue)}
        for r in rows
    ]


@router.put("/orders/{order_id}/status")
async def update_order_status_admin(
    _: Annotated[User, Depends(require_roles("admin"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    order_id: str,
    status: str = Query(...),
) -> dict:
    from app.models.notification import Notification
    from app.api.v1.endpoints.notification import prune_old_notifications_stack

    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order record not found")
        
    order.status = status
    
    new_notif = Notification(
        id=new_id(),
        user_id=order.customer_id,
        title="Order Status Update",  
        message=f"Your order status has been updated to '{status}'.",
        type="order_update",          
        is_read=False
    )
    db.add(new_notif)
    
    await db.flush()
    await prune_old_notifications_stack(db, order.customer_id)
    await db.commit()
    await db.refresh(order)
    
    return {"updated": True, "order_id": order.id, "new_status": order.status}


class AdminStatusOverride(BaseModel):
    status: str


@router.get("/orders/escalated", response_model=List[OrderOut])
async def get_admin_escalated_orders(db: Annotated[AsyncSession, Depends(get_db)]):
    stmt = select(Order).filter(
        or_(
            Order.status == "cancel_requested",
            Order.cancellation_reason.is_not(None)
        ),
        Order.status != "cancelled"
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/orders/{order_id}/override")
async def admin_global_status_override(
    order_id: str, 
    payload: AdminStatusOverride, 
    db: Annotated[AsyncSession, Depends(get_db)]
):
    stmt = select(Order).filter(Order.id == order_id)
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order record not found.")
        
    if payload.status == "cancelled":
        order.status = "cancelled"
        order.payment_status = "refunded"
    elif payload.status == "accepted":
        order.status = "accepted"
        order.cancellation_reason = None 
        
    await db.commit()
    return {"message": "Global admin modification sequence executed successfully.", "status": order.status}