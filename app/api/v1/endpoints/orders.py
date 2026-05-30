from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import (
    basic_rate_limit,
    get_current_user,
    require_roles,
)
from app.db.session import get_db
from app.models.coupon import Coupon
from app.models.loyalty import (
    LoyaltyAccount,
    LoyaltyTransaction,
)
from app.models.menu import (
    MenuItem,
    MenuItemVariant,
)
from app.models.order import (
    Order,
    OrderItem,
)
from app.models.shop import Shop
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    OrderOut,
    OrderStatusUpdate,
)
from app.services.cache import (
    acquire_lock,
    release_lock,
)
from app.services.sms import send_sms
from app.utils.ids import new_id

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
    dependencies=[Depends(basic_rate_limit)],
)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

async def create_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    message: str,
    type: str = "order_status"
) -> None:
    """
    Creates and records an in-app notification entry for the specified user.
    Centralized handler allows for future seamless integrations (e.g. push notifications, email logs).
    """
    try:
        from app.models.notification import Notification
        notification = Notification(
            id=new_id(),
            user_id=user_id,
            title=title,
            message=message,
            type="order_status",
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(notification)
        await db.flush()
    except ImportError:
        # Fallback safeguard if model or migration path differs across environments
        pass


async def get_shop_or_404(
    db: AsyncSession,
    shop_id: str,
) -> Shop:
    shop = await db.get(
        Shop,
        shop_id,
    )

    if not shop or not shop.is_active:
        raise HTTPException(
            status_code=404,
            detail="Shop not found",
        )

    return shop


async def get_order_with_relations(
    db: AsyncSession,
    order_id: str,
) -> Order | None:
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.items),
            selectinload(Order.customer),
            selectinload(Order.shop),
        )
    )

    return (
        await db.execute(stmt)
    ).scalar_one_or_none()


