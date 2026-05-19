"""create_coupons_table

Revision ID: 9a96bdbed8ad
Revises: 9b7fe32a4230
Create Date: 2026-05-19 22:03:27.394137
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9a96bdbed8ad'
down_revision = '9b7fe32a4230'  # 🔑 FIXED: Re-chained to sit exactly after our order updates
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 🚀 CREATE THE SHAREABLE COUPONS TABLE SCHEMA
    op.create_table(
        'coupons',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('shop_id', sa.String(length=36), nullable=False),
        sa.Column('creator_id', sa.String(length=36), nullable=False),
        sa.Column('points_spent', sa.Integer(), nullable=False),
        sa.Column('discount_value', sa.Float(), nullable=False),
        sa.Column('is_redeemed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('redeemed_by_id', sa.String(length=36), nullable=True),
        sa.Column('order_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('redeemed_at', sa.DateTime(), nullable=True),
        
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['redeemed_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coupons_id'), 'coupons', ['id'], unique=False)
    op.create_index(op.f('ix_coupons_code'), 'coupons', ['code'], unique=True)


def downgrade() -> None:
    # Safely drops coupons without touching other tables
    op.drop_index(op.f('ix_coupons_code'), table_name='coupons')
    op.drop_index(op.f('ix_coupons_id'), table_name='coupons')
    op.drop_table('coupons')