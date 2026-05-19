"""Add redeem_loyalty_points to orders

Revision ID: de6fe00ff70a
Revises: 6201befbc815
Create Date: 2026-05-18 13:47:14.706205
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'de6fe00ff70a'
down_revision = '6201befbc815'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # op.add_column('orders', sa.Column('redeem_loyalty_points', sa.INTEGER(), nullable=False, server_default='0'))
    
    # Leave the notifications table creation exactly as it is:
    op.create_table('notifications',
        sa.Column('id', sa.VARCHAR(length=36), nullable=False),
        sa.Column('user_id', sa.VARCHAR(length=36), nullable=False),
        sa.Column('title', sa.VARCHAR(length=255), nullable=False),
        sa.Column('message', sa.VARCHAR(length=1000), nullable=False),
        sa.Column('type', sa.VARCHAR(length=50), nullable=False),
        sa.Column('is_read', sa.BOOLEAN(), nullable=False, server_default='false'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_notifications_user_id_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_notifications'))
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)


def downgrade() -> None:
    # Reverse everything cleanly if rolled back
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_column('orders', 'redeem_loyalty_points')
