"""Merge multiple heads

Revision ID: 4a73b9b02bfd
Revises: 8b18f9ca314e, a96e9cd4d72e
Create Date: 2025-06-24 17:21:10.930710

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4a73b9b02bfd'
down_revision = ('8b18f9ca314e', 'a96e9cd4d72e')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 