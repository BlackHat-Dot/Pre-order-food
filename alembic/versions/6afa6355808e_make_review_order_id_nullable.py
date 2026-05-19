"""make_review_order_id_nullable

Revision ID: 6afa6355808e
Revises: de6fe00ff70a
Create Date: 2026-05-19 18:48:42.317112
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6afa6355808e'
down_revision = 'de6fe00ff70a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Safely modify only the order_id constraint on the reviews table
    op.alter_column(
        'reviews', 
        'order_id',
        existing_type=sa.VARCHAR(length=36),
        nullable=True
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # Reverts the constraint change back to required if you ever roll back
    op.alter_column(
        'reviews', 
        'order_id',
        existing_type=sa.VARCHAR(length=36),
        nullable=False
    )