async def get_order_or_404(
    db: AsyncSession,
    order_id: str,
) -> Order:
    order = await get_order_with_relations(
        db,
        order_id,
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return order


async def verify_order_access(
    db: AsyncSession,
    user: User,
    order: Order,
) -> None:

    if (
        user.role == "customer"
        and order.customer_id != user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    if user.role == "shop_owner":
        shop = await db.get(
            Shop,
            order.shop_id,
        )

        if (
            not shop
            or shop.owner_id != user.id
        ):
            raise HTTPException(
                status_code=403,
                detail="Forbidden",
            )


async def restore_coupon(
    db: AsyncSession,
    order: Order,
) -> None:

    if not order.coupon_id:
        return

    coupon = await db.get(
        Coupon,
        order.coupon_id,
    )

    if not coupon:
        return

    discount = float(
        order.coupon_discount_applied
        or 0
    )

    if discount > 0:
        coupon.discount_value = round(
            float(coupon.discount_value)
            + discount,
            2,
        )

    coupon.is_redeemed = False

    await release_lock(
        f"coupon:{coupon.id}"
    )


async def unlock_coupon(
    order: Order,
) -> None:

    if not order.coupon_id:
        return

    await release_lock(
        f"coupon:{order.coupon_id}"
    )


# ─────────────────────────────────────────────────────────────
# Create Order
# ─────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=OrderOut,
    status_code=201,
)
async def create_order(
    payload: OrderCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "customer",
                "admin",
            )
        ),
    ],
) -> OrderOut:

    if user.role == "shop_owner":
        raise HTTPException(
            status_code=403,
            detail=(
                "Shop owners cannot "
                "place orders"
            ),
        )

    shop = await get_shop_or_404(
        db,
        payload.shop_id,
    )

    if (
        not shop.is_open
        or not shop.is_accepting_orders
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Shop is not "
                "accepting orders"
            ),
        )

    total_price = 0.0
    prep_times: list[int] = []
    order_items: list[OrderItem] = []

    for entry in payload.items:
        if entry.variant_id:
            variant = await db.get(
                MenuItemVariant,
                entry.variant_id,
            )

            if (
                not variant
                or not variant.is_available
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Variant unavailable"
                    ),
                )

            item = await db.get(
                MenuItem,
                variant.item_id,
            )

            if (
                not item
                or item.shop_id != shop.id
                or not item.is_available
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item unavailable"
                    ),
                )

            price = float(
                variant.price
            )

            total_price += (
                price * entry.quantity
            )

            prep_times.append(
                variant.prep_time_minutes
            )

            order_items.append(
                OrderItem(
                    id=new_id(),
                    order_id="",
                    item_id=item.id,
                    variant_id=variant.id,
                    quantity=entry.quantity,
                    unit_price=price,
                    item_name_snapshot=item.name,
                    variant_name_snapshot=variant.name,
                )
            )

        else:
            if not entry.item_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item ID required"
                    ),
                )

            item = await db.get(
                MenuItem,
                entry.item_id,
            )

            if (
                not item
                or item.shop_id != shop.id
                or not item.is_available
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item unavailable"
                    ),
                )

            price = float(
                item.price
            )

            total_price += (
                price * entry.quantity
            )

            prep_times.append(
                item.prep_time_minutes
            )

            order_items.append(
                OrderItem(
                    id=new_id(),
                    order_id="",
                    item_id=item.id,
                    variant_id=None,
                    quantity=entry.quantity,
                    unit_price=price,
                    item_name_snapshot=item.name,
                    variant_name_snapshot=None,
                )
            )

    loyalty_points = (
        payload.redeem_loyalty_points
        or 0
    )

    loyalty_discount = 0.0

    if loyalty_points > 0:
        loyalty_account_stmt = (
            select(
                LoyaltyAccount
            ).where(
                LoyaltyAccount.customer_id
                == user.id,
                LoyaltyAccount.shop_id
                == shop.id,
            )
        )

        loyalty_account = (
            await db.execute(
                loyalty_account_stmt
            )
        ).scalar_one_or_none()

        if (
            not loyalty_account
            or loyalty_account.points_balance
            < loyalty_points
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Insufficient "
                    "loyalty points"
                ),
            )

        discount_per_point = getattr(
            shop,
            "loyalty_discount_per_point",
            0.1,
        )

        loyalty_discount = round(
            loyalty_points
            * float(
                discount_per_point
            ),
            2,
        )

        loyalty_discount = min(
            loyalty_discount,
            total_price,
        )

        loyalty_account.points_balance -= (
            loyalty_points
        )

        db.add(
            LoyaltyTransaction(
                id=new_id(),
                account_id=(
                    loyalty_account.id
                ),
                points=-loyalty_points,
                action="redeemed",
            )
        )

    coupon_discount = 0.0
    coupon = None
    coupon_lock_key = None

    if payload.coupon_id:
        coupon = await db.get(
            Coupon,
            payload.coupon_id,
        )

        if not coupon:
            raise HTTPException(
                status_code=404,
                detail="Coupon not found",
            )

        if (
            hasattr(
                coupon,
                "is_active",
            )
            and not coupon.is_active
        ):
            raise HTTPException(
                status_code=400,
                detail="Coupon inactive",
            )

        if coupon.is_redeemed:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Coupon already redeemed"
                ),
            )

        coupon_lock_key = (
            f"coupon:{coupon.id}"
        )

        lock_acquired = (
            await acquire_lock(
                coupon_lock_key,
                ttl_seconds=120,
            )
        )

        if not lock_acquired:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Coupon currently "
                    "being used"
                ),
            )

        remaining_total = max(
            0.0,
            total_price
            - loyalty_discount,
        )

        coupon_discount = min(
            float(
                coupon.discount_value
            ),
            remaining_total,
        )

        coupon.discount_value = round(
            float(
                coupon.discount_value
            )
            - coupon_discount,
            2,
        )

        if (
            coupon.discount_value
            <= 0
        ):
            coupon.discount_value = 0
            coupon.is_redeemed = True

    final_total = max(
        0.0,
        total_price
        - loyalty_discount
        - coupon_discount,
    )

    payment_method = (
        "coupon"
        if final_total == 0
        else payload.payment_method
    )

    payment_status = (
        "paid"
        if payment_method
        in ["online", "coupon"]
        else "pending"
    )

    try:
        order = Order(
            id=new_id(),
            customer_id=user.id,
            shop_id=shop.id,
            total_price=round(
                final_total,
                2,
            ),
            prep_time_minutes=max(
                prep_times
            ) if prep_times else 0,
            scheduled_at=(
                payload.scheduled_at
            ),
            instructions=(
                payload.instructions
            ),
            payment_method=(
                payment_method
            ),
            payment_status=(
                payment_status
            ),
            order_type=(
                payload.order_type
            ),
            delivery_address_id=getattr(
                payload,
                "delivery_address_id",
                None,
            ),
            loyalty_points_used=(
                loyalty_points
            ),
            loyalty_discount_amount=(
                loyalty_discount
            ),
            coupon_id=(
                payload.coupon_id
            ),
            coupon_discount_applied=(
                coupon_discount
            ),
        )

        db.add(order)
        await db.flush()

        for item in order_items:
            item.order_id = order.id
            db.add(item)

        await db.commit()

        # Dispatches standard account confirmation profile alert node centrally
        await create_notification(
            db=db,
            user_id=user.id,
            title="Order Placed",
            message=f"Your order #{order.id[:8]} has been placed successfully.",
            type="order_status"
        )

    except Exception:
        if coupon_lock_key:
          await release_lock(
              coupon_lock_key
          )
        raise

    await send_sms(
        user.phone,
        (
            f"Order {order.id} "
            f"placed successfully "
            f"at {shop.name}"
        ),
    )

    created_order = (
        await get_order_or_404(
            db,
            order.id,
        )
    )

    return created_order


