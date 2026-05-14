"""shop-specific loyalty and order loyalty fields

Revision ID: 0002_loyalty_shop_specific
Revises: 0001_initial
Create Date: 2026-05-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0002_loyalty_shop_specific"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _table_exists(connection, table_name: str) -> bool:
    inspector = inspect(connection)
    return table_name in inspector.get_table_names()


def _column_exists(connection, table_name: str, column_name: str) -> bool:
    inspector = inspect(connection)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def _index_exists(connection, table_name: str, index_name: str) -> bool:
    inspector = inspect(connection)
    if table_name not in inspector.get_table_names():
        return False
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    connection = op.get_bind()

    try:
        op.add_column("orders", sa.Column("loyalty_points_used", sa.Integer(), nullable=False, server_default="0"))
    except Exception:
        pass
    try:
        op.add_column("orders", sa.Column("loyalty_discount_amount", sa.Float(), nullable=False, server_default="0"))
    except Exception:
        pass
    try:
        op.add_column("orders", sa.Column("loyalty_points_earned", sa.Integer(), nullable=False, server_default="0"))
    except Exception:
        pass

    # Recreate loyalty_accounts table to drop old unique(customer_id) on SQLite and add shop_id for PostgreSQL.
    op.create_table(
        "loyalty_accounts_new",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("customer_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shop_id", sa.String(length=36), sa.ForeignKey("shops.id", ondelete="CASCADE"), nullable=False),
        sa.Column("points_balance", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("tier", sa.String(length=20), nullable=False, server_default=sa.text("'bronze'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("customer_id", "shop_id", name="uq_loyalty_accounts_customer_shop"),
    )

    op.execute(
        """
        INSERT INTO loyalty_accounts_new (id, customer_id, shop_id, points_balance, tier, created_at, updated_at)
        SELECT
            la.id,
            la.customer_id,
            COALESCE(
                la.shop_id,
                (
                    SELECT o.shop_id
                    FROM orders o
                    WHERE o.customer_id = la.customer_id
                    ORDER BY o.created_at DESC
                    LIMIT 1
                ),
                (
                    SELECT s.id
                    FROM shops s
                    ORDER BY s.created_at ASC
                    LIMIT 1
                )
            ) AS shop_id,
            la.points_balance,
            la.tier,
            la.created_at,
            la.updated_at
        FROM loyalty_accounts la
        """
    )

    op.drop_table("loyalty_accounts")
    op.execute("ALTER TABLE loyalty_accounts_new RENAME TO loyalty_accounts")

    if not _index_exists(connection, "loyalty_accounts", "ix_loyalty_accounts_customer_shop"):
        op.create_index("ix_loyalty_accounts_customer_shop", "loyalty_accounts", ["customer_id", "shop_id"])


def downgrade() -> None:
    op.drop_index("ix_loyalty_accounts_customer_shop", table_name="loyalty_accounts")
    op.create_table(
        "loyalty_accounts_old",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("customer_id", sa.String(length=36), nullable=False, unique=True),
        sa.Column("points_balance", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("tier", sa.String(length=20), nullable=False, server_default=sa.text("'bronze'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.execute(
        """
        INSERT INTO loyalty_accounts_old (id, customer_id, points_balance, tier, created_at, updated_at)
        SELECT id, customer_id, points_balance, tier, created_at, updated_at
        FROM loyalty_accounts
        """
    )
    op.execute("DROP TABLE loyalty_accounts")
    op.execute("ALTER TABLE loyalty_accounts_old RENAME TO loyalty_accounts")

    op.execute(
            """
            INSERT INTO loyalty_accounts_old (id, customer_id, points_balance, tier, created_at, updated_at)
            SELECT id, customer_id, points_balance, tier, created_at, updated_at
            FROM loyalty_accounts
            """
        )

    op.drop_table("loyalty_accounts")
    op.execute("ALTER TABLE loyalty_accounts_old RENAME TO loyalty_accounts")

    if _table_exists(connection, "orders"):
        if _column_exists(connection, "orders", "loyalty_points_earned"):
            op.drop_column("orders", "loyalty_points_earned")
        if _column_exists(connection, "orders", "loyalty_discount_amount"):
            op.drop_column("orders", "loyalty_discount_amount")
        if _column_exists(connection, "orders", "loyalty_points_used"):
            op.drop_column("orders", "loyalty_points_used")

    if _table_exists(connection, "shops") and _column_exists(connection, "shops", "loyalty_discount_per_point"):
        op.drop_column("shops", "loyalty_discount_per_point")

