"""add_user_addresses_and_order_delivery_link

Revision ID: 19d2becae06b
Revises: 943079186a94
Create Date: 2026-05-20 12:39:18.847608
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '19d2becae06b'
down_revision = '943079186a94'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. SAFELY CREATE THE NEW ADDRESSES TABLE
    op.create_table(
        'user_addresses',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=50), nullable=False),
        sa.Column('address_line', sa.String(length=500), nullable=False),
        sa.Column('landmark', sa.String(length=255), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_addresses_id'), 'user_addresses', ['id'], unique=False)
    op.create_index(op.f('ix_user_addresses_user_id'), 'user_addresses', ['user_id'], unique=False)

    # 2. SAFELY ADD THE DELIVERY COLUMN TO ORDERS
    op.add_column('orders', sa.Column('delivery_address_id', sa.String(length=36), nullable=True))
    op.create_foreign_key(
        'fk_orders_delivery_address_id',
        'orders', 'user_addresses',
        ['delivery_address_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Safely revert the changes
    op.drop_constraint('fk_orders_delivery_address_id', 'orders', type_='foreignkey')
    op.drop_column('orders', 'delivery_address_id')
    op.drop_index(op.f('ix_user_addresses_user_id'), table_name='user_addresses')
    op.drop_index(op.f('ix_user_addresses_id'), table_name='user_addresses')
    op.drop_table('user_addresses')