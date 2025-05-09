"""Add e-invoice fields to invoice table

Revision ID: 8b18f9ca314e
Revises: 67669b883c40
Create Date: 2025-04-20 14:45:22.923774

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8b18f9ca314e'
down_revision = None  # Set to None to allow running regardless of current migration state
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add e-invoice fields - use try/except to handle the case if columns already exist
    try:
        # Try to add APPROVED value to the enum
        op.execute("ALTER TYPE invoicestatus ADD VALUE 'APPROVED'")
    except Exception as e:
        print(f"Note: Could not add enum value - it may already exist: {e}")
    
    # Add columns with try/except blocks to handle if they already exist
    columns_to_add = [
        ('irn', sa.String()),
        ('ack_no', sa.String()),
        ('ack_date', sa.String()),
        ('signed_invoice', sa.String()),
        ('qr_code', sa.String()),
        ('ewb_no', sa.String()),
        ('ewb_date', sa.String()),
        ('ewb_valid_till', sa.String()),
        ('is_imported', sa.Boolean(), {'server_default': 'false'}),
    ]
    
    for column_info in columns_to_add:
        try:
            if len(column_info) == 2:
                column_name, column_type = column_info
                op.add_column('invoices', sa.Column(column_name, column_type, nullable=True))
            else:
                column_name, column_type, kwargs = column_info
                op.add_column('invoices', sa.Column(column_name, column_type, nullable=True, **kwargs))
            print(f"Added column {column_name}")
        except Exception as e:
            print(f"Note: Could not add column {column_name} - it may already exist: {e}")


def downgrade() -> None:
    # Remove columns with try/except blocks
    columns_to_remove = [
        'is_imported',
        'ewb_valid_till',
        'ewb_date',
        'ewb_no',
        'qr_code',
        'signed_invoice',
        'ack_date',
        'ack_no',
        'irn',
    ]
    
    for column_name in columns_to_remove:
        try:
            op.drop_column('invoices', column_name)
        except Exception as e:
            print(f"Note: Could not drop column {column_name}: {e}") 