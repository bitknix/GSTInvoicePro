/**
 * Utility functions for calculating GST and other taxes for Indian invoices
 */

export interface TaxRates {
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
}

export interface TaxBreakdown {
  subTotal: number;
  discount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  grandTotal: number;
}

export interface InvoiceItem {
  id?: number;
  productId?: number;
  description: string;
  quantity: number;
  price: number;
  discount?: number;
  taxable: boolean;
  hsnCode?: string;
  total: number;
}

// State codes based on first 2 digits of GSTIN
const STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '96': 'Foreign Country', // For export invoices
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction'
};

/**
 * Determines if IGST should be applied based on source and destination states
 * IGST applies for inter-state transactions, while CGST+SGST applies for intra-state
 * @param sourceState - The state code of the seller/business
 * @param destinationState - The state code of the buyer/customer
 */
export function shouldApplyIGST(sourceState: string, destinationState: string): boolean {
  // If states are different, apply IGST
  return sourceState.toLowerCase() !== destinationState.toLowerCase();
}

/**
 * Calculate the total amount for an invoice item
 * @param item - Invoice item with quantity, price and optional discount
 */
export function calculateItemTotal(item: InvoiceItem): number {
  const quantity = item.quantity || 0;
  const price = item.price || 0;
  const discount = item.discount || 0;
  
  return quantity * price * (1 - discount / 100);
}

/**
 * Calculate tax breakdown for a single item
 * @param item - Invoice item
 * @param taxRates - Tax rates to apply
 * @param applyIGST - Whether to apply IGST or CGST+SGST
 */
export function calculateItemTaxes(
  item: InvoiceItem, 
  taxRates: TaxRates, 
  applyIGST: boolean
): {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
} {
  const { cgstRate, sgstRate, igstRate, cessRate } = taxRates;
  
  // If item is not taxable, return zero taxes
  if (!item.taxable) {
    return {
      taxableAmount: item.total,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      cessAmount: 0
    };
  }
  
  const taxableAmount = item.total;
  
  // Apply either IGST or CGST+SGST based on states
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  
  if (applyIGST) {
    igstAmount = taxableAmount * (igstRate / 100);
  } else {
    cgstAmount = taxableAmount * (cgstRate / 100);
    sgstAmount = taxableAmount * (sgstRate / 100);
  }
  
  // Calculate cess if applicable
  const cessAmount = taxableAmount * (cessRate / 100);
  
  return {
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount
  };
}

/**
 * Calculate complete tax breakdown for an invoice
 * @param items - List of invoice items
 * @param taxRates - Tax rates to apply
 * @param applyIGST - Whether to apply IGST or CGST+SGST
 * @param additionalDiscount - Optional additional discount on the entire invoice
 */
export function calculateInvoiceTaxes(
  items: InvoiceItem[],
  taxRates: TaxRates,
  applyIGST: boolean,
  additionalDiscount: number = 0
): TaxBreakdown {
  // Initialize tax totals
  let subTotal = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let cessAmount = 0;
  
  // Calculate subtotal from all items
  items.forEach(item => {
    const itemTotal = item.total;
    subTotal += itemTotal;
    
    // Calculate taxes for each item
    if (item.taxable) {
      const itemTaxes = calculateItemTaxes(item, taxRates, applyIGST);
      
      taxableAmount += itemTaxes.taxableAmount;
      cgstAmount += itemTaxes.cgstAmount;
      sgstAmount += itemTaxes.sgstAmount;
      igstAmount += itemTaxes.igstAmount;
      cessAmount += itemTaxes.cessAmount;
    } else {
      // Non-taxable items still contribute to taxable amount but not to taxes
      taxableAmount += itemTotal;
    }
  });
  
  // Apply additional discount if provided
  const discount = (additionalDiscount / 100) * subTotal;
  const discountedTaxableAmount = taxableAmount - discount;
  
  // Recalculate taxes after discount if needed
  if (discount > 0) {
    const discountRatio = discountedTaxableAmount / taxableAmount;
    cgstAmount *= discountRatio;
    sgstAmount *= discountRatio;
    igstAmount *= discountRatio;
    cessAmount *= discountRatio;
    taxableAmount = discountedTaxableAmount;
  }
  
  // Calculate total tax and grand total
  const totalTax = cgstAmount + sgstAmount + igstAmount + cessAmount;
  const grandTotal = taxableAmount + totalTax;
  
  return {
    subTotal,
    discount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount,
    totalTax,
    grandTotal
  };
}

