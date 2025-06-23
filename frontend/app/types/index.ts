// User types
export interface User {
  id: number;
  email: string;
  gstin?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at?: string;
}

// Business profile types
export interface BusinessProfile {
  id: number;
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  logo_url?: string;
  signature_url?: string;
  user_id: number;
  current_invoice_number: number;
  created_at: string;
  updated_at?: string;
}

export interface BusinessProfileCreate {
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  logo_url?: string;
  signature_url?: string;
}

// Customer types
export interface Customer {
  id: number;
  name: string;
  gstin?: string;
  address: string;
  state: string;
  email?: string;
  phone?: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
}

export interface CustomerCreate {
  name: string;
  gstin?: string;
  address: string;
  state: string;
  email?: string;
  phone?: string;
}

// Product types
export interface Product {
  id: number;
  name: string;
  hsn_sac: string;
  is_service: boolean;
  tax_rate: number;
  unit: string;
  description?: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductCreate {
  name: string;
  hsn_sac: string;
  is_service: boolean;
  tax_rate: number;
  unit: string;
  description?: string;
}

// Invoice types
export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  business_profile_id: number;
  customer_id: number;
  notes?: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  cgst_total?: number;
  sgst_total?: number;
  igst_total?: number;
  tax_type: string;
  
  // Status fields
  status: 'draft' | 'published' | 'approved';
  payment_status: 'unpaid' | 'partial' | 'paid';
  
  // New fields
  document_type: 'Invoice' | 'Credit Note' | 'Debit Note';
  supply_type: 'B2B' | 'B2C' | 'Export with Tax' | 'Export without Tax' | 'SEZ with Tax' | 'SEZ without Tax';
  reference_number?: string;
  place_of_supply?: string;
  dispatch_from?: string;
  ship_to?: string;
  currency?: string;
  port_of_export?: string;
  discount_amount?: number;
  round_off?: number;
  
  created_at: string;
  updated_at?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  rate: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  tax_type: string;
  
  // New fields
  hsn_sac?: string;
  description?: string;
  discount_percent?: number;
  discount_amount?: number;
  is_service?: boolean;
}

export interface InvoiceItemCreate {
  product_id: number;
  quantity: number;
  hsn_sac: string;
  rate: number;
  tax_rate: number;
  description?: string;
  discount_percent?: number;
  discount_amount?: number;
  is_service?: boolean;
}

export interface InvoiceCreate {
  invoice_date: string;
  due_date: string;
  business_profile_id: number;
  customer_id: number;
  notes?: string;
  
  // New fields
  document_type?: 'Invoice' | 'Credit Note' | 'Debit Note';
  supply_type?: 'B2B' | 'B2C' | 'Export with Tax' | 'Export without Tax' | 'SEZ with Tax' | 'SEZ without Tax';
  reference_number?: string;
  place_of_supply?: string;
  dispatch_from?: string;
  ship_to?: string;
  currency?: string;
  port_of_export?: string;
  discount_amount?: number;
  round_off?: number;
  
  items: InvoiceItemCreate[];
}

// Monthly summary type
export interface MonthlySummary {
  year: number;
  month: number;
  business_profile_id?: number;
  total_invoices: number;
  total_taxable_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  total_amount: number;
} 