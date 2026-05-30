from __future__ import annotations

from datetime import datetime, timezone
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
from sqlalchemy.orm import joinedload

from app.core.deps import (
    get_current_user,
    require_roles,
)
from app.db.session import get_db
from app.models.menu import (
    MenuItem,
    MenuItemVariant,
)
from app.models.order import Order
from app.models.shop import Shop
from app.models.user import User
from app.schemas.shop import (
    ShopCreate,
    ShopOut,
    ShopStatusUpdate,
    ShopUpdate,
)
from app.services.cache import (
    cache_delete,
    cache_get_json,
    cache_set_json,
)
from app.utils.ids import new_id

router = APIRouter(
    prefix="/shops",
    tags=["Shops"],
)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

async def clear_shop_cache(
    shop_id: str | None = None,
) -> None:
    keys = [
        "shops:list:*",
    ]

    if shop_id:
        keys.extend([
            f"shop:{shop_id}",
            f"dashboard:{shop_id}",
            f"stats:{shop_id}",
            f"menu:{shop_id}",
        ])

    await cache_delete(*keys)


async def get_shop_or_404(
    db: AsyncSession,
    shop_id: str,
) -> Shop:
    shop = await db.get(
        Shop,
        shop_id,
    )

    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found",
        )

    return shop


async def verify_shop_access(
    user: User,
    shop: Shop,
) -> None:
    if (
        user.role != "admin"
        and shop.owner_id != user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )


def hour_bucket_expr(
    db: AsyncSession,
    column,
):
    dialect = (
        db.bind.dialect.name
        if db.bind is not None
        else ""
    )

    if dialect == "sqlite":
        return cast(
            func.strftime("%H", column),
            Integer,
        )

    return cast(
        func.extract("hour", column),
        Integer,
    )


# ─────────────────────────────────────────────────────────────
# Create Shop
# ─────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ShopOut,
    status_code=201,
)
async def create_shop(
    payload: ShopCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
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
        image_url=str(payload.image_url)
        if payload.image_url
        else None,
        loyalty_discount_per_point=(
            payload.loyalty_discount_per_point
            or 0.1
        ),
        is_verified=(
            user.role == "admin"
        ),
    )

    db.add(shop)

    await db.commit()
    await db.refresh(shop)

    await clear_shop_cache()

    return ShopOut.model_validate(
        shop
    )


