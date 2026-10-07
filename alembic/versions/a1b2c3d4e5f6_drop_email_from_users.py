"""drop_email_from_users

Revision ID: a1b2c3d4e5f6
Revises: 69381600cd27
Create Date: 2026-10-07 13:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '69381600cd27'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_users_email"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS email CASCADE"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS email_verified CASCADE"))


def downgrade() -> None:
    op.add_column('users', sa.Column('email', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False))
