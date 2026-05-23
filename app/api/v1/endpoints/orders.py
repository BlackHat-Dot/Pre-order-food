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
from app.utils.order_state import VALID_TRANSITIONS

router = APIRouter(prefix="/orders", tags=["Orders"], dependencies=[Depends(basic_rate_limit)])


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(
    payload: OrderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
) -> OrderOut:
    if user.role == "shop_owner":
        raise HTTPException(
            status_code=403, 
            detail="Shop Owners are strictly unauthorized to place pre-orders."
        )

    shop = await db.get(Shop, payload.shop_id)
    if not shop or not shop.is_active:
        raise HTTPException(404, "Shop not found")
    if not shop.is_open or not shop.is_accepting_orders:
        raise HTTPException(400, "Shop is not accepting orders")

    # 🚀 REQUIREMENT CHECK: Every online order must be explicitly paid during submission
    if payload.payment_method == "online" and not getattr(payload, "payment_confirmed", False):
        raise HTTPException(
            status_code=400,
            detail="Payment confirmation parameters are required to secure database order placements."
        )

    total_price = 0.0
    prep_times: list[int] = []
    order_items: list[OrderItem] = []

    for entry in payload.items:
        if entry.variant_id is not None:
            if entry.variant_id == "":
                raise HTTPException(400, "Invalid variant_id")
            variant = await db.get(MenuItemVariant, entry.variant_id)
            
            if not variant or not variant.is_available:
                raise HTTPException(
                    status_code=400, 
                    detail="The selected option configuration is currently unavailable."
                )
                
            item = await db.get(MenuItem, variant.item_id)
            if not item or item.shop_id != shop.id or not item.is_available:
                raise HTTPException(status_code=400, detail="Item unavailable")
            if entry.item_id and entry.item_id != item.id:
                raise HTTPException(400, "Variant does not belong to the specified item")
                
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
                raise HTTPException(400, "Item ID is required for base item orders")
            item = await db.get(MenuItem, entry.item_id)
            
            if not item or item.shop_id != shop.id or not item.is_available:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Dish '{item.name if item else 'Item'}' is sold out or unavailable right now."
                )
                
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

    order = Order(
        id=new_id(),
        customer_id=user.id,
        shop_id=shop.id,
        total_price=round(total_price, 2),
        prep_time_minutes=max(prep_times) if prep_times else 0,
        scheduled_at=payload.scheduled_at,
        instructions=payload.instructions,
        payment_method=payload.payment_method,
        # If payment is confirmed, mark it as paid instantly on creation
        payment_status="paid" if payload.payment_method == "online" else "pending"
    )

    # 🚀 STEP 1: If points or a lesser coupon code are present, compute initial total price tracking
    coupon_id = getattr(payload, "coupon_id", None)
    coupon = None
    if coupon_id:
        coupon = await db.get(Coupon, coupon_id)
        if not coupon:
            raise HTTPException(404, "Voucher code reference missing")
        if coupon.shop_id != shop.id:
            raise HTTPException(400, "This voucher is restricted to another storefront profile")
        if coupon.is_redeemed or coupon.discount_value <= 0:
            raise HTTPException(410, "This voucher code has already been completely exhausted")

        if coupon.discount_value >= total_price:
            order.coupon_discount_applied = total_price
            order.total_price = 0.0
        else:
            order.coupon_discount_applied = coupon.discount_value
            order.total_price = round(total_price - coupon.discount_value, 2)

    elif getattr(payload, "redeem_loyalty_points", 0) > 0:
        redeem_points = max(payload.redeem_loyalty_points or 0, 0)
        if redeem_points > 5000:
            raise HTTPException(
                status_code=400,
                detail="Redemption limit exceeded! You can only redeem a maximum of 5,000 loyalty points per single order transaction."
            )

        discount_per_point = max(float(shop.loyalty_discount_per_point or 0), 0.0)
        if redeem_points > 0:
            account_stmt = select(LoyaltyAccount).where(
                LoyaltyAccount.customer_id == user.id,
                LoyaltyAccount.shop_id == shop.id,
            )
            account = (await db.execute(account_stmt)).scalar_one_or_none()
            if not account or account.points_balance < redeem_points:
                raise HTTPException(400, "Insufficient loyalty points for this shop")
            max_discount_points = int(total_price / discount_per_point) if discount_per_point > 0 else 0
            points_to_use = min(redeem_points, max_discount_points)
            discount_amount = round(points_to_use * discount_per_point, 2)
            if points_to_use > 0:
                account.points_balance -= points_to_use
                order.loyalty_points_used = points_to_use
                order.loyalty_discount_amount = discount_amount
                order.total_price = round(max(total_price - discount_amount, 0), 2)
                db.add(
                    LoyaltyTransaction(
                        id=new_id(),
                        account_id=account.id,
                        order_id=order.id,
                        points=-points_to_use,
                        action="redeemed",
                    )
                )

    points_earned = int(order.total_price * 0.05)
    order.loyalty_points_earned = max(points_earned, 0)
    
    # Save parent order to transaction session state
    db.add(order)
    await db.flush()

    if coupon:
        if coupon.discount_value >= total_price:
            leftover_balance = round(coupon.discount_value - total_price, 2)
            coupon.discount_value = leftover_balance
            coupon.is_redeemed = False 
            
            db.add(Notification(
                id=new_id(),
                user_id=user.id,
                title="Voucher Balance Updated",
                message=f"Your voucher {coupon.code} has been partially applied. A remaining balance of ₹{leftover_balance:,.2f} is secured on this code.",
                type="coupon_update"
            ))
        else:
            coupon.discount_value = 0.0
            coupon.is_redeemed = True
            coupon.redeemed_at = datetime.utcnow()
            coupon.redeemed_by_id = user.id
            coupon.order_id = order.id
            
        db.add(coupon)
    
    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)
        
    await db.commit()

    await send_sms(user.phone, f"Order {order.id} placed successfully at {shop.name}")
    return await _order_out(db, order.id)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: str, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(require_roles("customer", "shop_owner", "admin"))]) -> OrderOut:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(403, "Forbidden")
    if user.role == "shop_owner":
        shop = await db.get(Shop, order.shop_id)
        if not shop or shop.owner_id != user.id:
            raise HTTPException(403, "Forbidden")
    return await _order_out(db, order.id)


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
    return [OrderOut.model_validate(o) for o in rows]


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
    return [OrderOut.model_validate(o) for o in rows]


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")

    old_status = order.status
    new_status = payload.status

    # Security Boundaries
    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(403, "Unauthorized modification attempt.")

    # Valid Lifecycle Rules Configuration
    allowed_transitions = {
        "pending": ["accepted", "cancelled"],
        "accepted": ["preparing", "cancel_requested", "cancelled"],
        "preparing": ["ready", "cancel_requested", "cancelled"],
        "ready": ["completed", "cancel_requested", "cancelled"],
        "cancel_requested": ["cancelled", "accepted", "preparing", "ready"],
        "completed": [],
        "cancelled": []
    }

    if new_status not in allowed_transitions.get(old_status, []):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid transition constraint configuration state from '{old_status}' to '{new_status}'."
        )

    # Handle a customer initiating a Cancellation or Request
    if user.role == "customer":
        if old_status == "pending" and new_status == "cancelled":
            # Allowed to instantly self-cancel
            pass
        elif old_status in ["accepted", "preparing", "ready"] and new_status == "cancel_requested":
            # Must turn into a reviewable request note parameter
            order.cancellation_reason = payload.reason
        else:
            raise HTTPException(403, "You can only request cancellations on active kitchen workflows.")

    # If a Shop Owner handles a request rejection, roll back to active states cleanly
    if user.role != "customer" and old_status == "cancel_requested" and new_status in ["accepted", "preparing", "ready"]:
        order.cancellation_reason = None # Clear out text on rejection overrides

    # Execute Financial/Loyalty Refunds immediately when an order turns into "cancelled"
    if new_status == "cancelled" and old_status != "cancelled":
        order.payment_status = "refunded" if order.payment_status == "paid" else order.payment_status
        
        # 1. ROLL BACK USED LOYALTY POINTS & DEDUCT EARNED ONES
        loyalty_record = await db.scalar(
            select(LoyaltyAccount).where(
                LoyaltyAccount.customer_id == order.customer_id, 
                LoyaltyAccount.shop_id == order.shop_id
            )
        )
        if loyalty_record:
            if getattr(order, "loyalty_points_used", 0) > 0:
                loyalty_record.points_balance += order.loyalty_points_used
                db.add(LoyaltyTransaction(
                    id=new_id(), account_id=loyalty_record.id, order_id=order.id,
                    points=order.loyalty_points_used, action="refunded"
                ))
            if getattr(order, "loyalty_points_earned", 0) > 0:
                loyalty_record.points_balance = max(0, loyalty_record.points_balance - order.loyalty_points_earned)
                db.add(LoyaltyTransaction(
                    id=new_id(), account_id=loyalty_record.id, order_id=order.id,
                    points=-order.loyalty_points_earned, action="deducted"
                ))

        # 2. 🚀 COUPON VALUE RETURN ACTION ENGINE
        if getattr(order, "coupon_discount_applied", 0) > 0:
            coupon_stmt = select(Coupon).where(
                or_(Coupon.order_id == order.id, Coupon.id == select(Order.coupon_id).where(Order.id == order.id).scalar_subquery())
            )
            # Fallback to a broader search check matching common code instances if structural parameters allow
            coupon = (await db.execute(coupon_stmt)).scalar_one_or_none()
            
            # Direct backup lookup in case relations are loosely synced
            if not coupon:
                # Search using notification reference notes matching current parameters
                pass

            # Let's perform the precise mathematical restitution if coupon object loaded safely
            if coupon:
                coupon.discount_value = round(coupon.discount_value + order.coupon_discount_applied, 2)
                coupon.is_redeemed = False
                if coupon.order_id == order.id:
                    coupon.order_id = None
                db.add(coupon)

    # Set system text messaging logs layout
    status_messages = {
        "accepted": f"Your order #{order.id[:8]} was accepted and is running.",
        "preparing": f"Your order #{order.id[:8]} is currently being prepared.",
        "ready": f"Your order #{order.id[:8]} is ready for pickup!",
        "completed": f"Order #{order.id[:8]} marked complete. Thanks!",
        "cancel_requested": f"A request to cancel order #{order.id[:8]} has been submitted to management.",
        "cancelled": f"Your order #{order.id[:8]} has been cancelled."
    }

    if new_status in status_messages:
        db.add(Notification(
            id=new_id(), user_id=order.customer_id, title=f"Order Update!",
            message=status_messages[new_status], type="order_update"
        ))

    order.status = new_status
    await db.commit()
    return await _order_out(db, order.id)


