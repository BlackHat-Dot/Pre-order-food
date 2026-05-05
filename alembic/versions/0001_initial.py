"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-05-04
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False, unique=True),
        sa.Column("email", sa.String(length=255), nullable=True, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_users_role_created_at", "users", ["role", "created_at"])

    op.create_table(
        "shops",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("owner_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("address_line", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=80), nullable=False),
        sa.Column("state", sa.String(length=80), nullable=False),
        sa.Column("pincode", sa.String(length=12), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("opening_hours", sa.String(length=120), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("is_open", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_accepting_orders", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("rating_avg", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("rating_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_shops_owner_id", "shops", ["owner_id"])
    op.create_index("ix_shops_city_category", "shops", ["city", "category"])
    op.create_index("ix_shops_is_active_verified", "shops", ["is_active", "is_verified"])

    op.create_table(
        "menu_items",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("shop_id", sa.String(length=36), sa.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("dietary_type", sa.String(length=20), nullable=False),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("shop_id", "name", name="uq_menu_items_shop_name"),
    )
    op.create_index("ix_menu_items_shop_id", "menu_items", ["shop_id"])
    op.create_index("ix_menu_items_shop_available", "menu_items", ["shop_id", "is_available"])

    op.create_table(
        "menu_item_variants",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("item_id", sa.String(length=36), sa.ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("item_id", "name", name="uq_menu_item_variants_item_name"),
    )

    op.create_table(
        "orders",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("customer_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shop_id", sa.String(length=36), sa.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("total_price", sa.Float(), nullable=False),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("payment_method", sa.String(length=30), nullable=False),
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_orders_customer_id_created_at", "orders", ["customer_id", "created_at"])
    op.create_index("ix_orders_shop_id_status", "orders", ["shop_id", "status"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("order_id", sa.String(length=36), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", sa.String(length=36), sa.ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("variant_id", sa.String(length=36), sa.ForeignKey("menu_item_variants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("item_name_snapshot", sa.String(length=140), nullable=False),
        sa.Column("variant_name_snapshot", sa.String(length=60), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("order_id", sa.String(length=36), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False, server_default=sa.text("'razorpay'")),
        sa.Column("provider_order_id", sa.String(length=120), nullable=True),
        sa.Column("provider_payment_id", sa.String(length=120), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default=sa.text("'INR'")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'created'")),
        sa.Column("raw_payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_payments_order_id", "payments", ["order_id"])

    op.create_table(
        "reviews",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("order_id", sa.String(length=36), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shop_id", sa.String(length=36), sa.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("order_id", "customer_id", name="uq_reviews_order_customer"),
    )
    op.create_index("ix_reviews_shop_id_created_at", "reviews", ["shop_id", "created_at"])

    op.create_table(
        "loyalty_accounts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("customer_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("points_balance", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("tier", sa.String(length=20), nullable=False, server_default=sa.text("'bronze'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "loyalty_transactions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("account_id", sa.String(length=36), sa.ForeignKey("loyalty_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_id", sa.String(length=36), sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_loyalty_transactions_account_id_created_at", "loyalty_transactions", ["account_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_loyalty_transactions_account_id_created_at", table_name="loyalty_transactions")
    op.drop_table("loyalty_transactions")
    op.drop_table("loyalty_accounts")
    op.drop_index("ix_reviews_shop_id_created_at", table_name="reviews")
    op.drop_table("reviews")
    op.drop_index("ix_payments_order_id", table_name="payments")
    op.drop_table("payments")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_shop_id_status", table_name="orders")
    op.drop_index("ix_orders_customer_id_created_at", table_name="orders")
    op.drop_table("orders")
    op.drop_table("menu_item_variants")
    op.drop_index("ix_menu_items_shop_available", table_name="menu_items")
    op.drop_index("ix_menu_items_shop_id", table_name="menu_items")
    op.drop_table("menu_items")
    op.drop_index("ix_shops_is_active_verified", table_name="shops")
    op.drop_index("ix_shops_city_category", table_name="shops")
    op.drop_index("ix_shops_owner_id", table_name="shops")
    op.drop_table("shops")
    op.drop_index("ix_users_role_created_at", table_name="users")
    op.drop_table("users")

