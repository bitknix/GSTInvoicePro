"""Update pincode validation to allow 4-10 digits

Revision ID: 73fedcab4701
Revises: d75c9bf0440d
Create Date: 2025-04-15 18:10:12.573786

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '73fedcab4701'
down_revision = 'd75c9bf0440d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration updates the pincode validation in the schema to allow 4-10 digits
    # No database schema changes needed, only validation logic in the Pydantic models
    pass


def downgrade() -> None:
    # No database schema changes to revert
    pass 