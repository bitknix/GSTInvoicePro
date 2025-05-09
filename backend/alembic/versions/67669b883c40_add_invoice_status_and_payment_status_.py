"""Add invoice status and payment status enums

Revision ID: 67669b883c40
Revises: 04b046d5c3fd
Create Date: 2025-04-17 12:17:36.884917

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


# revision identifiers, used by Alembic.
revision = '67669b883c40'
down_revision = '04b046d5c3fd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types first
    invoice_status_enum = ENUM('DRAFT', 'FINALIZED', 'SENT', 'E_INVOICE', 'GST_FILED', 'ARCHIVED', 
                             name='invoicestatus', create_type=True)
    payment_status_enum = ENUM('UNPAID', 'PARTIAL', 'PAID', 
                              name='paymentstatus', create_type=True)
    
    invoice_status_enum.create(op.get_bind())
    payment_status_enum.create(op.get_bind())
    
    # Add columns with default values
    op.add_column('invoices', sa.Column('status', sa.Enum('DRAFT', 'FINALIZED', 'SENT', 'E_INVOICE', 
                                                        'GST_FILED', 'ARCHIVED', 
                                                        name='invoicestatus'), 
                                       nullable=False, 
                                       server_default='DRAFT'))
    
    op.add_column('invoices', sa.Column('payment_status', sa.Enum('UNPAID', 'PARTIAL', 'PAID', 
                                                                name='paymentstatus'), 
                                       nullable=False, 
                                       server_default='UNPAID'))


def downgrade() -> None:
    # Drop columns first
    op.drop_column('invoices', 'payment_status')
    op.drop_column('invoices', 'status')
    
    # Drop enum types
    op.execute('DROP TYPE paymentstatus')
    op.execute('DROP TYPE invoicestatus') 