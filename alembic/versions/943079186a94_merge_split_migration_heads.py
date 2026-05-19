"""merge split migration heads

Revision ID: 943079186a94
Revises: 48e2c03c6270, 9a96bdbed8ad
Create Date: 2026-05-19 22:08:47.977176
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '943079186a94'
down_revision = ('48e2c03c6270', '9a96bdbed8ad')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

