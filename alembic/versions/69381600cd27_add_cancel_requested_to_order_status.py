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
    # 🚀 Add a counter to keep track of how many times a cancellation was rejected
    op.add_column('orders', sa.Column('cancellation_rejections', sa.Integer(), server_default='0', nullable=False))

def downgrade() -> None:
    op.drop_column('orders', 'cancellation_rejections')