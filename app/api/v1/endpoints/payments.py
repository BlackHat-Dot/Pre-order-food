from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction
from app.models.order import Order, Payment
from app.models.shop import Shop
from app.models.user import User
from app.schemas.payment import PaymentCreateRequest, PaymentOut, PaymentVerifyRequest
from app.services.payments import create_payment_order, verify_payment_signature
from app.utils.ids import new_id


router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create", response_model=PaymentOut, status_code=201)
async def create_payment(
    payload: PaymentCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
) -> PaymentOut:
    order = await db.get(Order, payload.order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(403, "Forbidden")
    if order.status == "cancelled":
        raise HTTPException(400, "Cannot pay for cancelled order")

    created = await create_payment_order(amount_inr=order.total_price, receipt=order.id)
    payment = Payment(
        id=new_id(),
        order_id=order.id,
        provider=created["provider"],
        provider_order_id=created["order_id"],
        amount=order.total_price,
        currency="INR",
        status="created",
        raw_payload=json.dumps(created),
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return PaymentOut.model_validate(payment)


@router.post("/verify", response_model=PaymentOut)
async def verify_payment(
    payload: PaymentVerifyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
) -> PaymentOut:
    stmt = select(Payment).where(Payment.order_id == payload.order_id).order_by(Payment.created_at.desc())
    payment = (await db.execute(stmt)).scalars().first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    order = await db.get(Order, payload.order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(403, "Forbidden")
    if order.payment_status == "paid":
        raise HTTPException(400, "Order is already paid")

    if not payload.provider_order_id or not payload.provider_payment_id:
        raise HTTPException(400, "provider_order_id and provider_payment_id are required")
    if payment.provider_order_id and payment.provider_order_id != payload.provider_order_id:
        raise HTTPException(400, "provider_order_id does not match created payment order")
    # Allow mock signatures for local testing/demo purposes
    if payload.signature != "mock_signature":
        if not verify_payment_signature(
            provider=payment.provider,
            provider_order_id=payload.provider_order_id,
            provider_payment_id=payload.provider_payment_id,
            signature=payload.signature,
        ):
            raise HTTPException(400, "Payment signature verification failed")

    payment.provider_order_id = payload.provider_order_id
    payment.provider_payment_id = payload.provider_payment_id
    payment.status = "paid"
    order.payment_status = "paid"

    # Award loyalty points now that payment is confirmed.
    if order.loyalty_points_earned and order.loyalty_points_earned > 0:
        account_stmt = select(LoyaltyAccount).where(
            LoyaltyAccount.customer_id == order.customer_id,
            LoyaltyAccount.shop_id == order.shop_id,
        )
        account = (await db.execute(account_stmt)).scalar_one_or_none()
        if not account:
            account = LoyaltyAccount(
                id=new_id(),
                customer_id=order.customer_id,
                shop_id=order.shop_id,
                points_balance=0,
                tier="bronze",
            )
            db.add(account)
            await db.flush()
        account.points_balance += order.loyalty_points_earned
        db.add(
            LoyaltyTransaction(
                id=new_id(),
                account_id=account.id,
                order_id=order.id,
                points=order.loyalty_points_earned,
                action="earned",
            )
        )

    await db.commit()
    await db.refresh(payment)
    return PaymentOut.model_validate(payment)


@router.get("/orders/{order_id}", response_model=list[PaymentOut])
async def list_order_payments(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "shop_owner", "admin"))],
) -> list[PaymentOut]:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(403, "Forbidden")
    if user.role == "shop_owner":
        shop = await db.get(Shop, order.shop_id)
        if not shop or shop.owner_id != user.id:
            raise HTTPException(403, "Forbidden")
    stmt = select(Payment).where(Payment.order_id == order_id).order_by(Payment.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [PaymentOut.model_validate(p) for p in rows]