# ─────────────────────────────────────────────────────────────
# Get Single Order
# ─────────────────────────────────────────────────────────────

@router.get(
    "/{order_id}",
    response_model=OrderOut,
)
async def get_order(
    order_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "customer",
                "shop_owner",
                "admin",
            )
        ),
    ],
) -> OrderOut:

    order = await get_order_or_404(
        db,
        order_id,
    )

    await verify_order_access(
        db,
        user,
        order,
    )

    return order


@router.get(
    "/ticket/{order_id}",
    response_model=OrderOut,
)
async def get_order_ticket_details(
    order_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> OrderOut:

    order = await get_order_or_404(
        db,
        order_id,
    )

    await verify_order_access(
        db,
        user,
        order,
    )

    return order


# ─────────────────────────────────────────────────────────────
# Customer Orders
# ─────────────────────────────────────────────────────────────

@router.get(
    "/customer/me",
    response_model=list[OrderOut],
)
async def customer_orders(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(
            require_roles(
                "customer",
                "admin",
            )
        ),
    ],
    page: int = Query(
        1,
        ge=1,
    ),
    page_size: int = Query(
        20,
        ge=1,
        le=100,
    ),
) -> list[OrderOut]:

    stmt = (
        select(Order)
        .where(
            Order.customer_id
            == user.id
        )
        .options(
            selectinload(
                Order.items
            ),
            selectinload(
                Order.customer
            ),
            selectinload(
                Order.shop
            ),
        )
        .order_by(
            Order.created_at.desc()
        )
        .offset(
            (page - 1)
            * page_size
        )
        .limit(page_size)
    )

    orders = (
        await db.execute(stmt)
    ).scalars().all()

    return list(orders)


# ─────────────────────────────────────────────────────────────
# Shop Orders
# ─────────────────────────────────────────────────────────────

