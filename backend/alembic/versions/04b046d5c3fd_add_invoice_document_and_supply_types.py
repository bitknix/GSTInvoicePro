"""Add invoice document and supply types

Revision ID: 04b046d5c3fd
Revises: a8854cba8f6c
Create Date: 2024-06-17 23:30:30.830582

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '04b046d5c3fd'
down_revision: Union[str, None] = 'a8854cba8f6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types first
    document_type = postgresql.ENUM('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', name='documenttype')
    document_type.create(op.get_bind())
    
    supply_type = postgresql.ENUM('B2B', 'B2C', 'EXPORT_WITH_TAX', 'EXPORT_WITHOUT_TAX', 
                                'SEZ_WITH_TAX', 'SEZ_WITHOUT_TAX', name='supplytype')
    supply_type.create(op.get_bind())
    
    # Add columns to invoice table
    op.add_column('invoices', sa.Column('document_type', sa.Enum('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', name='documenttype'), 
                                      nullable=False, server_default='INVOICE'))
    op.add_column('invoices', sa.Column('supply_type', sa.Enum('B2B', 'B2C', 'EXPORT_WITH_TAX', 'EXPORT_WITHOUT_TAX', 
                                                           'SEZ_WITH_TAX', 'SEZ_WITHOUT_TAX', name='supplytype'), 
                                      nullable=False, server_default='B2B'))
    op.add_column('invoices', sa.Column('reference_number', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('place_of_supply', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('dispatch_from', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('ship_to', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('currency', sa.String(), nullable=True, server_default='INR'))
    op.add_column('invoices', sa.Column('port_of_export', sa.String(), nullable=True))
    op.add_column('invoices', sa.Column('discount_amount', sa.Float(), nullable=True, server_default='0'))
    op.add_column('invoices', sa.Column('round_off', sa.Float(), nullable=True, server_default='0'))
    
    # Add columns to invoice items table
    op.add_column('invoice_items', sa.Column('hsn_sac', sa.String(), nullable=True))
    op.add_column('invoice_items', sa.Column('description', sa.String(), nullable=True))
    op.add_column('invoice_items', sa.Column('discount_percent', sa.Float(), nullable=True, server_default='0'))
    op.add_column('invoice_items', sa.Column('discount_amount', sa.Float(), nullable=True, server_default='0'))


def downgrade() -> None:
    # Drop invoice items columns
    op.drop_column('invoice_items', 'discount_amount')
    op.drop_column('invoice_items', 'discount_percent')
    op.drop_column('invoice_items', 'description')
    op.drop_column('invoice_items', 'hsn_sac')
    
    # Drop invoice columns
    op.drop_column('invoices', 'round_off')
    op.drop_column('invoices', 'discount_amount')
    op.drop_column('invoices', 'port_of_export')
    op.drop_column('invoices', 'currency')
    op.drop_column('invoices', 'ship_to')
    op.drop_column('invoices', 'dispatch_from')
    op.drop_column('invoices', 'place_of_supply')
    op.drop_column('invoices', 'reference_number')
    op.drop_column('invoices', 'supply_type')
    op.drop_column('invoices', 'document_type')
    
    # Drop enum types
    op.execute("DROP TYPE supplytype")
    op.execute("DROP TYPE documenttype") 