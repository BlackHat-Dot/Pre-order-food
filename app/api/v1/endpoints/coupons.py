from __future__ import annotations

import random
import string
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.coupon import Coupon
from app.models.loyalty import LoyaltyAccount
from app.models.shop import Shop
from app.models.user import User
from app.schemas.coupon import CouponMint, CouponOut
from app.utils.ids import new_id
from app.api.v1.endpoints.orders import create_notification

router = APIRouter(
    prefix="/coupons",
    tags=["Coupons"],
)


def generate_coupon_code(
    prefix: str = "SHOP",
) -> str:
    characters = (
        string.ascii_uppercase + string.digits
    )

    random_part = "".join(
        random.choices(characters, k=6)
    )

    return f"{prefix}-{random_part}"


async def generate_unique_coupon_code(
    db: AsyncSession,
    prefix: str,
) -> str:
    while True:
        code = generate_coupon_code(prefix)

        existing = (
            await db.execute(
                select(Coupon.id).where(
                    Coupon.code == code
                )
            )
        ).scalar_one_or_none()

        if not existing:
            return code


async def get_coupon_by_code(
    db: AsyncSession,
    code: str,
) -> Coupon | None:
    stmt = select(Coupon).where(
        Coupon.code == code.upper().strip()
    )

    return (
        await db.execute(stmt)
    ).scalar_one_or_none()


# ─────────────────────────────────────────────────────────────
# Mint Coupon
# ─────────────────────────────────────────────────────────────

@router.post(
    "/mint",
    response_model=CouponOut,
    status_code=201,
)
async def mint_shop_coupon(
    payload: CouponMint,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> CouponOut:
    shop = await db.get(
        Shop,
        payload.shop_id,
    )

    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found",
        )

    stmt = select(LoyaltyAccount).where(
        LoyaltyAccount.shop_id == payload.shop_id,
        LoyaltyAccount.customer_id == user.id,
    )

    loyalty_account = (
        await db.execute(stmt)
    ).scalar_one_or_none()

    current_balance = (
        loyalty_account.points_balance
        if loyalty_account else 0
    )

    if (
        not loyalty_account
        or current_balance < payload.points
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient points. "
                f"Current balance: {current_balance}"
            ),
        )

    discount_per_point = getattr(
        shop,
        "loyalty_discount_per_point",
        0.1,
    )

    discount_value = (
        payload.points * discount_per_point
    )

    shop_prefix = (
        shop.name[:4].upper().replace(" ", "")
        if shop.name
        else "SHOP"
    )

    coupon_code = await generate_unique_coupon_code(
        db,
        shop_prefix,
    )

    loyalty_account.points_balance -= (
        payload.points
    )

    coupon = Coupon(
        id=new_id(),
        code=coupon_code,
        shop_id=payload.shop_id,
        creator_id=user.id,
        points_spent=payload.points,
        discount_value=discount_value,
        is_redeemed=False,
        is_active=True,
    )

    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)

    # Dispatches standard coupon activation notice context cleanly to client ledger
    await create_notification(
        db=db,
        user_id=user.id,
        title="Coupon Created",
        message=(
            f"You redeemed {payload.points} loyalty points "
            f"for coupon {coupon.code}. "
            f"Discount value: Rs. {discount_value:.2f}"
        ),
    )
    await db.commit()

    return CouponOut.model_validate(coupon)


# ─────────────────────────────────────────────────────────────
# Validate Coupon
# ─────────────────────────────────────────────────────────────

@router.get(
    "/validate/{code}",
    response_model=CouponOut,
)
async def validate_coupon_code(
    code: str,
    shop_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> CouponOut:
    coupon = await get_coupon_by_code(
        db,
        code,
    )

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    if coupon.shop_id != shop_id:
        raise HTTPException(
            status_code=400,
            detail="Coupon belongs to another shop",
        )

    if (
        hasattr(coupon, "is_active")
        and not coupon.is_active
    ):
        raise HTTPException(
            status_code=400,
            detail="Coupon is inactive",
        )

    if (
        coupon.is_redeemed
        or coupon.discount_value <= 0
    ):
        raise HTTPException(
            status_code=410,
            detail="Coupon already redeemed",
        )

    return CouponOut.model_validate(coupon)