# ─────────────────────────────────────────────────────────────
# List Shops
# ─────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[ShopOut],
)
async def list_shops(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    page: int = Query(1, ge=1),
    page_size: int = Query(
        20,
        ge=1,
        le=100,
    ),
    city: str | None = None,
    category: str | None = None,
    q: str | None = None,
) -> list[ShopOut]:

    cache_key = (
        f"shops:list:"
        f"{page}:{page_size}:"
        f"{city}:{category}:{q}"
    )

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return [
            ShopOut.model_validate(
                shop
            )
            for shop in cached
        ]

    stmt = select(Shop).where(
        Shop.is_active.is_(True),
        Shop.is_verified.is_(True),
    )

    if city:
        stmt = stmt.where(
            Shop.city.ilike(
                f"%{city}%"
            )
        )

    if category:
        stmt = stmt.where(
            Shop.category.ilike(
                f"%{category}%"
            )
        )

    if q:
        stmt = stmt.where(
            Shop.name.ilike(
                f"%{q}%"
            )
        )

    stmt = (
        stmt.order_by(
            Shop.rating_avg.desc(),
            Shop.created_at.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    shops = (
        await db.execute(stmt)
    ).scalars().all()

    serialized = [
        ShopOut.model_validate(
            shop
        ).model_dump(mode="json")
        for shop in shops
    ]

    await cache_set_json(
        cache_key,
        serialized,
        ttl_seconds=120,
    )

    return [
        ShopOut.model_validate(
            shop
        )
        for shop in serialized
    ]


# ─────────────────────────────────────────────────────────────
# Get Shop
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{shop_id}",
    response_model=ShopOut,
)
async def get_shop(
    shop_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> ShopOut:

    cache_key = f"shop:{shop_id}"

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return ShopOut.model_validate(
            cached
        )

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    serialized = (
        ShopOut.model_validate(
            shop
        ).model_dump(mode="json")
    )

    await cache_set_json(
        cache_key,
        serialized,
        ttl_seconds=300,
    )

    return ShopOut.model_validate(
        serialized
    )


# ─────────────────────────────────────────────────────────────
# My Shops
# ─────────────────────────────────────────────────────────────

@router.get(
    "/me/list",
    response_model=list[ShopOut],
)
async def my_shops(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> list[ShopOut]:

    stmt = (
        select(Shop)
        .where(Shop.owner_id == user.id)
        .order_by(
            Shop.created_at.desc()
        )
    )

    shops = (
        await db.execute(stmt)
    ).scalars().all()

    return [
        ShopOut.model_validate(
            shop
        )
        for shop in shops
    ]


# ─────────────────────────────────────────────────────────────
# Update Shop
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/{shop_id}",
    response_model=ShopOut,
)
async def update_shop(
    shop_id: str,
    payload: ShopUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> ShopOut:

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    updates = payload.model_dump(
        exclude_unset=True
    )

    for key, value in updates.items():
        setattr(shop, key, value)

    await db.commit()
    await db.refresh(shop)

    await clear_shop_cache(
        shop_id
    )

    return ShopOut.model_validate(
        shop
    )


# ─────────────────────────────────────────────────────────────
# Update Shop Status
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/{shop_id}/status",
    response_model=ShopOut,
)
async def set_shop_status(
    shop_id: str,
    payload: ShopStatusUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> ShopOut:

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    shop.is_open = payload.is_open
    shop.is_accepting_orders = (
        payload.is_accepting_orders
    )

    await db.commit()
    await db.refresh(shop)

    await clear_shop_cache(
        shop_id
    )

    return ShopOut.model_validate(
        shop
    )


# ─────────────────────────────────────────────────────────────
# Shop Dashboard
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{shop_id}/dashboard",
)
async def get_shop_dashboard(
    shop_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "shop_owner",
                "admin",
            )
        ),
    ],
):

    cache_key = (
        f"dashboard:{shop_id}"
    )

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return cached

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    today = (
        datetime.now(timezone.utc)
        .replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
    )

    stmt = select(
        func.coalesce(
            func.count(Order.id),
            0,
        ).label("total_orders"),

        func.coalesce(
            func.sum(
                case(
                    (
                        Order.status
                        == "completed",
                        Order.total_price,
                    ),
                    else_=0,
                )
            ),
            0.0,
        ).label("total_revenue"),

        func.coalesce(
            func.sum(
                case(
                    (
                        Order.status.in_(
                            [
                                "pending",
                                "accepted",
                                "preparing",
                                "ready",
                            ]
                        ),
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("pending_orders"),

        func.coalesce(
            func.sum(
                case(
                    (
                        Order.status
                        == "completed",
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("completed_orders"),

        func.coalesce(
            func.sum(
                case(
                    (
                        Order.created_at
                        >= today,
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("today_orders"),

    ).where(
        Order.shop_id == shop_id
    )

    row = (
        await db.execute(stmt)
    ).first()

    result = {
        "total_orders": int(
            row.total_orders
        ),
        "total_revenue": round(
            float(row.total_revenue),
            2,
        ),
        "pending_orders": int(
            row.pending_orders
        ),
        "completed_orders": int(
            row.completed_orders
        ),
        "today_orders": int(
            row.today_orders
        ),
    }

    await cache_set_json(
        cache_key,
        result,
        ttl_seconds=60,
    )

    return result


# ─────────────────────────────────────────────────────────────
# Shop Stats
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{shop_id}/stats",
)
async def shop_stats(
    shop_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:

    cache_key = (
        f"stats:{shop_id}"
    )

    cached = await cache_get_json(
        cache_key
    )

    if cached:
        return cached

    total_orders = (
        await db.execute(
            select(
                func.count(Order.id)
            ).where(
                Order.shop_id == shop_id
            )
        )
    ).scalar_one()

    active_items = (
        await db.execute(
            select(
                func.count(MenuItem.id)
            ).where(
                MenuItem.shop_id
                == shop_id,
                MenuItem.is_available.is_(
                    True
                ),
            )
        )
    ).scalar_one()

    result = {
        "shop_id": shop_id,
        "total_orders": int(
            total_orders
        ),
        "active_items": int(
            active_items
        ),
    }

    await cache_set_json(
        cache_key,
        result,
        ttl_seconds=60,
    )

    return result


# ─────────────────────────────────────────────────────────────
# Shop Orders
# ─────────────────────────────────────────────────────────────

@router.get(
    "/orders/shops/{shop_id}",
)
async def list_shop_orders_owner(
    shop_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
    page: int = Query(1, ge=1),
    page_size: int = Query(
        25,
        ge=1,
        le=100,
    ),
    status: str | None = Query(
        default=None,
    ),
) -> list[dict]:

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    id_stmt = select(Order.id).where(
        Order.shop_id == shop_id
    )

    if status and status != "all":
        id_stmt = id_stmt.where(
            Order.status == status
        )

    else:
        active_statuses = [
            "pending",
            "accepted",
            "preparing",
            "ready",
            "completed",
            "cancelled",
            "cancel_requested",
        ]

        id_stmt = id_stmt.where(
            Order.status.in_(
                active_statuses
            )
        )

    id_stmt = (
        id_stmt.order_by(
            Order.created_at.desc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    order_ids = (
        await db.execute(id_stmt)
    ).scalars().all()

    if not order_ids:
        return []

    stmt = (
        select(Order)
        .options(
            joinedload(Order.items)
        )
        .where(
            Order.id.in_(order_ids)
        )
        .order_by(
            Order.created_at.desc()
        )
    )

    orders = (
        await db.execute(stmt)
    ).scalars().unique().all()

    result = []

    for order in orders:

        requests_count = getattr(
            order,
            "cancellation_requests_sent",
            0,
        ) or 0

        is_pending = getattr(
            order,
            "is_cancellation_pending",
            False,
        ) or False

        result.append({
            "id": order.id,
            "status": order.status,
            "total_price": float(
                order.total_price
            ),
            "payment_method": (
                order.payment_method
            ),
            "payment_status": (
                order.payment_status
            ),
            "created_at": (
                order.created_at.isoformat()
                if order.created_at
                else None
            ),
            "cancellation_requests_sent": int(
                requests_count
            ),
            "is_cancellation_pending": bool(
                is_pending
                or order.status
                == "cancel_requested"
            ),
            "cancellation_reason": getattr(
                order,
                "cancellation_reason",
                None,
            ),
            "items": [
                {
                    "id": item.id,
                    "menu_item_name": (
                        getattr(
                            item,
                            "item_name_snapshot",
                            None,
                        )
                        or getattr(
                            item,
                            "name",
                            "Item",
                        )
                    ),
                    "variant_name": getattr(
                        item,
                        "variant_name_snapshot",
                        None,
                    ),
                    "quantity": int(
                        item.quantity
                    ),
                    "unit_price": float(
                        getattr(
                            item,
                            "unit_price",
                            0,
                        )
                        or getattr(
                            item,
                            "price",
                            0,
                        )
                    ),
                }
                for item in order.items
            ],
        })

    return result


# ─────────────────────────────────────────────────────────────
# Toggle Item Availability
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/{shop_id}/items/{item_id}/availability",
)
async def toggle_item_availability(
    shop_id: str,
    item_id: str,
    is_available: bool,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> dict:

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    item = await db.get(
        MenuItem,
        item_id,
    )

    if (
        not item
        or item.shop_id != shop_id
    ):
        raise HTTPException(
            status_code=404,
            detail="Menu item not found",
        )

    item.is_available = is_available

    await db.commit()

    await cache_delete(
        f"menu:{shop_id}",
        f"stats:{shop_id}",
    )

    return {
        "updated": True,
        "item_id": item.id,
        "is_available": (
            item.is_available
        ),
    }


# ─────────────────────────────────────────────────────────────
# Toggle Variant Availability
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/{shop_id}/variants/{variant_id}/availability",
)
async def toggle_variant_availability(
    shop_id: str,
    variant_id: str,
    is_available: bool,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> dict:

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    await verify_shop_access(
        user,
        shop,
    )

    variant = await db.get(
        MenuItemVariant,
        variant_id,
    )

    if not variant:
        raise HTTPException(
            status_code=404,
            detail="Variant not found",
        )

    variant.is_available = is_available

    await db.commit()

    await cache_delete(
        f"menu:{shop_id}",
        f"stats:{shop_id}",
    )

    return {
        "updated": True,
        "variant_id": variant.id,
        "is_available": (
            variant.is_available
        ),
    }