@router.get(
    "/shops/{shop_id}",
    response_model=list[OrderOut],
)
async def shop_orders(
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
    status_filter: str | None = Query(
        None,
        alias="status",
    ),
    page: int = Query(
        1,
        ge=1,
    ),
    page_size: int = Query(
        20,
        ge=1,
        le=100,
    ),
) -> list[OrderOut]:

    shop = await get_shop_or_404(
        db,
        shop_id,
    )

    if (
        user.role != "admin"
        and shop.owner_id != user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    stmt = (
        select(Order)
        .where(
            Order.shop_id == shop_id
        )
        .options(
            selectinload(
                Order.items
            ),
            selectinload(
                Order.customer
            ),
            selectinload(
                Order.shop
            ),
        )
    )

    if status_filter:
        stmt = stmt.where(
            Order.status
            == status_filter
        )

    stmt = (
        stmt.order_by(
            Order.created_at.desc()
        )
        .offset(
            (page - 1)
            * page_size
        )
        .limit(page_size)
    )

    orders = (
        await db.execute(stmt)
    ).scalars().all()

    return list(orders)


# ─────────────────────────────────────────────────────────────
# Update Order Status
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/{order_id}/status",
    response_model=OrderOut,
)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
):

    order = await get_order_or_404(
        db,
        order_id,
    )

    incoming_status = (
        payload.status
    )

    if incoming_status == "cancelled":
        if order.status in [
            "cancelled",
            "completed",
        ]:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Order already finalized"
                ),
            )

        if (
            user.role == "shop_owner"
            and order.shop
            and order.shop.owner_id
            != user.id
        ):
            raise HTTPException(
                status_code=403,
                detail="Forbidden",
            )

        await restore_coupon(
            db,
            order,
        )

        order.status = "cancelled"
        order.is_cancellation_pending = (
            False
        )

        await db.commit()

        await create_notification(
            db=db,
            user_id=order.customer_id,
            title="Order Cancelled",
            message="Your order has been cancelled.",
            type="order status"
        )

        return await get_order_or_404(
            db,
            order.id,
        )

    if incoming_status == "completed":
        if (
        order.payment_method == "cod"
        and order.payment_status != "paid"
        ):
            raise HTTPException(
            status_code=400,
            detail="Payment pending",
            )

        # Prevent double-awarding points
        if order.status == "completed":
            return await get_order_or_404(
            db,
            order.id,
            )

        await unlock_coupon(order)
        order.status = "completed"

        # ─────────────────────────────────────────
        # Loyalty Points Award
        # ─────────────────────────────────────────

        points_earned = max(
        1,
        int(order.total_price // 10),
        )

        loyalty_stmt = (
            select(LoyaltyAccount)
            .where(
                LoyaltyAccount.customer_id
                == order.customer_id,
                LoyaltyAccount.shop_id
                == order.shop_id,
            )
        )

        loyalty_account = (
            await db.execute(loyalty_stmt)
        ).scalar_one_or_none()

        if loyalty_account is None:
            loyalty_account = LoyaltyAccount(
                id=new_id(),
                customer_id=order.customer_id,
                shop_id=order.shop_id,
                points_balance=0,
                tier="bronze",
            )
            db.add(loyalty_account)
            await db.flush()

        loyalty_account.points_balance += (
            points_earned
        )

        order.loyalty_points_earned = (
        points_earned
        )

        db.add(
            LoyaltyTransaction(
            id=new_id(),
            account_id=loyalty_account.id,
            order_id=order.id,
            points=points_earned,
            action="earned",
        )
    )

        await db.commit()

        await create_notification(
            db=db,
            user_id=order.customer_id,
            title="Order Completed",
            message=f"Order completed. You earned {points_earned} loyalty points.",
            type="order_status"
        )

        return await get_order_or_404(
            db,
            order.id,
        )

    if (
        incoming_status
        == "cancel_requested"
    ):
        if order.status in [
            "cancelled",
            "completed",
        ]:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Order cannot "
                    "be cancelled"
                ),
            )

        if (
            order
            .cancellation_requests_sent
            >= 3
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Too many "
                    "cancellation requests"
                ),
            )

        if (
            order
            .is_cancellation_pending
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cancellation already pending"
                ),
            )

        order.cancellation_requests_sent += 1
        order.is_cancellation_pending = (
            True
        )
        order.cancellation_reason = (
            getattr(
                payload,
                "reason",
                None,
            )
        )
        order.status = (
            "cancel_requested"
        )

        await db.commit()

        if order.shop and order.shop.owner_id:
            await create_notification(
                db=db,
                user_id=order.shop.owner_id,
                title="Cancellation Request",
                message=f"Customer requested cancellation for order #{order.id[:8]}",
                type="order_status"
            )

        return await get_order_or_404(
            db,
            order.id,
        )

    if user.role in [
        "shop_owner",
        "admin",
    ]:
        if (
            user.role
            == "shop_owner"
            and order.shop
            and order.shop.owner_id
            != user.id
        ):
            raise HTTPException(
                status_code=403,
                detail="Forbidden",
            )

        notification_title = None
        notification_message = None

        if (
            incoming_status
            == "resume_order"
        ):
            order.status = "accepted"
            order.is_cancellation_pending = (
                False
            )
            notification_title = "Order Accepted"
            notification_message = "Your order has been accepted by the shop."

        elif (
            incoming_status
            == "mark_as_paid"
        ):
            order.payment_status = (
                "paid"
            )

        elif (
            incoming_status
            == "mark_as_unpaid"
        ):
            if (
                order.status
                == "completed"
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Completed orders "
                        "cannot be unpaid"
                    ),
                )

            order.payment_status = (
                "pending"
            )

        else:
            order.status = (
                incoming_status
            )
            if incoming_status == "preparing":
                notification_title = "Order Preparing"
                notification_message = "Your order is being prepared."
            elif incoming_status == "ready":
                notification_title = "Order Ready"
                notification_message = "Your order is ready for pickup."

        await db.commit()

        if notification_title and notification_message:
            await create_notification(
                db=db,
                user_id=order.customer_id,
                title=notification_title,
                message=notification_message,
                type="order_status"
            )

        return await get_order_or_404(
            db,
            order.id,
        )

    order.status = incoming_status
    await db.commit()

    return await get_order_or_404(
        db,
        order.id,
    )