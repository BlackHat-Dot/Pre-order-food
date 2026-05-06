from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.order import Order
from app.models.review import Review
from app.models.shop import Shop
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut, ReviewUpdate
from app.utils.ids import new_id


router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewOut, status_code=201)
async def create_review(
    payload: ReviewCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
) -> ReviewOut:
    order = await db.get(Order, payload.order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(403, "Forbidden")
    if order.status not in {"ready", "completed"} and order.payment_status != "paid":
        raise HTTPException(400, "Review allowed only after payment or completion")
    existing = (
        await db.execute(select(Review).where(Review.order_id == order.id, Review.customer_id == order.customer_id))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "Review already submitted for this order")

    review = Review(id=new_id(), order_id=order.id, shop_id=order.shop_id, customer_id=order.customer_id, rating=payload.rating, comment=payload.comment)
    db.add(review)
    await db.commit()
    await db.refresh(review)
    await _recompute_shop_rating(db, order.shop_id)
    return ReviewOut.model_validate(review)


@router.get("/shops/{shop_id}", response_model=list[ReviewOut])
async def list_reviews(shop_id: str, db: Annotated[AsyncSession, Depends(get_db)], page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> list[ReviewOut]:
    stmt = select(Review).where(Review.shop_id == shop_id).order_by(Review.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return [ReviewOut.model_validate(r) for r in rows]


@router.patch("/{review_id}", response_model=ReviewOut)
async def update_review(
    review_id: str,
    payload: ReviewUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
) -> ReviewOut:
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    if user.role == "customer" and review.customer_id != user.id:
        raise HTTPException(403, "Forbidden")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(review, k, v)
    await db.commit()
    await db.refresh(review)
    await _recompute_shop_rating(db, review.shop_id)
    return ReviewOut.model_validate(review)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
) -> Response:
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    if user.role == "customer" and review.customer_id != user.id:
        raise HTTPException(403, "Forbidden")
    shop_id = review.shop_id
    await db.delete(review)
    await db.commit()
    await _recompute_shop_rating(db, shop_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _recompute_shop_rating(db: AsyncSession, shop_id: str) -> None:
    avg, count = (
        await db.execute(select(func.coalesce(func.avg(Review.rating), 0), func.count(Review.id)).where(Review.shop_id == shop_id))
    ).one()
    shop = await db.get(Shop, shop_id)
    if shop:
        shop.rating_avg = float(avg or 0)
        shop.rating_count = int(count or 0)
        await db.commit()