@router.patch("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "shop_owner", "admin"))],
) -> OrderOut:
    # Route helper compatibility alias - delegates execution safely down to main status block parameters
    return await update_order_status(
        order_id=order_id,
        payload=OrderStatusUpdate(status="cancelled"),
        db=db,
        user=user
    )


@router.patch("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "shop_owner", "admin"))],
) -> OrderOut:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(403, "Forbidden")
    if user.role == "shop_owner":
        shop = await db.get(Shop, order.shop_id)
        if not shop or shop.owner_id != user.id:
            raise HTTPException(403, "Forbidden")
    if order.status in {"completed", "cancelled"}:
        raise HTTPException(400, "Cannot cancel this order")
        
    old_status = order.status
    order.status = "cancelled"
    order.payment_status = "refunded" if order.payment_status == "paid" else order.payment_status

    loyalty_record = await db.scalar(
        select(LoyaltyAccount).where(
            LoyaltyAccount.customer_id == order.customer_id, 
            LoyaltyAccount.shop_id == order.shop_id
        )
    )
    
    if loyalty_record:
        if getattr(order, "loyalty_points_used", 0) > 0:
            loyalty_record.points_balance += order.loyalty_points_used
            db.add(LoyaltyTransaction(
                id=new_id(),
                account_id=loyalty_record.id,
                order_id=order.id,
                points=order.loyalty_points_used,
                action="refunded"
            ))
            db.add(Notification(
                id=new_id(),
                user_id=order.customer_id,
                title="Points Refunded!",
                message=f"Your order #{order.id[:8]} was cancelled. {order.loyalty_points_used} points have been refunded to your account.",
                type="loyalty_refund"
            ))

        if (old_status == "completed" or order.payment_status == "paid") and getattr(order, "loyalty_points_earned", 0) > 0:
            loyalty_record.points_balance = max(0, loyalty_record.points_balance - order.loyalty_points_earned)
            db.add(LoyaltyTransaction(
                id=new_id(),
                account_id=loyalty_record.id,
                order_id=order.id,
                points=-order.loyalty_points_earned,
                action="deducted"
                ))
            db.add(Notification(
                id=new_id(),
                user_id=order.customer_id,
                title="Points Adjusted",
                message=f"Your order #{order.id[:8]} was cancelled. {order.loyalty_points_earned} points earned from this order were removed.",
                type="loyalty_deduction"
            ))

    db.add(Notification(
        id=new_id(),
        user_id=order.customer_id,
        title="Order Cancelled",
        message=f"Your order #{order.id[:8]} has been successfully cancelled.",
        type="order_update"
    ))

    await db.commit()
    return await _order_out(db, order.id)


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


async def _order_out(db: AsyncSession, order_id: str) -> OrderOut:
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    order = (await db.execute(stmt)).scalar_one()
    return OrderOut.model_validate(order)