from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction
from app.models.user import User
from app.schemas.loyalty import LoyaltyAccountOut, LoyaltyRedeemRequest, LoyaltyTransactionOut
from app.utils.ids import new_id


router = APIRouter(prefix="/loyalty", tags=["Loyalty"])


@router.get("/me", response_model=LoyaltyAccountOut)
async def my_loyalty(db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(require_roles("customer", "admin"))]) -> LoyaltyAccountOut:
    account = await _ensure_account(db, user.id)
    return LoyaltyAccountOut.model_validate(account)


@router.get("/me/transactions", response_model=list[LoyaltyTransactionOut])
async def my_loyalty_transactions(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[LoyaltyTransactionOut]:
    account = await _ensure_account(db, user.id)
    stmt = (
        select(LoyaltyTransaction)
        .where(LoyaltyTransaction.account_id == account.id)
        .order_by(LoyaltyTransaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [LoyaltyTransactionOut.model_validate(r) for r in rows]


@router.post("/me/redeem", response_model=LoyaltyAccountOut)
async def redeem_points(
    payload: LoyaltyRedeemRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
) -> LoyaltyAccountOut:
    account = await _ensure_account(db, user.id)
    if account.points_balance < payload.points:
        raise HTTPException(400, "Insufficient points")
    account.points_balance -= payload.points
    db.add(LoyaltyTransaction(id=new_id(), account_id=account.id, points=-payload.points, action="redeemed"))
    await db.commit()
    await db.refresh(account)
    return LoyaltyAccountOut.model_validate(account)


@router.post("/admin/adjust/{customer_id}", response_model=LoyaltyAccountOut)
async def adjust_points(
    customer_id: str,
    points: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("admin"))],
) -> LoyaltyAccountOut:
    account = await _ensure_account(db, customer_id)
    account.points_balance += points
    db.add(LoyaltyTransaction(id=new_id(), account_id=account.id, points=points, action="adjusted"))
    await db.commit()
    await db.refresh(account)
    return LoyaltyAccountOut.model_validate(account)


async def _ensure_account(db: AsyncSession, customer_id: str) -> LoyaltyAccount:
    stmt = select(LoyaltyAccount).where(LoyaltyAccount.customer_id == customer_id)
    account = (await db.execute(stmt)).scalar_one_or_none()
    if account:
        return account
    account = LoyaltyAccount(id=new_id(), customer_id=customer_id, points_balance=0, tier="bronze")
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account

