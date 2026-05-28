from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.order import Order
from app.models.review import Review
from app.models.shop import Shop
from app.models.user import User
from app.schemas.review import (
    ReviewCreate,
    ReviewOut,
    ReviewUpdate,
)
from app.utils.ids import new_id

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"],
)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

async def get_review_or_404(
    db: AsyncSession,
    review_id: str,
) -> Review:
    review = await db.get(
        Review,
        review_id,
    )

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found",
        )

    return review


async def get_shop_or_404(
    db: AsyncSession,
    shop_id: str,
) -> Shop:
    shop = await db.get(
        Shop,
        shop_id,
    )

    if not shop:
        raise HTTPException(
            status_code=404,
            detail="Shop not found",
        )

    return shop


async def get_review_with_customer(
    db: AsyncSession,
    review_id: str,
) -> Review:
    stmt = (
        select(Review)
        .options(
            selectinload(Review.customer)
        )
        .where(Review.id == review_id)
    )

    review = (
        await db.execute(stmt)
    ).scalar_one_or_none()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found",
        )

    return review


async def recompute_shop_rating(
    db: AsyncSession,
    shop_id: str,
) -> None:
    stmt = select(
        func.coalesce(
            func.avg(Review.rating),
            0,
        ),
        func.count(Review.id),
    ).where(Review.shop_id == shop_id)

    avg_rating, total_reviews = (
        await db.execute(stmt)
    ).one()

    shop = await db.get(
        Shop,
        shop_id,
    )

    if not shop:
        return

    shop.rating_avg = float(
        avg_rating or 0
    )

    shop.rating_count = int(
        total_reviews or 0
    )

    await db.commit()


async def verify_review_owner(
    user: User,
    customer_id: str,
) -> None:
    if (
        user.role == "customer"
        and customer_id != user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )


# ─────────────────────────────────────────────────────────────
# Create Review From Order
# ─────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ReviewOut,
    status_code=201,
)
async def create_review(
    payload: ReviewCreate,
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
) -> ReviewOut:
    order = await db.get(
        Order,
        payload.order_id,
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    await verify_review_owner(
        user,
        order.customer_id,
    )

    is_review_allowed = (
        order.status in {
            "ready",
            "completed",
        }
        or order.payment_status == "paid"
    )

    if not is_review_allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                "Review allowed only "
                "after payment or completion"
            ),
        )

    existing_stmt = select(Review).where(
        Review.order_id == order.id,
        Review.customer_id
        == order.customer_id,
    )

    existing_review = (
        await db.execute(existing_stmt)
    ).scalar_one_or_none()

    if existing_review:
        raise HTTPException(
            status_code=409,
            detail=(
                "Review already submitted"
            ),
        )

    logger.debug(
        (
            "Creating review "
            "order=%s customer=%s shop=%s"
        ),
        order.id,
        order.customer_id,
        order.shop_id,
    )

    review = Review(
        id=new_id(),
        order_id=order.id,
        shop_id=order.shop_id,
        customer_id=order.customer_id,
        rating=payload.rating,
        comment=payload.comment,
    )

    db.add(review)

    await db.commit()

    review = await get_review_with_customer(
        db,
        review.id,
    )

    await recompute_shop_rating(
        db,
        order.shop_id,
    )

    return ReviewOut.model_validate(
        review
    )


# ─────────────────────────────────────────────────────────────
# Create Shop Review
# ─────────────────────────────────────────────────────────────

@router.post(
    "/shops/{shop_id}",
    response_model=ReviewOut,
    status_code=201,
)
async def create_shop_profile_review(
    shop_id: str,
    payload: ReviewCreate,
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
) -> ReviewOut:
    await get_shop_or_404(
        db,
        shop_id,
    )

    existing_stmt = select(Review).where(
        Review.shop_id == shop_id,
        Review.customer_id == user.id,
        Review.order_id.is_(None),
    )

    existing_review = (
        await db.execute(existing_stmt)
    ).scalar_one_or_none()

    if existing_review:
        raise HTTPException(
            status_code=409,
            detail=(
                "Review already submitted "
                "for this shop"
            ),
        )

    logger.debug(
        (
            "Creating shop review "
            "shop=%s customer=%s"
        ),
        shop_id,
        user.id,
    )

    review = Review(
        id=new_id(),
        order_id=None,
        shop_id=shop_id,
        customer_id=user.id,
        rating=payload.rating,
        comment=payload.comment,
    )

    db.add(review)

    await db.commit()

    review = await get_review_with_customer(
        db,
        review.id,
    )

    await recompute_shop_rating(
        db,
        shop_id,
    )

    return ReviewOut.model_validate(
        review
    )


# ─────────────────────────────────────────────────────────────
# List Reviews
# ─────────────────────────────────────────────────────────────

@router.get(
    "/shops/{shop_id}",
    response_model=list[ReviewOut],
)
async def list_reviews(
    shop_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    page: int = Query(1, ge=1),
    page_size: int = Query(
        20,
        ge=1,
        le=100,
    ),
) -> list[ReviewOut]:
    stmt = (
        select(Review)
        .options(
            selectinload(Review.customer)
        )
        .where(Review.shop_id == shop_id)
        .order_by(
            Review.created_at.desc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    logger.debug(
        (
            "Listing reviews "
            "shop=%s page=%s size=%s"
        ),
        shop_id,
        page,
        page_size,
    )

    reviews = (
        await db.execute(stmt)
    ).scalars().all()

    return [
        ReviewOut.model_validate(
            review
        )
        for review in reviews
    ]


# ─────────────────────────────────────────────────────────────
# Update Review
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/{review_id}",
    response_model=ReviewOut,
)
async def update_review(
    review_id: str,
    payload: ReviewUpdate,
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
) -> ReviewOut:
    review = await get_review_or_404(
        db,
        review_id,
    )

    await verify_review_owner(
        user,
        review.customer_id,
    )

    updates = payload.model_dump(
        exclude_unset=True
    )

    for key, value in updates.items():
        setattr(review, key, value)

    await db.commit()

    review = await get_review_with_customer(
        db,
        review.id,
    )

    await recompute_shop_rating(
        db,
        review.shop_id,
    )

    return ReviewOut.model_validate(
        review
    )


# ─────────────────────────────────────────────────────────────
# Delete Review
# ─────────────────────────────────────────────────────────────

@router.delete(
    "/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_review(
    review_id: str,
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
) -> Response:
    review = await get_review_or_404(
        db,
        review_id,
    )

    await verify_review_owner(
        user,
        review.customer_id,
    )

    shop_id = review.shop_id

    await db.delete(review)
    await db.commit()

    await recompute_shop_rating(
        db,
        shop_id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )