from __future__ import annotations

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy import (
    Integer,
    case,
    cast,
    func,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    require_roles,
)
from app.db.session import get_db
from app.models.order import Order
from app.models.shop import Shop
from app.api.v1.endpoints.orders import restore_coupon, create_notification
from app.models.user import User
from app.schemas.order import (
    OrderStatusUpdate,
)
from app.services.cache import (
    cache_delete,
    cache_get_json,
    cache_set_json,
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)

VALID_ROLES = {
    "customer",
    "shop_owner",
    "admin",
}


# ─────────────────────────────────────────────────────────────
# Cache Helpers
# ─────────────────────────────────────────────────────────────

async def clear_admin_analytics_cache(
) -> None:
    await cache_delete(
        "admin:analytics:*",
    )


# ─────────────────────────────────────────────────────────────
# Date Helpers
# ─────────────────────────────────────────────────────────────

def day_bucket_expr(
    db: AsyncSession,
    column,
):
    dialect = (
        db.bind.dialect.name
        if db.bind is not None
        else ""
    )

    if dialect in {"postgresql", "sqlite"}:
        return func.date(column)

    return func.date(column)


# ─────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    stmt = select(User).order_by(
        User.created_at.desc()
    )

    users = (
        await db.execute(stmt)
    ).scalars().all()

    return users


