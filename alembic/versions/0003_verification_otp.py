"""user verification flags and OTP challenges

Revision ID: 0003_verification_otp
Revises: 0002_loyalty_shop_specific
Create Date: 2026-05-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0003_verification_otp"
down_revision = "0002_loyalty_shop_specific"
branch_labels = None
depends_on = None


def _table_exists(connection, table_name: str) -> bool:
    inspector = inspect(connection)
    return table_name in inspector.get_table_names()


def _column_exists(connection, table_name: str, column_name: str) -> bool:
    if not _table_exists(connection, table_name):
        return False
    inspector = inspect(connection)
    return column_name in [column["name"] for column in inspector.get_columns(table_name)]


def _index_exists(connection, table_name: str, index_name: str) -> bool:
    if not _table_exists(connection, table_name):
        return False
    inspector = inspect(connection)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    connection = op.get_bind()

    if not _column_exists(connection, "users", "phone_verified"):
        op.add_column(
            "users",
            sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )

    if not _column_exists(connection, "users", "email_verified"):
        op.add_column(
            "users",
            sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )

    if _table_exists(connection, "users"):
        if _column_exists(connection, "users", "phone_verified"):
            op.execute(sa.text("UPDATE users SET phone_verified = true"))
        if _column_exists(connection, "users", "email_verified"):
            op.execute(sa.text("UPDATE users SET email_verified = true WHERE email IS NOT NULL AND email != ''"))

    if not _index_exists(connection, "users", "ix_users_created_at"):
        op.create_index("ix_users_created_at", "users", ["created_at"], unique=False)

    if not _table_exists(connection, "otp_challenges"):
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

    if _table_exists(connection, "otp_challenges"):
        if not _index_exists(connection, "otp_challenges", "ix_otp_challenges_channel_target"):
            op.create_index("ix_otp_challenges_channel_target", "otp_challenges", ["channel", "target"])
        if not _index_exists(connection, "otp_challenges", "ix_otp_challenges_expires_at"):
            op.create_index("ix_otp_challenges_expires_at", "otp_challenges", ["expires_at"])


def downgrade() -> None:
    connection = op.get_bind()

    if _table_exists(connection, "otp_challenges"):
        if _index_exists(connection, "otp_challenges", "ix_otp_challenges_expires_at"):
            op.drop_index("ix_otp_challenges_expires_at", table_name="otp_challenges")
        if _index_exists(connection, "otp_challenges", "ix_otp_challenges_channel_target"):
            op.drop_index("ix_otp_challenges_channel_target", table_name="otp_challenges")
        op.drop_table("otp_challenges")

    if _index_exists(connection, "users", "ix_users_created_at"):
        op.drop_index("ix_users_created_at", table_name="users")

    if _column_exists(connection, "users", "email_verified"):
        op.drop_column("users", "email_verified")
    if _column_exists(connection, "users", "phone_verified"):
        op.drop_column("users", "phone_verified")
