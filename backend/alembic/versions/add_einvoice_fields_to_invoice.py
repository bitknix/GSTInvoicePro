"""Add e-invoice fields to invoice table

Revision ID: a96e9cd4d72e
Revises: 67669b883c40
Create Date: 2025-04-20 14:45:22.923774

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


# revision identifiers, used by Alembic.
revision = 'a96e9cd4d72e'
down_revision = '67669b883c40'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update InvoiceStatus enum to add APPROVED
    # We need to use pg_enum_rename_value or create a new type and do a migration for PostgreSQL
    # For simplicity, we'll use this approach but in production you might want a more robust solution
    op.execute("ALTER TYPE invoicestatus ADD VALUE 'APPROVED' AFTER 'ARCHIVED'")
    
    # Add e-invoice fields
    op.add_column('invoices', sa.Column('irn', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('ack_no', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('ack_date', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('signed_invoice', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('qr_code', sa.String(), nullable=True))
    
    # Add e-way bill fields
    op.add_column('invoices', sa.Column('ewb_no', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('ewb_date', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('ewb_valid_till', sa.String(), nullable=True))
    
    # Add import flag
    op.add_column('invoices', sa.Column('is_imported', sa.Boolean(), nullable=True, server_default='false'))


def downgrade() -> None:
    # Drop columns
    op.drop_column('invoices', 'is_imported')
    op.drop_column('invoices', 'ewb_valid_till')
    op.drop_column('invoices', 'ewb_date')
    op.drop_column('invoices', 'ewb_no')
    op.drop_column('invoices', 'qr_code')
    op.drop_column('invoices', 'signed_invoice')
    op.drop_column('invoices', 'ack_date')
    op.drop_column('invoices', 'ack_no')
    op.drop_column('invoices', 'irn')
    
    # Note: We can't easily remove enum values in PostgreSQL, so we don't try to revert the APPROVED status 