@router.patch("/users/{user_id}/active")
async def set_user_active(
    user_id: str,
    is_active: bool,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    user = await db.get(
        User,
        user_id,
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user.is_active = is_active
    await db.commit()
    await clear_admin_analytics_cache()

    return {
        "updated": True,
        "user_id": user.id,
        "is_active": (
            user.is_active
        ),
    }


@router.patch("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    role: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid role",
        )

    user = await db.get(
        User,
        user_id,
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user.role = role
    await db.commit()
    await clear_admin_analytics_cache()

    return {
        "updated": True,
        "user_id": user.id,
        "role": user.role,
    }


# ─────────────────────────────────────────────────────────────
# Shops
# ─────────────────────────────────────────────────────────────

@router.get("/shops")
async def admin_list_shops(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    stmt = select(Shop).order_by(
        Shop.created_at.desc()
    )

    shops = (
        await db.execute(stmt)
    ).scalars().all()

    return shops


@router.patch("/shops/{shop_id}/verify")
async def verify_shop(
    shop_id: str,
    verified: bool,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    shop = await db.get(
        Shop,
        shop_id,
    )

    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found",
        )

    shop.is_verified = verified

    if shop.owner_id:
        title = "Shop Verified" if verified else "Verification Removed"
        message = (
            f"Your shop '{shop.name}' has been successfully verified by an administrator."
            if verified
            else f"Verification for your shop '{shop.name}' has been removed by an administrator."
        )
        await create_notification(
            db=db,
            user_id=shop.owner_id,
            title=title,
            message=message,
        )

    await db.commit()
    await clear_admin_analytics_cache()

    return {
        "updated": True,
        "shop_id": shop.id,
        "is_verified": (
            shop.is_verified
        ),
    }


@router.patch("/shops/{shop_id}/active")
async def set_shop_active(
    shop_id: str,
    is_active: bool,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    shop = await db.get(
        Shop,
        shop_id,
    )

    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found",
        )

    shop.is_active = is_active

    if shop.owner_id:
        title = "Shop Activated" if is_active else "Shop Deactivated"
        message = (
            f"Your shop '{shop.name}' has been activated by an administrator."
            if is_active
            else f"Your shop '{shop.name}' has been deactivated by an administrator."
        )
        await create_notification(
            db=db,
            user_id=shop.owner_id,
            title=title,
            message=message,
        )

    await db.commit()
    await clear_admin_analytics_cache()

    return {
        "updated": True,
        "shop_id": shop.id,
        "is_active": (
            shop.is_active
        ),
    }


# ─────────────────────────────────────────────────────────────
# Orders
# ─────────────────────────────────────────────────────────────

@router.get("/orders")
async def admin_list_orders(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    stmt = (
        select(Order)
        .order_by(
            Order.created_at.desc()
        )
    )

    orders = (
        await db.execute(stmt)
    ).scalars().all()

    return orders


@router.patch(
    "/orders/{order_id}/status"
)
async def update_order_status_admin(
    order_id: str,
    payload: OrderStatusUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    order = await db.get(
        Order,
        order_id,
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    old_status = order.status
    order.status = payload.status

    if order.status != old_status and order.customer_id:
        title_map = {
            "accepted": "Order Accepted",
            "preparing": "Order Preparing",
            "ready": "Order Ready",
            "completed": "Order Completed",
            "cancelled": "Order Cancelled",
        }
        message_map = {
            "accepted": "Your order has been accepted.",
            "preparing": "Your order is being prepared.",
            "ready": "Your order is ready for pickup.",
            "completed": "Your order has been completed.",
            "cancelled": "Your order has been cancelled by an administrator.",
        }
        
        title = title_map.get(order.status, "Order Update")
        message = message_map.get(order.status, f"Your order status has been updated to {order.status}.")
        
        await create_notification(
            db=db,
            user_id=order.customer_id,
            title=title,
            message=message,
        )

    await db.commit()
    await clear_admin_analytics_cache()
    await db.refresh(order)

    return order


@router.post("/orders/{order_id}/override")
async def admin_global_status_override(
    order_id: str,
    payload: OrderStatusUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
):
    order = await db.get(
        Order,
        order_id,
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if (
        order.status == "completed"
        and payload.status == "cancelled"
    ):
        raise HTTPException(
            status_code=400,
            detail="Completed orders cannot be cancelled",
        )

    if (
        order.status != "cancelled"
        and payload.status == "cancelled"
    ):
        await restore_coupon(
            db,
            order,
        )

    old_status = order.status
    order.status = payload.status

    if order.status != old_status and order.customer_id:
        title_map = {
            "accepted": "Order Accepted",
            "preparing": "Order Preparing",
            "ready": "Order Ready",
            "completed": "Order Completed",
            "cancelled": "Order Cancelled",
        }
        message_map = {
            "accepted": "Your order context has been updated to accepted via administrative override.",
            "preparing": "Your order is being prepared following an administrative override.",
            "ready": "Your order is ready for pickup following an administrative override.",
            "completed": "Your order has been marked completed via administrative override.",
            "cancelled": "Your order has been unconditionally cancelled via administrative override.",
        }

        title = title_map.get(order.status, "Administrative Override")
        message = message_map.get(order.status, f"An administrative override updated your order status to {order.status}.")

        await create_notification(
            db=db,
            user_id=order.customer_id,
            title=title,
            message=message,
        )

    await db.commit()
    await clear_admin_analytics_cache()
    await db.refresh(order)

    return {
        "updated": True,
        "order_id": order.id,
        "status": order.status,
    }


# ─────────────────────────────────────────────────────────────
# Analytics Overview
# ─────────────────────────────────────────────────────────────

@router.get(
    "/analytics/overview"
)
async def analytics_overview(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
) -> dict:

    cache_key = (
        "admin:analytics:overview"
    )

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return cached

    now = datetime.now(
        timezone.utc
    )

    month_start = now.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    today_start = now.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    week_start = (
        now
        - timedelta(
            days=now.weekday()
        )
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    users = (
        await db.execute(
            select(
                func.count(User.id)
            )
        )
    ).scalar_one()

    active_users = (
        await db.execute(
            select(
                func.count(User.id)
            ).where(
                User.is_active.is_(
                    True
                )
            )
        )
    ).scalar_one()

    shops = (
        await db.execute(
            select(
                func.count(Shop.id)
            )
        )
    ).scalar_one()

    verified_shops = (
        await db.execute(
            select(
                func.count(Shop.id)
            ).where(
                Shop.is_verified.is_(
                    True
                )
            )
        )
    ).scalar_one()

    orders = (
        await db.execute(
            select(
                func.count(Order.id)
            )
        )
    ).scalar_one()

    today_orders = (
        await db.execute(
            select(
                func.count(Order.id)
            ).where(
                Order.created_at
                >= today_start
            )
        )
    ).scalar_one()

    month_revenue = (
        await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        Order.total_price
                    ),
                    0.0,
                )
            ).where(
                Order.created_at
                >= month_start,
                Order.status == "completed",
                Order.payment_status == "paid"
            )
        )
    ).scalar_one()

    today_revenue = (
        await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        Order.total_price
                    ),
                    0.0,
                )
            ).where(
                Order.created_at
                >= today_start,
                Order.status == "completed",
                Order.payment_status == "paid"
            )
        )
    ).scalar_one()

    week_revenue = (
        await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        Order.total_price
                    ),
                    0.0,
                )
            ).where(
                Order.created_at
                >= week_start,
                Order.status == "completed",
                Order.payment_status == "paid"
            )
        )
    ).scalar_one()

    total_revenue = (
        await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        Order.total_price
                    ),
                    0.0,
                )
            ).where(
                Order.status == "completed",
                Order.payment_status == "paid"
            )
        )
    ).scalar_one()

    cancelled = (
        await db.execute(
            select(
                func.count(Order.id)
            ).where(
                Order.status
                == "cancelled"
            )
        )
    ).scalar_one()

    pending = (
        await db.execute(
            select(
                func.count(Order.id)
            ).where(
                Order.status
                == "pending"
            )
        )
    ).scalar_one()

    result = {
        "users": int(users),
        "active_users": int(
            active_users
        ),
        "shops": int(shops),
        "verified_shops": int(
            verified_shops
        ),
        "orders": int(orders),
        "today_orders": int(
            today_orders
        ),
        "pending_orders": int(
            pending
        ),
        "cancelled_orders": int(
            cancelled
        ),
        "total_revenue": float(
            total_revenue
        ),
        "month_revenue": float(
            month_revenue
        ),
        "week_revenue": float(
            week_revenue
        ),
        "today_revenue": float(
            today_revenue
        ),
    }

    await cache_set_json(
        cache_key,
        result,
        ttl_seconds=60,
    )

    return result


