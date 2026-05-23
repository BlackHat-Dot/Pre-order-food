"""add_cancel_requested_to_order_status

Revision ID: 69381600cd27
Revises: 6d4cb587d214
Create Date: 2026-05-23 22:24:29.723864
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '69381600cd27'
down_revision = '6d4cb587d214'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 🚀 FIXED: Safely append the cancellation_reason text column directly into your live orders table layout
    # Using batch_alter_table ensures cross-dialect schema alterations run seamlessly
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('cancellation_reason', sa.String(length=500), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_column('cancellation_reason')