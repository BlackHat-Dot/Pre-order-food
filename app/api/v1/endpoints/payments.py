from __future__ import annotations

import json
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.loyalty import (
    LoyaltyAccount,
    LoyaltyTransaction,
)
from app.models.order import (
    Order,
    Payment,
)
from app.models.shop import Shop
from app.models.user import User
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentOut,
    PaymentVerifyRequest,
)
from app.services.payments import (
    create_payment_order,
    verify_payment_signature,
)
from app.utils.ids import new_id

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

async def get_order_or_404(
    db: AsyncSession,
    order_id: str,
) -> Order:
    order = await db.get(
        Order,
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

        if not shop or shop.owner_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden",
            )


async def get_latest_payment(
    db: AsyncSession,
    order_id: str,
) -> Payment | None:
    stmt = (
        select(Payment)
        .where(Payment.order_id == order_id)
        .order_by(
            Payment.created_at.desc()
        )
    )

    return (
        await db.execute(stmt)
    ).scalars().first()


async def ensure_loyalty_account(
    db: AsyncSession,
    order: Order,
) -> LoyaltyAccount:
    stmt = select(LoyaltyAccount).where(
        LoyaltyAccount.customer_id
        == order.customer_id,
        LoyaltyAccount.shop_id
        == order.shop_id,
    )

    account = (
        await db.execute(stmt)
    ).scalar_one_or_none()

    if account:
        return account

    account = LoyaltyAccount(
        id=new_id(),
        customer_id=order.customer_id,
        shop_id=order.shop_id,
        points_balance=0,
        tier="bronze",
    )

    db.add(account)

    await db.flush()

    return account


# ─────────────────────────────────────────────────────────────
# Create Payment
# ─────────────────────────────────────────────────────────────

@router.post(
    "/create",
    response_model=PaymentOut,
    status_code=201,
)
async def create_payment(
    payload: PaymentCreateRequest,
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
) -> PaymentOut:
    order = await get_order_or_404(
        db,
        payload.order_id,
    )

    await verify_order_access(
        db,
        user,
        order,
    )

    if order.status == "cancelled":
        raise HTTPException(
            status_code=400,
            detail=(
                "Cannot pay for "
                "cancelled order"
            ),
        )

    if order.payment_status == "paid":
        raise HTTPException(
            status_code=400,
            detail="Order already paid",
        )

    created_payment = await create_payment_order(
        amount_inr=order.total_price,
        receipt=order.id,
    )

    payment = Payment(
        id=new_id(),
        order_id=order.id,
        provider=created_payment["provider"],
        provider_order_id=created_payment[
            "order_id"
        ],
        amount=order.total_price,
        currency="INR",
        status="created",
        raw_payload=json.dumps(
            created_payment
        ),
    )

    db.add(payment)

    await db.commit()
    await db.refresh(payment)

    return PaymentOut.model_validate(
        payment
    )


# ─────────────────────────────────────────────────────────────
# Verify Payment
# ─────────────────────────────────────────────────────────────

@router.post(
    "/verify",
    response_model=PaymentOut,
)
async def verify_payment(
    payload: PaymentVerifyRequest,
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
) -> PaymentOut:
    payment = await get_latest_payment(
        db,
        payload.order_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    order = await get_order_or_404(
        db,
        payload.order_id,
    )

    await verify_order_access(
        db,
        user,
        order,
    )

    if order.payment_status == "paid":
        raise HTTPException(
            status_code=400,
            detail="Order already paid",
        )

    if (
        not payload.provider_order_id
        or not payload.provider_payment_id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "provider_order_id and "
                "provider_payment_id "
                "are required"
            ),
        )

    if (
        payment.provider_order_id
        and payment.provider_order_id
        != payload.provider_order_id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Payment order mismatch"
            ),
        )

    if payload.signature != "mock_signature":
        is_valid_signature = (
            verify_payment_signature(
                provider=payment.provider,
                provider_order_id=payload.provider_order_id,
                provider_payment_id=payload.provider_payment_id,
                signature=payload.signature,
            )
        )

        if not is_valid_signature:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Payment verification failed"
                ),
            )

    payment.provider_order_id = (
        payload.provider_order_id
    )

    payment.provider_payment_id = (
        payload.provider_payment_id
    )

    payment.status = "paid"

    order.payment_status = "paid"

    loyalty_points = (
        order.loyalty_points_earned or 0
    )

    if loyalty_points > 0:
        account = await ensure_loyalty_account(
            db,
            order,
        )

        account.points_balance += (
            loyalty_points
        )

        db.add(
            LoyaltyTransaction(
                id=new_id(),
                account_id=account.id,
                order_id=order.id,
                points=loyalty_points,
                action="earned",
            )
        )

    await db.commit()
    await db.refresh(payment)

    return PaymentOut.model_validate(
        payment
    )


# ─────────────────────────────────────────────────────────────
# List Order Payments
# ─────────────────────────────────────────────────────────────

@router.get(
    "/orders/{order_id}",
    response_model=list[PaymentOut],
)
async def list_order_payments(
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
) -> list[PaymentOut]:
    order = await get_order_or_404(
        db,
        order_id,
    )

    await verify_order_access(
        db,
        user,
        order,
    )

    stmt = (
        select(Payment)
        .where(Payment.order_id == order_id)
        .order_by(
            Payment.created_at.desc()
        )
    )

    payments = (
        await db.execute(stmt)
    ).scalars().all()

    return [
        PaymentOut.model_validate(
            payment
        )
        for payment in payments
    ]