/**
 * GST Tax Calculation Utilities
 * 
 * This module provides functions for GST calculations in India, handling:
 * - Intra-state (CGST + SGST)
 * - Inter-state (IGST)
 * 
 * Tax calculation follows Indian GST rules where:
 * - If origin state = destination state: Apply CGST + SGST (each half of tax rate)
 * - If origin state ≠ destination state: Apply IGST (full tax rate)
 */

/**
 * Calculate tax breakdown for a line item
 */
export interface TaxBreakdown {
  subtotal: number;   // Amount before tax
  cgst: number;       // Central GST amount
  sgst: number;       // State GST amount
  igst: number;       // Integrated GST amount
  total: number;      // Amount including tax
}

/**
 * Calculate GST for a single invoice item
 */
export function calculateItemTax(
  amount: number, 
  taxRate: number, 
  originState: string, 
  destinationState: string
): TaxBreakdown {
  // Convert percentage to decimal
  const taxRateDecimal = taxRate / 100;
  
  // Initialize values
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  
  // Determine tax type based on states
  const isSameState = originState.toUpperCase() === destinationState.toUpperCase();
  
  if (isSameState) {
    // Intra-state: Split into CGST and SGST
    cgst = amount * (taxRateDecimal / 2);
    sgst = amount * (taxRateDecimal / 2);
  } else {
    // Inter-state: Apply IGST
    igst = amount * taxRateDecimal;
  }
  
  // Calculate total
  const total = amount + cgst + sgst + igst;
  
  return {
    subtotal: amount,
    cgst: parseFloat(cgst.toFixed(2)),
    sgst: parseFloat(sgst.toFixed(2)),
    igst: parseFloat(igst.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

/**
 * Calculate GST for an entire invoice (multiple items)
 */
export interface InvoiceItem {
  quantity: number;
  rate: number;
  taxRate: number;
}

export function calculateInvoiceTax(
  items: InvoiceItem[],
  originState: string, 
  destinationState: string
): {
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  total: number;
  taxAmount: number;
  taxType: 'intra-state' | 'inter-state';
} {
  // Initialize totals
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  
  // Calculate for each item
  items.forEach(item => {
    const itemAmount = item.quantity * item.rate;
    subtotal += itemAmount;
    
    const itemTax = calculateItemTax(
      itemAmount,
      item.taxRate,
      originState,
      destinationState
    );
    
    cgstTotal += itemTax.cgst;
    sgstTotal += itemTax.sgst;
    igstTotal += itemTax.igst;
  });
  
  // Round to 2 decimal places
  subtotal = parseFloat(subtotal.toFixed(2));
  cgstTotal = parseFloat(cgstTotal.toFixed(2));
  sgstTotal = parseFloat(sgstTotal.toFixed(2));
  igstTotal = parseFloat(igstTotal.toFixed(2));
  
  // Calculate total tax amount
  const taxAmount = cgstTotal + sgstTotal + igstTotal;
  
  // Calculate grand total
  const total = subtotal + taxAmount;
  
  // Determine tax type
  const taxType = originState.toUpperCase() === destinationState.toUpperCase() 
    ? 'intra-state' 
    : 'inter-state';
    
  return {
    subtotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    total: parseFloat(total.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    taxType
  };
} 