/**
 * Format currency amount according to Indian Rupee format
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatIndianCurrency(amount: number, decimals: number = 2): string {
  // Handle edge cases
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  
  // Format with Indian numbering system (1,23,456.78)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return formatter.format(amount);
}

/**
 * Get default tax rates based on GST registration type
 * @param isRegistered - Whether the business is GST registered
 */
export function getDefaultTaxRates(isRegistered: boolean): TaxRates {
  if (isRegistered) {
    return {
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      cessRate: 0
    };
  } else {
    return {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cessRate: 0
    };
  }
}

/**
 * Determine tax rates based on HSN code (Harmonized System of Nomenclature)
 * Extended implementation with common Indian HSN codes
 * @param hsnCode - The HSN code of the product
 */
export function getTaxRatesByHsnCode(hsnCode: string): TaxRates | null {
  // Common HSN codes and their tax rates (expanded for more coverage)
  const hsnTaxRates: Record<string, TaxRates> = {
    // Food items - 5%
    '0401': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Milk
    '0901': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Coffee
    '0902': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Tea
    '1001': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Wheat
    '1006': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Rice
    
    // Textiles - 5%
    '5208': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Cotton fabrics
    '5310': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Jute fabrics
    '6001': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Knitted fabrics
    '6101': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Men's clothing
    '6201': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Women's clothing
    
    // Pharmaceuticals - 12%
    '3003': { cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: 0 }, // Medicaments
    '3004': { cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: 0 }, // Packaged medicine
    
    // Electronics - 18%
    '8471': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Computers
    '8517': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Telephones
    '8528': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Monitors & TVs
    '8504': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Transformers & adapters
    '8544': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Cables & wires
    
    // Luxury items - 28%
    '8703': { cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 1 }, // Cars
    '2203': { cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 5 }, // Beer
    '2204': { cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 5 }, // Wine
    '2402': { cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 5 }, // Cigarettes
    '7113': { cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 3 }, // Jewelry
    
    // Services - 18%
    '9971': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Financial services
    '9973': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Leasing services
    '9983': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // IT services
    '9984': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Research & development
    '9985': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Support services
    '9987': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Maintenance & repair
    '9997': { cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0 }, // Other services
    
    // Restaurant services - 5%
    '9963': { cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: 0 }, // Food & beverage services
  };
  
  // If first 4 digits match (common practice for GST), return the corresponding rate
  const hsnPrefix = hsnCode.substring(0, 4);
  
  // Check for exact match first
  if (hsnTaxRates[hsnCode]) {
    return hsnTaxRates[hsnCode];
  }
  // Then check for prefix match
  else if (hsnTaxRates[hsnPrefix]) {
    return hsnTaxRates[hsnPrefix];
  }
  
  // Default to 18% GST if not found (most common rate)
  return {
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    cessRate: 0
  };
}

/**
 * Convert number to words (for invoice amounts)
 * @param amount - The amount to convert to words
 */
export function numberToWords(amount: number): string {
  if (isNaN(amount)) return 'Zero Rupees Only';
  
  // Split the amount into rupees and paise
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  if (rupees === 0) {
    return paise > 0 ? `${convertToWords(paise)} Paise Only` : 'Zero Rupees Only';
  }
  
  if (paise === 0) {
    return `${convertToWords(rupees)} Rupees Only`;
  }
  
  return `${convertToWords(rupees)} Rupees and ${convertToWords(paise)} Paise Only`;
}

/**
 * Helper function to convert numbers to words
 */
const convertToWords = (num: number): string => {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return '';
  
  if (num < 20) return units[num];
  
  if (num < 100) {
    return `${tens[Math.floor(num / 10)]} ${units[num % 10]}`.trim();
  }
  
  if (num < 1000) {
    return `${units[Math.floor(num / 100)]} Hundred ${convertToWords(num % 100)}`.trim();
  }
  
  if (num < 100000) {
    return `${convertToWords(Math.floor(num / 1000))} Thousand ${convertToWords(num % 1000)}`.trim();
  }
  
  if (num < 10000000) {
    return `${convertToWords(Math.floor(num / 100000))} Lakh ${convertToWords(num % 100000)}`.trim();
  }
  
  return `${convertToWords(Math.floor(num / 10000000))} Crore ${convertToWords(num % 10000000)}`.trim();
};

/**
 * Calculate GST based on amount and tax rate
 * @param amount - Taxable amount
 * @param taxRate - GST rate percentage
 * @param isSameState - Whether buyer and seller are in same state
 */
