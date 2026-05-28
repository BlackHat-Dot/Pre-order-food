from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.loyalty import (
    LoyaltyAccount,
    LoyaltyTransaction,
)
from app.models.shop import Shop
from app.models.user import User
from app.schemas.loyalty import (
    LoyaltyAccountOut,
    LoyaltyRedeemRequest,
    LoyaltyTransactionOut,
)
from app.utils.ids import new_id

router = APIRouter(
    prefix="/loyalty",
    tags=["Loyalty"],
)


async def get_shop_or_404(
    db: AsyncSession,
    shop_id: str,
) -> Shop:
    shop = await db.get(Shop, shop_id)

    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found",
        )

    return shop


async def ensure_loyalty_account(
    db: AsyncSession,
    customer_id: str,
    shop_id: str,
) -> LoyaltyAccount:
    await get_shop_or_404(db, shop_id)

    stmt = select(LoyaltyAccount).where(
        LoyaltyAccount.customer_id == customer_id,
        LoyaltyAccount.shop_id == shop_id,
    )

    account = (
        await db.execute(stmt)
    ).scalar_one_or_none()

    if account:
        return account

    account = LoyaltyAccount(
        id=new_id(),
        customer_id=customer_id,
        shop_id=shop_id,
        points_balance=0,
        tier="bronze",
    )

    db.add(account)

    await db.commit()
    await db.refresh(account)

    return account


async def create_transaction(
    db: AsyncSession,
    account_id: str,
    points: int,
    action: str,
) -> None:
    transaction = LoyaltyTransaction(
        id=new_id(),
        account_id=account_id,
        points=points,
        action=action,
    )

    db.add(transaction)


# ─────────────────────────────────────────────────────────────
# Current Loyalty Account
# ─────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=LoyaltyAccountOut,
)
async def my_loyalty(
    shop_id: str = Query(...),
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ] = None,
    user: Annotated[
        User,
        Depends(require_roles("customer", "admin")),
    ] = None,
) -> LoyaltyAccountOut:
    account = await ensure_loyalty_account(
        db,
        user.id,
        shop_id,
    )

    return LoyaltyAccountOut.model_validate(
        account
    )


# ─────────────────────────────────────────────────────────────
# Loyalty Transactions
# ─────────────────────────────────────────────────────────────

@router.get(
    "/me/transactions",
    response_model=list[LoyaltyTransactionOut],
)
async def my_loyalty_transactions(
    shop_id: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ] = None,
    user: Annotated[
        User,
        Depends(require_roles("customer", "admin")),
    ] = None,
) -> list[LoyaltyTransactionOut]:
    account = await ensure_loyalty_account(
        db,
        user.id,
        shop_id,
    )

    stmt = (
        select(LoyaltyTransaction)
        .where(
            LoyaltyTransaction.account_id
            == account.id
        )
        .order_by(
            LoyaltyTransaction.created_at.desc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    transactions = (
        await db.execute(stmt)
    ).scalars().all()

    return [
        LoyaltyTransactionOut.model_validate(
            transaction
        )
        for transaction in transactions
    ]


# ─────────────────────────────────────────────────────────────
# Redeem Points
# ─────────────────────────────────────────────────────────────

@router.post(
    "/me/redeem",
    response_model=LoyaltyAccountOut,
)
async def redeem_points(
    payload: LoyaltyRedeemRequest,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(require_roles("customer", "admin")),
    ],
) -> LoyaltyAccountOut:
    if payload.points <= 0:
        raise HTTPException(
            status_code=400,
            detail="Points must be greater than 0",
        )

    account = await ensure_loyalty_account(
        db,
        user.id,
        payload.shop_id,
    )

    if account.points_balance < payload.points:
        raise HTTPException(
            status_code=400,
            detail="Insufficient points",
        )

    account.points_balance -= payload.points

    await create_transaction(
        db=db,
        account_id=account.id,
        points=-payload.points,
        action="redeemed",
    )

    await db.commit()
    await db.refresh(account)

    return LoyaltyAccountOut.model_validate(
        account
    )


# ─────────────────────────────────────────────────────────────
# Admin Adjust Points
# ─────────────────────────────────────────────────────────────

@router.post(
    "/admin/adjust/{customer_id}",
    response_model=LoyaltyAccountOut,
)
async def adjust_points(
    customer_id: str,
    shop_id: str,
    points: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    _: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
) -> LoyaltyAccountOut:
    if points == 0:
        raise HTTPException(
            status_code=400,
            detail="Points cannot be 0",
        )

    account = await ensure_loyalty_account(
        db,
        customer_id,
        shop_id,
    )

    updated_balance = (
        account.points_balance + points
    )

    if updated_balance < 0:
        raise HTTPException(
            status_code=400,
            detail="Points balance cannot be negative",
        )

    account.points_balance = updated_balance

    await create_transaction(
        db=db,
        account_id=account.id,
        points=points,
        action="adjusted",
    )

    await db.commit()
    await db.refresh(account)

    return LoyaltyAccountOut.model_validate(
        account
    )
