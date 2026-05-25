from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import basic_rate_limit, require_roles, get_current_user
from app.db.session import get_db
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction
from app.models.menu import MenuItem, MenuItemVariant
from app.models.notification import Notification
from app.models.order import Order, OrderItem
from app.models.shop import Shop
from app.models.user import User
from app.models.coupon import Coupon 
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.services.sms import send_sms
from app.utils.ids import new_id

router = APIRouter(prefix="/orders", tags=["Orders"], dependencies=[Depends(basic_rate_limit)])


# 🚀 AUTHORITATIVE GLOBAL FETCH UTILITY: Enforces strict data integrity and role permissions
# 📁 Update this specific method inside app/api/v1/endpoints/orders.py

async def _get_clean_serialized_order(db: AsyncSession, order_id: str, user: User) -> Order:
    """
    Guarantees full async eager-loading for nested order items, customer parameters, 
    and delivery locations to prevent MissingGreenlet runtime drops.
    """
    fresh_stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.items),
            selectinload(Order.customer),       # 🚀 Pre-loads customer credentials (name/phone)
            selectinload(Order.delivery_address) # 🚀 Pre-loads physical delivery location parameters
        )
    )
    fresh_result = await db.execute(fresh_stmt)
    fresh_order = fresh_result.scalar_one_or_none()
    
    if not fresh_order:
        raise HTTPException(status_code=404, detail="Requested order could not be located.")
        
    if user.role == "customer" and fresh_order.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied to this order tracking token.")
        
    if user.role == "shop_owner":
        shop = await db.get(Shop, fresh_order.shop_id)
        if not shop or shop.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Access restricted to authorized merchant profiles.")
            
    return fresh_order


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(
    payload: OrderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
) -> OrderOut:
    if user.role == "shop_owner":
        raise HTTPException(
            status_code=403, 
            detail="Shop Owners are strictly unauthorized to place orders."
        )

    shop = await db.get(Shop, payload.shop_id)
    if not shop or not shop.is_active:
        raise HTTPException(404, "Shop not found")
    if not shop.is_open or not shop.is_accepting_orders:
        raise HTTPException(400, "Shop is not accepting orders")

    # 🔒 Payment Gateway Guard
    if payload.payment_method == "online" and not payload.payment_confirmed:
        raise HTTPException(
            status_code=400,
            detail="Payment confirmation token verification failed. Transaction aborted."
        )

    total_price = 0.0
    prep_times: list[int] = []
    order_items: list[OrderItem] = []

    for entry in payload.items:
        if entry.variant_id:
            variant = await db.get(MenuItemVariant, entry.variant_id)
            if not variant or not variant.is_available:
                raise HTTPException(status_code=400, detail="Variant configuration unavailable.")
            item = await db.get(MenuItem, variant.item_id)
            if not item or item.shop_id != shop.id or not item.is_available:
                raise HTTPException(status_code=400, detail="Item unavailable")
                
            total_price += variant.price * entry.quantity
            prep_times.append(variant.prep_time_minutes)
            order_items.append(
                OrderItem(
                    id=new_id(),
                    order_id="",
                    item_id=item.id,
                    variant_id=variant.id,
                    quantity=entry.quantity,
                    unit_price=variant.price,
                    item_name_snapshot=item.name,
                    variant_name_snapshot=variant.name,
                )
            )
        else:
            if not entry.item_id:
                raise HTTPException(400, "Item ID is required for base items")
            item = await db.get(MenuItem, entry.item_id)
            if not item or item.shop_id != shop.id or not item.is_available:
                raise HTTPException(status_code=400, detail="Dish selection is unavailable.")
                
            total_price += item.price * entry.quantity
            prep_times.append(item.prep_time_minutes)
            order_items.append(
                OrderItem(
                    id=new_id(),
                    order_id="",
                    item_id=item.id,
                    variant_id=None,
                    quantity=entry.quantity,
                    unit_price=item.price,
                    item_name_snapshot=item.name,
                    variant_name_snapshot=None,
                )
            )

    # Initialize the base database model map container with your form settings
    order = Order(
        id=new_id(),
        customer_id=user.id,
        shop_id=shop.id,
        total_price=round(total_price, 2),
        prep_time_minutes=max(prep_times) if prep_times else 0,
        scheduled_at=payload.scheduled_at,
        instructions=payload.instructions,
        payment_method=payload.payment_method,
        order_type=payload.order_type,
        payment_status="paid" if payload.payment_method == "online" else "pending"
    )

    # Process discounts if a coupon is provided
    coupon_id = getattr(payload, "coupon_id", None)
    coupon = None
    if coupon_id:
        coupon = await db.get(Coupon, coupon_id)
        if coupon and coupon.shop_id == shop.id and not coupon.is_redeemed:
            if coupon.discount_value >= total_price:
                order.coupon_discount_applied = total_price
                order.total_price = 0.0
                coupon.discount_value = round(coupon.discount_value - total_price, 2)
            else:
                order.coupon_discount_applied = coupon.discount_value
                order.total_price = round(total_price - coupon.discount_value, 2)
                coupon.discount_value = 0.0
                coupon.is_redeemed = True
            db.add(coupon)

    # Process loyalty points points allocation values
    elif getattr(payload, "redeem_loyalty_points", 0) > 0:
        redeem_points = min(payload.redeem_loyalty_points, 5000)
        discount_per_point = max(float(shop.loyalty_discount_per_point or 0), 0.0)
        account_stmt = select(LoyaltyAccount).where(LoyaltyAccount.customer_id == user.id, LoyaltyAccount.shop_id == shop.id)
        account = (await db.execute(account_stmt)).scalar_one_or_none()
        
        if account and account.points_balance >= redeem_points and discount_per_point > 0:
            max_discount_points = int(total_price / discount_per_point)
            points_to_use = min(redeem_points, max_discount_points)
            discount_amount = round(points_to_use * discount_per_point, 2)
            
            if points_to_use > 0:
                account.points_balance -= points_to_use
                order.loyalty_points_used = points_to_use
                order.loyalty_discount_amount = discount_amount
                order.total_price = round(max(total_price - discount_amount, 0), 2)
                db.add(LoyaltyTransaction(id=new_id(), account_id=account.id, order_id=order.id, points=-points_to_use, action="redeemed"))

    order.loyalty_points_earned = max(int(order.total_price * 0.05), 0)
    db.add(order)
    await db.flush()

    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)
        
    await db.commit()
    await send_sms(user.phone, f"Order {order.id} ({payload.order_type.replace('_', ' ')}) placed successfully at {shop.name}!")
    return await _get_clean_serialized_order(db, order.id, user)

