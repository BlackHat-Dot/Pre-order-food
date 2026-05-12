from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OtpChallenge(Base):
    """
    Stores one active OTP per phone/email when using database-backed OTP storage.
    The real OTP is never stored — only a hash — so leaks are less dangerous.
    """

    __tablename__ = "otp_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # "phone" or "email"
    channel: Mapped[str] = mapped_column(String(16), nullable=False)
    # Normalized phone (10 digits) or lowercased email
    target: Mapped[str] = mapped_column(String(255), nullable=False)

    code_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)  # signup_phone | profile_email

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    resend_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))


Index("ix_otp_challenges_channel_target", OtpChallenge.channel, OtpChallenge.target)
Index("ix_otp_challenges_expires_at", OtpChallenge.expires_at)
