import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.coupon import Coupon
from app.models.shop import Shop
from app.models.loyalty import LoyaltyAccount
from app.schemas.coupon import CouponMint, CouponOut
from app.core.deps import get_current_user
from app.models.user import User
from app.utils.ids import new_id

router = APIRouter(prefix="/coupons", tags=["Coupons"])

def generate_coupon_code(prefix: str = "VOUCH") -> str:
    """Generates a highly-scannable uppercase alphanumeric combination sequence."""
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{chars}"

@router.post("/mint", response_model=CouponOut, status_code=201)
async def mint_shop_coupon(
    payload: CouponMint,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # 1. Fetch the shop configuration rule constants
    shop = await db.get(Shop, payload.shop_id)
    if not shop:
        raise HTTPException(404, "Shop profile does not exist")
        
    discount_per_point = getattr(shop, "loyalty_discount_per_point", 0.1)

    # 2. Get the user's active loyalty wallet row for this shop
    # 🔑 FIXED: Changed LoyaltyAccount.user_id to customer_id to align with your schema profile
    stmt = select(LoyaltyAccount).where(
        LoyaltyAccount.shop_id == payload.shop_id, 
        LoyaltyAccount.customer_id == user.id
    )
    loyalty_wallet = (await db.execute(stmt)).scalar_one_or_none()
    
    if not loyalty_wallet or loyalty_wallet.points_balance < payload.points:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient points balance. Current balance: {loyalty_wallet.points_balance if loyalty_wallet else 0} pts."
        )

    # 3. Calculate financial transformation mechanics
    computed_discount = payload.points * discount_per_point

    # 4. Generate unique coupon token string asset
    shop_prefix = (shop.name[:4].upper().replace(" ", "")) if shop.name else "SHOP"
    unique_code = generate_coupon_code(prefix=shop_prefix)

    # 5. Execute core state transaction adjustments
    loyalty_wallet.points_balance -= payload.points # Deduct points
    
    new_coupon = Coupon(
        id=new_id(),
        code=unique_code,
        shop_id=payload.shop_id,
        creator_id=user.id,
        points_spent=payload.points,
        discount_value=computed_discount,
        is_redeemed=False
    )
    
    db.add(new_coupon)
    await db.commit()
    await db.refresh(new_coupon)
    
    return CouponOut.model_validate(new_coupon)

@router.get("/validate/{code}", response_model=CouponOut)
async def validate_coupon_code(
    code: str,
    shop_id: str,
    db: AsyncSession = Depends(get_db)
):
    # 🔑 FIXED: Re-targeted query to pull from the actual Coupon table by code,
    # and cleaned out the broken 'payload' / 'user' references.
    stmt = select(Coupon).where(Coupon.code == code.upper().strip())
    coupon = (await db.execute(stmt)).scalar_one_or_none()
    
    if not coupon:
        raise HTTPException(404, "Invalid voucher code combination token")
    if coupon.shop_id != shop_id:
        raise HTTPException(400, "This voucher code is locked to a different shop provider profile")
    if coupon.is_redeemed or coupon.discount_value <= 0:
        raise HTTPException(410, "This voucher string code has already been fully redeemed")
        
    return CouponOut.model_validate(coupon)