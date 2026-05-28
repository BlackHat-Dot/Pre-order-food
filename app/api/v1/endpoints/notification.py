from __future__ import annotations

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.utils.ids import new_id

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


MAX_NOTIFICATIONS_PER_USER = 5


class NotificationCreate(BaseModel):
    user_id: str
    message: str


async def get_notification_or_404(
    db: AsyncSession,
    notification_id: str,
) -> Notification:
    notification = await db.get(
        Notification,
        notification_id,
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    return notification


async def prune_old_notifications(
    db: AsyncSession,
    user_id: str,
) -> None:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(
            Notification.created_at.desc()
        )
    )

    notifications = (
        await db.execute(stmt)
    ).scalars().all()

    stale_notifications = notifications[
        MAX_NOTIFICATIONS_PER_USER:
    ]

    for notification in stale_notifications:
        await db.delete(notification)


# ─────────────────────────────────────────────────────────────
# Get Notifications
# ─────────────────────────────────────────────────────────────

@router.get("/me")
async def get_my_notifications(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
):
    stmt = (
        select(Notification)
        .where(
            Notification.user_id == user.id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .limit(MAX_NOTIFICATIONS_PER_USER)
    )

    notifications = (
        await db.execute(stmt)
    ).scalars().all()

    return notifications


# ─────────────────────────────────────────────────────────────
# Mark Single Notification Read
# ─────────────────────────────────────────────────────────────

@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
):
    notification = await get_notification_or_404(
        db,
        notification_id,
    )

    if notification.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    if not notification.is_read:
        notification.is_read = True
        await db.commit()

    return {"success": True}


# ─────────────────────────────────────────────────────────────
# Mark All Notifications Read
# ─────────────────────────────────────────────────────────────

@router.post(
    "/read-all",
    status_code=status.HTTP_200_OK,
)
async def mark_all_notifications_as_read(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    user: Annotated[
        User,
        Depends(get_current_user),
    ],
):
    stmt = select(Notification).where(
        Notification.user_id == user.id,
        Notification.is_read.is_(False),
    )

    notifications = (
        await db.execute(stmt)
    ).scalars().all()

    for notification in notifications:
        notification.is_read = True

    await db.commit()

    return {
        "success": True,
        "message": "Notifications marked as read",
    }


# ─────────────────────────────────────────────────────────────
# Create Notification
# ─────────────────────────────────────────────────────────────

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
)
async def create_notification(
    payload: NotificationCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
):
    notification = Notification(
        id=new_id(),
        user_id=payload.user_id,
        message=payload.message,
        is_read=False,
    )

    db.add(notification)

    await db.flush()

    await prune_old_notifications(
        db,
        payload.user_id,
    )

    await db.commit()
    await db.refresh(notification)

    return notification


# ─────────────────────────────────────────────────────────────
# Shared Utility
# ─────────────────────────────────────────────────────────────

async def prune_old_notifications_stack(
    db: AsyncSession,
    user_id: str,
) -> None:
    await prune_old_notifications(
        db,
        user_id,
    )
