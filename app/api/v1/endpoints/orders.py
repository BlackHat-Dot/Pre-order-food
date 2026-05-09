from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import basic_rate_limit, require_roles
from app.db.session import get_db
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction
from app.models.menu import MenuItem, MenuItemVariant
from app.models.order import Order, OrderItem
from app.models.shop import Shop
from app.models.user import User
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
    shop = await db.get(Shop, payload.shop_id)
    if not shop or not shop.is_active:
        raise HTTPException(404, "Shop not found")
    if not shop.is_open or not shop.is_accepting_orders:
        raise HTTPException(400, "Shop is not accepting orders")

    total_price = 0.0
    prep_times: list[int] = []
    order_items: list[OrderItem] = []

    for entry in payload.items:
        if entry.variant_id is not None:
            if entry.variant_id == "":
                raise HTTPException(400, "Invalid variant_id")
            variant = await db.get(MenuItemVariant, entry.variant_id)
            if not variant or not variant.is_available:
                raise HTTPException(400, "Variant unavailable")
            item = await db.get(MenuItem, variant.item_id)
            if not item or item.shop_id != shop.id or not item.is_available:
                raise HTTPException(400, "Item unavailable")
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
                raise HTTPException(400, "Item unavailable")
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
    )
    # Optional shop-specific loyalty redemption.
    redeem_points = max(payload.redeem_loyalty_points or 0, 0)
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

    # Loyalty points are earned after payment is confirmed (see payments.py).
    # Store the expected earn amount on the order for display purposes only.
    points_earned = int(order.total_price * 0.05)
    order.loyalty_points_earned = max(points_earned, 0)
    db.add(order)
    await db.flush()
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
    stmt = select(Order).where(Order.shop_id == shop_id).options(selectinload(Order.items))
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
    user: Annotated[User, Depends(require_roles("shop_owner", "admin"))],
) -> OrderOut:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    shop = await db.get(Shop, order.shop_id)
    if not shop:
        raise HTTPException(404, "Shop not found")
    if user.role != "admin" and shop.owner_id != user.id:
        raise HTTPException(403, "Forbidden")

    valid_next = VALID_TRANSITIONS.get(order.status, set())
    if payload.status not in valid_next:
        raise HTTPException(400, "Invalid status transition")
    order.status = payload.status
    await db.commit()
    await db.refresh(order)
    return await _order_out(db, order.id)


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
    order.status = "cancelled"
    order.payment_status = "refunded" if order.payment_status == "paid" else order.payment_status
    await db.commit()
    await db.refresh(order)
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