@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str, 
    db: Annotated[AsyncSession, Depends(get_db)], 
    user: Annotated[User, Depends(require_roles("customer", "shop_owner", "admin"))]
) -> OrderOut:
    return await _get_clean_serialized_order(db, order_id, user)


@router.get("/ticket/{order_id}", response_model=OrderOut)
async def get_order_ticket_details(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> OrderOut:
    # 🚀 FIXED THE MISSING LINK: Uses the standardized helper to cleanly pre-load fields and fix the 404 error
    return await _get_clean_serialized_order(db, order_id, user)


@router.get("/customer/me", response_model=list[OrderOut])
async def customer_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[OrderOut]:
    stmt = (
        select(Order)
        .where(Order.customer_id == user.id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.get("/shops/{shop_id}", response_model=list[OrderOut])
async def shop_orders(
    shop_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[OrderOut]:
    shop = await db.get(Shop, shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")
        
    stmt = select(Order).where(
        Order.shop_id == shop_id,
        or_(Order.payment_status == "paid", Order.payment_method == "cod")
    ).options(selectinload(Order.items))
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    stmt = stmt.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Requested order could not be located.")

    if order.cancellation_requests_sent is None:
        order.cancellation_requests_sent = 0
    if order.is_cancellation_pending is None:
        order.is_cancellation_pending = False

    if user.role == "shop_owner":
        current_db_status = getattr(order, "status", "").lower()
        incoming_status = getattr(payload, "status", None)
        decline_action = getattr(payload, "decline_action", None)
        
        # 🚀 MANUAL PAYMENT OVERRIDE GATEWAY
        # Allows a merchant to mark a COD balance as collected without altering the fulfillment step
        if incoming_status == "mark_as_paid":
            order.payment_status = "paid"
            await db.commit()
            return order
        
        elif incoming_status == "mark_as_unpaid":
            order.payment_status = "pending"
            await db.commit()
            return order
        
        if current_db_status == "cancel_requested":
            is_resolving_action = (
                incoming_status in ["cancelled", "accepted"] or 
                decline_action == "decline_cancellation"
            )
            
            if is_resolving_action and getattr(order, "is_cancellation_pending", False) is False:
                raise HTTPException(
                    status_code=400,
                    detail="Action Lockout: This cancellation request has already been processed and resolved. Subsequent modifications are denied."
                )
            
        if incoming_status == "cancelled" and getattr(order, "is_cancellation_pending", False):
            order.status = "cancelled"
            order.is_cancellation_pending = False
            await db.commit()
            return order
            
        elif (decline_action == "decline_cancellation" or incoming_status == "accepted") and getattr(order, "is_cancellation_pending", False):
            order.status = "accepted"
            order.is_cancellation_pending = False
            await db.commit()
            return order

        if getattr(order, "is_cancellation_pending", False) and incoming_status not in ["cancelled", "accepted"]:
            raise HTTPException(
                status_code=400,
                detail="Fulfillment Blocked: You must explicitly Accept or Decline the active cancellation request before modifying this order's progress."
            )

    if getattr(payload, "status", None) == "cancel_requested":
        if order.cancellation_requests_sent >= 3:
            raise HTTPException(status_code=400, detail="Automated cancellation request limits reached.")
            
        order.cancellation_requests_sent += 1
        order.status = "cancel_requested"
        order.is_cancellation_pending = True
        
        incoming_reason = getattr(payload, "reason", None)
        if incoming_reason:
            order.cancellation_reason = incoming_reason
            
        await db.commit()
        return order

    order.status = payload.status
    await db.commit()
    return order


@router.patch("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "shop_owner", "admin"))],
) -> OrderOut:
    return await update_order_status(
        order_id=order_id,
        payload=OrderStatusUpdate(status="cancelled"),
        db=db,
        user=user
    )


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("admin"))],
) -> Response:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    await db.delete(order)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)