# ─────────────────────────────────────────────────────────────
# Analytics Trends
# ─────────────────────────────────────────────────────────────

@router.get(
    "/analytics/trends"
)
async def analytics_trends(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
    days: int = Query(
        30,
        ge=7,
        le=90,
    ),
) -> dict:

    cache_key = (
        f"admin:analytics:trends:{days}"
    )

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return cached

    since = (
        datetime.now(
            timezone.utc
        )
        - timedelta(days=days)
    )

    order_day = day_bucket_expr(
        db,
        Order.created_at,
    ).label("day")

    user_day = day_bucket_expr(
        db,
        User.created_at,
    ).label("day")

    daily_orders = (
        await db.execute(
            select(
                order_day,
                func.count(
                    Order.id
                ).label(
                    "orders"
                ),
                func.coalesce(
                    func.sum(
                        Order.total_price
                    ),
                    0.0,
                ).label(
                    "revenue"
                ),
            )
            .where(
                Order.created_at
                >= since,
                Order.status == "completed"
            )
            .group_by(order_day)
            .order_by(order_day)
        )
    ).all()

    daily_users = (
    await db.execute(
        select(
            user_day,
            func.count(
                User.id
            ).label(
                "signups"
            ),
        )
        .where(
            User.created_at >= since
        )
        .group_by(user_day)
        .order_by(user_day)
        )
    ).all()

    order_by_status = (
        await db.execute(
            select(
                Order.status,
                func.count(
                    Order.id
                ),
            )
            .where(
                Order.created_at >= since
            )
            .group_by(
                Order.status
            )
        )
    ).all()

    result = {
        "daily_orders": [
            {
                "date": (
                    row.day.strftime(
                        "%Y-%m-%d"
                    )
                    if hasattr(
                        row.day,
                        "strftime",
                    )
                    else str(
                        row.day
                    )[:10]
                ),
                "orders": int(
                    row.orders
                ),
                "revenue": float(
                    row.revenue
                ),
            }
            for row in daily_orders
        ],
        "daily_signups": [
            {
                "date": (
                    row.day.strftime(
                        "%Y-%m-%d"
                    )
                    if hasattr(
                        row.day,
                        "strftime",
                    )
                    else str(
                        row.day
                    )[:10]
                ),
                "signups": int(
                    row.signups
                ),
            }
            for row in daily_users
        ],
        "order_by_status": {
            status: int(count)
            for status, count in order_by_status
        },
    }

    await cache_set_json(
        cache_key,
        result,
        ttl_seconds=120,
    )

    return result


# ─────────────────────────────────────────────────────────────
# Top Shops
# ─────────────────────────────────────────────────────────────

@router.get(
    "/analytics/top-shops"
)
async def top_shops(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
    limit: int = Query(
        10,
        ge=1,
        le=50,
    ),
) -> list[dict]:

    cache_key = (
        f"admin:analytics:top-shops:{limit}"
    )

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return cached

    stmt = (
        select(
            Shop.id,
            Shop.name,
            Shop.category,
            Shop.city,
            Shop.rating_avg,
            Shop.is_verified,
            func.count(
                Order.id
            ).label(
                "order_count"
            ),
            func.coalesce(
                func.sum(
                    Order.total_price
                ),
                0.0,
            ).label(
                "revenue"
            ),
        )
        .join(
            Order,
            Order.shop_id == Shop.id,
        )
        .where(
            Order.status == "completed",
            Order.payment_status == "paid"
        )
        .group_by(Shop.id)
        .order_by(
            func.sum(
                Order.total_price
            ).desc()
        )
        .limit(limit)
    )

    rows = (
        await db.execute(stmt)
    ).all()

    result = [
        {
            "shop_id": row.id,
            "shop_name": row.name,
            "category": row.category,
            "city": row.city,
            "order_count": int(
                row.order_count
            ),
            "revenue": float(
                row.revenue
            ),
            "rating": float(
                row.rating_avg
            ),
            "is_verified": (
                row.is_verified
            ),
        }
        for row in rows
    ]

    await cache_set_json(
        cache_key,
        result,
        ttl_seconds=120,
    )

    return result