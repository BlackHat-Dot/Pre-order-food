"""shop-specific loyalty and order loyalty fields

Revision ID: 0002_loyalty_shop_specific
Revises: 0001_initial
Create Date: 2026-05-06
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_loyalty_shop_specific"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    try:
        op.add_column("shops", sa.Column("loyalty_discount_per_point", sa.Float(), nullable=False, server_default="0.1"))
    except Exception:
        pass

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

    # Recreate loyalty_accounts table to drop old unique(customer_id) on SQLite.
    op.execute(
        """
        CREATE TABLE loyalty_accounts_new (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            customer_id VARCHAR(36) NOT NULL,
            shop_id VARCHAR(36) NOT NULL,
            points_balance INTEGER NOT NULL DEFAULT 0,
            tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            CONSTRAINT fk_loyalty_accounts_customer_id FOREIGN KEY(customer_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT fk_loyalty_accounts_shop_id FOREIGN KEY(shop_id) REFERENCES shops (id) ON DELETE CASCADE,
            CONSTRAINT uq_loyalty_accounts_customer_shop UNIQUE (customer_id, shop_id)
        )
        """
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
    op.execute("DROP TABLE loyalty_accounts")
    op.execute("ALTER TABLE loyalty_accounts_new RENAME TO loyalty_accounts")
    op.create_index("ix_loyalty_accounts_customer_shop", "loyalty_accounts", ["customer_id", "shop_id"])


def downgrade() -> None:
    op.drop_index("ix_loyalty_accounts_customer_shop", table_name="loyalty_accounts")
    op.execute(
        """
        CREATE TABLE loyalty_accounts_old (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            customer_id VARCHAR(36) NOT NULL UNIQUE,
            points_balance INTEGER NOT NULL DEFAULT 0,
            tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            FOREIGN KEY(customer_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """
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

    op.drop_column("orders", "loyalty_points_earned")
    op.drop_column("orders", "loyalty_discount_amount")
    op.drop_column("orders", "loyalty_points_used")
    op.drop_column("shops", "loyalty_discount_per_point")

