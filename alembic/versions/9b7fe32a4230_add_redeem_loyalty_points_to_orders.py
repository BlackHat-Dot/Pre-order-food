"""Add redeem_loyalty_points to orders

Revision ID: 9b7fe32a4230
Revises: 6afa6355808e
Create Date: 2026-05-17 23:29:12.161713

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9b7fe32a4230'
down_revision = '6afa6355808e'  # 🔑 Linearized parent: points to the review migration head
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Safely inject the new loyalty tracking column without touching any other tables
    op.add_column(
        'orders', 
        sa.Column('redeem_loyalty_points', sa.Integer(), server_default=sa.text('0'), nullable=False)
    )


def downgrade() -> None:
    # Drops the loyalty column if rolling back configuration changes
    op.drop_column('orders', 'redeem_loyalty_points')