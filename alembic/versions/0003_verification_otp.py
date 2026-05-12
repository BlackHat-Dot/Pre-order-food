"""user verification flags and OTP challenges

Revision ID: 0003_verification_otp
Revises: 0002_loyalty_shop_specific
Create Date: 2026-05-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_verification_otp"
down_revision = "0002_loyalty_shop_specific"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    # Existing rows before this migration: treat as already verified so logins keep working.
    op.execute(sa.text("UPDATE users SET phone_verified = true"))
    op.execute(sa.text("UPDATE users SET email_verified = true WHERE email IS NOT NULL AND email != ''"))

    op.create_index("ix_users_created_at", "users", ["created_at"], unique=False)

    op.create_table(
        "otp_challenges",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("channel", sa.String(length=16), nullable=False),
        sa.Column("target", sa.String(length=255), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resend_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.create_index("ix_otp_challenges_channel_target", "otp_challenges", ["channel", "target"])
    op.create_index("ix_otp_challenges_expires_at", "otp_challenges", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_otp_challenges_expires_at", table_name="otp_challenges")
    op.drop_index("ix_otp_challenges_channel_target", table_name="otp_challenges")
    op.drop_table("otp_challenges")
    op.drop_index("ix_users_created_at", table_name="users")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "phone_verified")