export function calculateGST(amount: number, taxRate: number, isSameState: boolean) {
  if (isNaN(amount) || isNaN(taxRate)) {
    return {
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    };
  }
  
  const taxableAmount = amount;
  
  if (isSameState) {
    // Same state: Split tax into CGST and SGST
    const halfTaxRate = taxRate / 2;
    const cgst = (taxableAmount * halfTaxRate) / 100;
    const sgst = cgst;
    const total = taxableAmount + cgst + sgst;
    
    return {
      taxableAmount,
      cgst,
      sgst,
      igst: 0,
      total
    };
  } else {
    // Different state: Apply IGST
    const igst = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + igst;
    
    return {
      taxableAmount,
      cgst: 0,
      sgst: 0,
      igst,
      total
    };
  }
}

/**
 * Calculate line item total with tax
 * @param quantity - Quantity of the item
 * @param rate - Rate per unit
 * @param taxRate - GST rate percentage
 * @param isSameState - Whether buyer and seller are in same state
 */
export function calculateLineItemTotal(quantity: number, rate: number, taxRate: number, isSameState: boolean) {
  if (isNaN(quantity) || isNaN(rate) || quantity <= 0 || rate <= 0) {
    return {
      amount: 0,
      taxAmount: 0,
      total: 0
    };
  }
  
  const amount = quantity * rate;
  const gst = calculateGST(amount, taxRate, isSameState);
  const taxAmount = isSameState ? (gst.cgst + gst.sgst) : gst.igst;
  
  return {
    amount,
    taxAmount,
    total: amount + taxAmount
  };
}

/**
 * Calculate reverse charge mechanism (RCM) tax
 * @param amount - Taxable amount
 * @param taxRate - GST rate percentage
 * @param isSameState - Whether buyer and seller are in same state
 */
export function calculateRCM(amount: number, taxRate: number, isSameState: boolean) {
  // RCM follows the same tax calculation as regular GST
  const gst = calculateGST(amount, taxRate, isSameState);
  
  return {
    ...gst,
    isRCM: true
  };
}

// Extended interface for GSTIN validation result
interface GSTINValidationResult {
  valid: boolean;
  state?: string;
  message?: string;
  stateCode?: string;
}

// Validate GSTIN format and extract details
export function validateGSTIN(gstin: string): GSTINValidationResult {
  // Basic validation: GSTIN must be 15 characters
  if (!gstin || gstin.length !== 15) {
    return {
      valid: false,
      stateCode: undefined,
      state: undefined,
      message: 'GSTIN must be 15 characters long'
    };
  }
  
  // Extract state code (first 2 digits)
  const stateCode = gstin.substring(0, 2);
  const state = STATE_CODES[stateCode];
  
  // Check if state code is valid
  if (!state) {
    return {
      valid: false,
      stateCode,
      state: undefined,
      message: 'Invalid state code in GSTIN'
    };
  }
  
  // Additional validation: 
  // - 3rd to 12th characters: PAN of the taxpayer
  // - 13th character: Entity number of the same PAN holder
  // - 14th character: Z by default (reserved for future)
  // - 15th character: Checksum

  // Simple format validation using regex
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(gstin)) {
    return {
      valid: false,
      stateCode,
      state,
      message: 'GSTIN format is invalid'
    };
  }
  
  return {
    valid: true,
    stateCode,
    state,
    message: 'Valid GSTIN'
  };
}

/**
 * Validate HSN/SAC code
 * @param code - HSN or SAC code to validate
 * @param isService - Whether it's a service (SAC) or product (HSN)
 */
export function validateHSNSAC(code: string, isService: boolean = false): { valid: boolean; message?: string } {
  if (!code) {
    return { valid: false, message: `${isService ? 'SAC' : 'HSN'} code is required` };
  }
  
  // HSN codes can be 4, 6, or 8 digits
  const hsnRegex = isService ? /^\d{6}$/ : /^\d{4,8}$/;
  
  if (!hsnRegex.test(code)) {
    return { 
      valid: false, 
      message: isService 
        ? 'SAC code must be 6 digits' 
        : 'HSN code must be 4-8 digits'
    };
  }
  
  return { valid: true };
}

/**
 * Generate invoice number with custom format
 * @param prefix - Business prefix for invoice
 * @param financialYear - Financial year (e.g., '23-24')
 * @param sequenceNumber - Sequential invoice number
 */
export function generateInvoiceNumber(prefix: string, financialYear: string, sequenceNumber: number): string {
  // Format: XX-INV-YY-ZZZZZ
  const paddedSequence = sequenceNumber.toString().padStart(5, '0');
  return `${prefix}-INV-${financialYear}-${paddedSequence}`;
}

