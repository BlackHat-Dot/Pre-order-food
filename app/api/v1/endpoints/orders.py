from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, or_, text
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


async def _get_clean_serialized_order(db: AsyncSession, order_id: str, user: User) -> Order:
    fresh_stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.items),
            selectinload(Order.customer),
            selectinload(Order.shop)
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
        if not shop or (shop.owner_id != user.id and user.role != "admin"):
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
            detail="Shop Owners are strictly unauthorized to place pre-orders."
        )

    shop = await db.get(Shop, payload.shop_id)
    if not shop or not shop.is_active:
        raise HTTPException(404, "Shop not found")
    if not shop.is_open or not shop.is_accepting_orders:
        raise HTTPException(400, "Shop is not accepting orders")

    base_total_price = 0.0
    prep_times: list[int] = []
    order_items: list[OrderItem] = []

    for entry in payload.items:
        if entry.variant_id is not None:
            if entry.variant_id == "":
                raise HTTPException(400, "Invalid variant_id")
            variant = await db.get(MenuItemVariant, entry.variant_id)
            if not variant or not variant.is_available:
                raise HTTPException(status_code=400, detail="Variant configuration unavailable.")
                
            item = await db.get(MenuItem, variant.item_id)
            if not item or item.shop_id != shop.id or not item.is_available:
                raise HTTPException(status_code=400, detail="Item unavailable")
                
            base_total_price += variant.price * entry.quantity
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
                raise HTTPException(status_code=400, detail="Dish selection unavailable.")
                
            base_total_price += item.price * entry.quantity
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

    # ─── 🚀 THE LOYALTY DISCOUNT CALCULATION MATRIX ENGINE ───
    points_to_redeem = payload.redeem_loyalty_points or 0
    calculated_loyalty_discount = 0.0
    computed_percentage = 0.0
    
    if points_to_redeem > 0:
        discount_weight = getattr(shop, "loyalty_discount_per_point", 0.1) or 0.1
        calculated_loyalty_discount = round(float(points_to_redeem) * float(discount_weight), 2)
        
        if calculated_loyalty_discount > base_total_price:
            calculated_loyalty_discount = base_total_price

        # Calculate the dynamic mathematical percentage matching your frontend expectations
        if base_total_price > 0:
            computed_percentage = round((calculated_loyalty_discount / base_total_price) * 100, 0)

    final_total_price = max(0.0, base_total_price - calculated_loyalty_discount)

    addr_string = None
    incoming_address_id = getattr(payload, "delivery_address_id", None)
    
    if getattr(payload, "order_type", "delivery") == "delivery" and incoming_address_id:
        try:
            addr_id = incoming_address_id
            cursor = await db.execute(text(f"SELECT title, address_line, landmark FROM user_addresses WHERE id = '{addr_id}'"))
            row = cursor.fetchone()
            if row:
                addr_string = f"[{row[0]}] {row[1]}" + (f" (Landmark: {row[2]})" if row[2] else "")
            else:
                cursor_alt = await db.execute(text(f"SELECT title, address_line, landmark FROM addresses WHERE id = '{addr_id}'"))
                row_alt = cursor_alt.fetchone()
                if row_alt:
                    addr_string = f"[{row_alt[0]}] {row_alt[1]}" + (f" (Landmark: {row_alt[2]})" if row_alt[2] else "")
        except Exception:
            addr_string = incoming_address_id

    order = Order(
        id=new_id(),
        customer_id=user.id,
        shop_id=shop.id,
        total_price=round(final_total_price, 2),
        prep_time_minutes=max(prep_times) if prep_times else 0,
        scheduled_at=payload.scheduled_at,
        instructions=payload.instructions,
        payment_method=payload.payment_method,
        order_type=payload.order_type,
        delivery_address_id=addr_string if payload.order_type == "delivery" else None,
        payment_status="paid" if payload.payment_method == "online" else "pending",
        
        # ─── 🚀 THE FIXED ALLOCATION MATRIX KEYS ───
        loyalty_points_used=points_to_redeem,
        loyalty_discount_amount=calculated_loyalty_discount,
        discount_percentage=computed_percentage,  # 👈 Fixed: Write percent directly to persistent table column
        coupon_id=payload.coupon_id,
        coupon_discount_applied=0.0
    )

    db.add(order)
    await db.flush()

    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)
        
    await db.commit()
    await send_sms(user.phone, f"Order {order.id} placed successfully at {shop.name}")
    
    finalized_order_stmt = (
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.shop),
            selectinload(Order.customer)
        )
        .where(Order.id == order.id)
    )
    query_execution = await db.execute(finalized_order_stmt)
    return query_execution.scalar_one()


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: str, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(require_roles("customer", "shop_owner", "admin"))]) -> OrderOut:
    return await _get_clean_serialized_order(db, order_id, user)


