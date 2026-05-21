from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.utils.ids import new_id

# 🚀 ADDED: Importing your baseline payload contract (adjust path if it lives in a schemas file)
from pydantic import BaseModel

class NotificationIn(BaseModel):
    user_id: str
    message: str

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ─── 🚀 1. FETCH LIVE NOTIFICATION CEILING FEED ──────────────────────────────
@router.get("/me")
async def get_my_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)]
):
    # Enforce limit 5 here so the database query doesn't work overtime scanning old items
    stmt = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ─── 🚀 2. MARK INDIVIDUAL ALERTS ──────────────────────────────────────────
@router.patch("/{notif_id}/read")
async def mark_read(
    notif_id: str, 
    db: Annotated[AsyncSession, Depends(get_db)]
):
    notif = await db.get(Notification, notif_id)
    if notif:
        notif.is_read = True
        await db.commit()
    return {"success": True}


# ─── 🚀 3. THE GLOBAL MARK ALL AS READ INTERCEPTOR ────────────────────────────
@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_as_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Select all unread notifications for the active user session context
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
    )
    unread_notifications = (await db.execute(stmt)).scalars().all()
    
    for notification in unread_notifications:
        notification.is_read = True
        
    await db.commit()
    return {"success": True, "message": "All notifications updated to read status."}


# ─── 🚀 4. DISPATCH UNIQUE MANUAL INTERNAL ALERT ──────────────────────────────
@router.post("/", status_code=201)
async def create_notification(
    payload: NotificationIn,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Fully built notification creation body wrapper
    new_notif = Notification(
        id=new_id(),
        user_id=payload.user_id,
        message=payload.message,
        is_read=False
    )
    db.add(new_notif)
    await db.flush()  # Flushes identity states out safely
    
    # Prunes stack entries exceeding index 5 instantly before the commit transaction
    await prune_old_notifications_stack(db, payload.user_id)
    
    await db.commit()
    await db.refresh(new_notif)
    return new_notif


# ─── 🚀 5. ENGINE ROOM: THE STACK CEILING BUFFER FUNCTION ─────────────────────
async def prune_old_notifications_stack(db: AsyncSession, user_id: str):
    """
    Ensures a hard limit of 5 records per user by deleting older records.
    Call this inside your order status mutation loops right when creating a notification!
    """
    # 1. Fetch all notifications ordered by creation timestamp
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
    )
    records = (await db.execute(stmt)).scalars().all()
    
    # 2. Slice anything past the index limit of 5 and prune them out of existence
    if len(records) > 5:
        stale_records = records[5:]
        for record in stale_records:
            await db.delete(record)
        # We do not use db.commit() inside utility helpers to keep parents transaction-secure!