/**
 * Get current Indian financial year (Apr-Mar)
 */
export function getCurrentFinancialYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
  
  // If current month is January to March, financial year is previous year to current year
  // Otherwise it's current year to next year
  const fyStartYear = currentMonth <= 3 ? currentYear - 1 : currentYear;
  const fyEndYear = fyStartYear + 1;
  
  // Return format like "23-24"
  return `${(fyStartYear % 100).toString()}-${(fyEndYear % 100).toString()}`;
}

/**
 * Helper to extract state from GSTIN
 * @param gstin - The GSTIN to extract state from
 */
export function getStateFromGSTIN(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null;
  
  const stateCode = gstin.substring(0, 2);
  return STATE_CODES[stateCode] || null;
}

/**
 * Generate a NIC-compliant JSON format
 * @param invoice - The invoice object to convert to NIC format
 */
export function generateNICInvoiceJSON(invoice: Record<string, unknown>): Record<string, unknown> {
  // Convert invoice to NIC-compliant format
  // This is a simplified version - actual implementation will depend on the specific NIC requirements
  return {
    Version: "1.0",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B", // Business to Business
      RegRev: "N", // Regular/Reverse Charge
      EcmGstin: null, // E-commerce GSTIN if applicable
    },
    DocDtls: {
      Typ: "INV", // Invoice
      No: (invoice.invoice_number as string),
      Dt: new Date(invoice.invoice_date as string).toISOString().split('T')[0],
    },
    SellerDtls: {
      Gstin: (invoice.business_profile as Record<string, unknown>).gstin as string,
      LglNm: (invoice.business_profile as Record<string, unknown>).name as string,
      Addr1: (invoice.business_profile as Record<string, unknown>).address as string || "",
      Loc: (invoice.business_profile as Record<string, unknown>).city as string || "",
      Pin: parseInt((invoice.business_profile as Record<string, unknown>).pin as string || "0"),
      Stcd: (invoice.business_profile as Record<string, unknown>).state_code as string || "",
    },
    BuyerDtls: {
      Gstin: (invoice.customer as Record<string, unknown>).gstin as string || "",
      LglNm: (invoice.customer as Record<string, unknown>).name as string,
      Addr1: (invoice.customer as Record<string, unknown>).address as string || "",
      Loc: (invoice.customer as Record<string, unknown>).city as string || "",
      Pin: parseInt((invoice.customer as Record<string, unknown>).pin as string || "0"),
      Stcd: (invoice.customer as Record<string, unknown>).state_code as string || "",
    },
    ItemList: (invoice.items as Array<Record<string, unknown>>).map((item, index) => ({
      SlNo: (index + 1).toString(),
      PrdDesc: item.description as string || item.product_name as string,
      IsServc: item.is_service ? "Y" : "N",
      HsnCd: item.hsn_sac as string,
      Qty: item.quantity as number,
      Unit: "NOS", // Unit of measure
      UnitPrice: item.rate as number,
      TotAmt: (item.quantity as number) * (item.rate as number),
      Discount: item.discount as number || 0,
      AssAmt: (item.quantity as number) * (item.rate as number) - (item.discount as number || 0),
      GstRt: item.tax_rate as number,
      IgstAmt: item.igst_amount as number || 0,
      CgstAmt: item.cgst_amount as number || 0,
      SgstAmt: item.sgst_amount as number || 0,
      CesRt: 0, // Cess rate
      CesAmt: 0, // Cess amount
      TotItemVal: item.total_with_tax as number,
    })),
    ValDtls: {
      AssVal: invoice.taxable_amount as number,
      CgstVal: invoice.cgst_amount as number || 0,
      SgstVal: invoice.sgst_amount as number || 0,
      IgstVal: invoice.igst_amount as number || 0,
      CesVal: 0, // Cess value
      Discount: invoice.total_discount as number || 0,
      RndOffAmt: 0, // Rounding amount
      TotInvVal: invoice.grand_total as number,
    },
    // Add payment details if available
    PayDtls: invoice.payment_status ? {
      Nm: "Direct",
      Mode: "Cash", // Or whatever is applicable
      PayTerm: invoice.payment_status,
      PaidAmt: invoice.paid_amount as number || 0,
      PaymtDue: invoice.payment_status === "paid" ? 0 : ((invoice.grand_total as number) - (invoice.paid_amount as number || 0)),
    } : null,
  };
}

// For backward compatibility, re-export the enhanced JSON import function
export { parseNICInvoiceJSON } from './enhancedJsonImport';