@router.get("/ticket/{order_id}", response_model=OrderOut)
async def get_order_ticket_details(order_id: str, db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> OrderOut:
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
        .options(
            selectinload(Order.items),
            selectinload(Order.customer),
            selectinload(Order.shop)
        )
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


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
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied. Logged-in profile ({user.id}) does not match the merchant record for this store."
        )
        
    stmt = (
        select(Order)
        .where(Order.shop_id == shop_id)
        .options(
            selectinload(Order.items),
            selectinload(Order.customer),
            selectinload(Order.shop)
        )
    )
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    stmt = stmt.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.items),
            selectinload(Order.customer),
            selectinload(Order.shop)
        )
    )
    order = (await db.execute(stmt)).scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order missing")

    incoming_status = getattr(payload, "status", None)

    if incoming_status == "cancel_requested":
        if order.status in ["cancelled", "completed"]:
            raise HTTPException(status_code=400, detail="This order can no longer be cancelled.")
        if order.cancellation_requests_sent >= 3:
            raise HTTPException(status_code=400, detail="Maximum cancellation requests reached.")
        if order.is_cancellation_pending:
            raise HTTPException(status_code=400, detail="Cancellation request already pending approval.")

        order.cancellation_requests_sent += 1
        order.is_cancellation_pending = True
        order.cancellation_reason = getattr(payload, "reason", None)
        order.status = "cancel_requested"

        await db.commit()
        
        refreshed_stmt = (
            select(Order)
            .where(Order.id == order.id)
            .options(
                selectinload(Order.items),
                selectinload(Order.customer),
                selectinload(Order.shop)
            )
        )
        return (await db.execute(refreshed_stmt)).scalar_one()

    if user.role in ["shop_owner", "admin"]:
        if incoming_status == "cancelled":
            order.status = "cancelled"
            order.is_cancellation_pending = False
            await db.commit()
            
            refreshed_stmt = (
                select(Order)
                .where(Order.id == order.id)
                .options(
                    selectinload(Order.items),
                    selectinload(Order.customer),
                    selectinload(Order.shop)
                )
            )
            return (await db.execute(refreshed_stmt)).scalar_one()

        elif incoming_status == "resume_order":
            order.status = "accepted"
            order.is_cancellation_pending = False
            await db.commit()
            
            refreshed_stmt = (
                select(Order)
                .where(Order.id == order.id)
                .options(
                    selectinload(Order.items),
                    selectinload(Order.customer),
                    selectinload(Order.shop)
                )
            )
            return (await db.execute(refreshed_stmt)).scalar_one()

        if incoming_status == "completed":
            if order.payment_method == "cod" and order.payment_status != "paid":
                raise HTTPException(status_code=400, detail="Collect cash first before completing.")

            order.status = "completed"
            await db.commit()
            
            refreshed_stmt = (
                select(Order)
                .where(Order.id == order.id)
                .options(
                    selectinload(Order.items),
                    selectinload(Order.customer),
                    selectinload(Order.shop)
                )
            )
            return (await db.execute(refreshed_stmt)).scalar_one()

        if incoming_status in ["mark_as_paid", "mark_as_unpaid"]:
            if incoming_status == "mark_as_unpaid" and order.status == "completed":
                raise HTTPException(status_code=400, detail="Completed orders cannot be marked as unpaid.")

            order.payment_status = "paid" if incoming_status == "mark_as_paid" else "pending"
            await db.commit()
            
            refreshed_stmt = (
                select(Order)
                .where(Order.id == order.id)
                .options(
                    selectinload(Order.items),
                    selectinload(Order.customer),
                    selectinload(Order.shop)
                )
            )
            return (await db.execute(refreshed_stmt)).scalar_one()

    order.status = incoming_status
    await db.commit()
    
    refreshed_stmt = (
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.items),
            selectinload(Order.customer),
            selectinload(Order.shop)
        )
    )
    return (await db.execute(refreshed_stmt)).scalar_one()