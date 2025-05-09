'use client';

/**
 * Enhanced JSON import utilities for GSTInvoicePro
 * Supports multiple JSON formats including:
 * 1. Standard NIC e-Invoice format
 * 2. Approved JSON from GST portal with IRN and signed data
 * 3. JSON arrays containing invoice data
 * 4. Custom JSON formats with various field names
 */

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
 * Helper function to extract state from GSTIN
 * @param gstin - The GSTIN to extract state from
 */
function extractStateFromGSTIN(gstin: string): string | null {
  if (!gstin || gstin.length < 2 || gstin === 'URP') {
    return null;
  }
  
  const stateCode = gstin.substring(0, 2);
  return STATE_CODES[stateCode] || null;
}

/**
 * Helper function to safely convert values to numbers
 */
function toNumber(val: unknown): number {
  if (val === null || val === undefined) {
    return 0;
  }
  
  if (typeof val === 'number') {
    return val;
  }
  
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Helper function to format date strings to YYYY-MM-DD format
 * Handles various input formats including DD/MM/YYYY, DD-MM-YYYY, etc.
 */
function formatDateString(dateStr: string | undefined): string {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }
  
  // Check if the date is already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Handle DD/MM/YYYY format
  const ddmmyyyySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  if (ddmmyyyySlash.test(dateStr)) {
    const match = dateStr.match(ddmmyyyySlash);
    if (match) {
      const [_, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Handle DD-MM-YYYY format
  const ddmmyyyyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  if (ddmmyyyyDash.test(dateStr)) {
    const match = dateStr.match(ddmmyyyyDash);
    if (match) {
      const [_, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Try to parse with Date object as a fallback
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error("Error parsing date:", e);
  }
  
  // Return current date as fallback
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse a NIC-compliant JSON to invoice format
 * @param nicJson - The NIC-compliant JSON to parse
 */
export function parseNICInvoiceJSON(nicJson: Record<string, unknown>): { success: boolean; data?: Record<string, unknown>; error?: string } {
  try {
    // Check if this is an approved JSON from GST portal with IRN and signed data
    if (nicJson.AckNo && nicJson.Irn && (nicJson.SignedInvoice || nicJson.SignedQRCode)) {
      // This is an approved JSON from GST portal
      // Extract the embedded invoice data from SignedInvoice if available
      try {
        // The SignedInvoice is a JWT token with base64-encoded payload
        const signedInvoice = nicJson.SignedInvoice as string;
        if (signedInvoice) {
          // Extract the payload part (second part of the JWT token)
          const parts = signedInvoice.split('.');
          if (parts.length >= 2) {
            // Decode the base64 payload
            const payload = JSON.parse(atob(parts[1]));
            if (payload.data) {
              // Try to parse the data field which contains the actual invoice
              const invoiceData = JSON.parse(payload.data);
              // Process this as a standard NIC JSON
              return parseNICInvoiceJSON(invoiceData);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to extract invoice data from SignedInvoice:", e);
        // Continue with processing the outer JSON
      }
    }
    
    // First check if this is a standard NIC JSON format
    const isNICFormat = nicJson.Version && 
                        nicJson.DocDtls && 
                        nicJson.SellerDtls && 
                        nicJson.BuyerDtls && 
                        nicJson.ItemList;
    
    // Check if this is an array of invoices
    if (Array.isArray(nicJson)) {
      // Process the first invoice in the array
      if (nicJson.length > 0) {
        return parseNICInvoiceJSON(nicJson[0] as Record<string, unknown>);
      } else {
        return {
          success: false,
          error: "Empty array provided"
        };
      }
    }
    
    if (isNICFormat) {
      // Standard NIC format
      const docDtls = nicJson.DocDtls as Record<string, unknown>;
      const sellerDtls = nicJson.SellerDtls as Record<string, unknown>;
      const buyerDtls = nicJson.BuyerDtls as Record<string, unknown>;
      const valDtls = nicJson.ValDtls as Record<string, unknown> || {};
      const itemList = Array.isArray(nicJson.ItemList) ? nicJson.ItemList as Array<Record<string, unknown>> : [];
      const payDtls = nicJson.PayDtls as Record<string, unknown> | undefined;
      const dispDtls = nicJson.DispDtls as Record<string, unknown> | undefined;
      const shipDtls = nicJson.ShipDtls as Record<string, unknown> | undefined;
      const expDtls = nicJson.ExpDtls as Record<string, unknown> | undefined;
      
      if (!docDtls || !sellerDtls || !buyerDtls || !itemList.length) {
        return {
          success: false,
          error: "Missing required sections in NIC JSON format"
        };
      }

      // Process seller address - combine Addr1 and Addr2 if both exist
      let sellerAddress = sellerDtls.Addr1 as string || '';
      if (sellerDtls.Addr2) {
        sellerAddress += sellerAddress ? `, ${sellerDtls.Addr2 as string}` : sellerDtls.Addr2 as string;
      }

      // Process buyer address - combine Addr1 and Addr2 if both exist
      let buyerAddress = buyerDtls.Addr1 as string || '';
      if (buyerDtls.Addr2) {
        buyerAddress += buyerAddress ? `, ${buyerDtls.Addr2 as string}` : buyerDtls.Addr2 as string;
      }
      
      // Extract basic invoice details
      const invoiceData = {
        invoice_number: docDtls.No as string || `BP-INV-${new Date().getFullYear().toString().slice(-2)}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
        invoice_date: formatDateString(docDtls.Dt as string) || new Date().toISOString().split('T')[0],
        // Calculate due date as 30 days after invoice date
        due_date: (() => {
          // Try to extract due date from document if available
          if (docDtls.DueDt) {
            return formatDateString(docDtls.DueDt as string);
          }
          // Otherwise calculate it as 30 days after invoice date
          const invoiceDate = new Date(formatDateString(docDtls.Dt as string) || new Date().toISOString().split('T')[0]);
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + 30);
          return dueDate.toISOString().split('T')[0];
        })(),
        
        // Extract document type and supply type
        document_type: (() => {
          // Map NIC document types to our document types
          const docType = docDtls.Typ as string || '';
          if (docType === 'INV') return 'Invoice';
          if (docType === 'CRN') return 'Credit Note';
          if (docType === 'DBN') return 'Debit Note';
          return 'Invoice'; // Default
        })(),
        
        supply_type: (() => {
          // Map NIC supply types to our supply types
          const supplyType = (nicJson.TranDtls as Record<string, unknown>)?.SupTyp as string || '';
          const buyerGstin = (buyerDtls.Gstin as string || '').toUpperCase();
          const sellerStateCode = (sellerDtls.Stcd as string || '').substring(0, 2);
          const buyerStateCode = (buyerDtls.Stcd as string || '').substring(0, 2);
          
          // Check for export
          if (supplyType === 'EXPWP') return 'Export with Tax';
          if (supplyType === 'EXPWOP') return 'Export without Tax';
          
          // Check for SEZ
          if (buyerGstin && buyerGstin.includes('SEZ')) {
            return sellerStateCode === buyerStateCode ? 'SEZ with Tax' : 'SEZ without Tax';
          }
          
          // Check for B2B or B2C
          if (buyerGstin && buyerGstin !== 'URP') {
            return 'B2B';
          }
          
          return 'B2C'; // Default for unregistered customers
        })(),
        
        // Extract business profile from seller details
        business_profile_details: {
          gstin: sellerDtls.Gstin as string,
          name: sellerDtls.LglNm as string,
          trade_name: sellerDtls.TrdNm as string || sellerDtls.LglNm as string,
          address: sellerAddress,
          city: sellerDtls.Loc as string || '',
          pin: typeof sellerDtls.Pin === 'number' ? sellerDtls.Pin.toString() : (sellerDtls.Pin as string || ''),
          state_code: sellerDtls.Stcd as string || '',
          state: extractStateFromGSTIN(sellerDtls.Gstin as string) || '',
          email: sellerDtls.Em as string || '',
          phone: sellerDtls.Ph as string || '',
        },
        
        // Extract customer from buyer details
        customer_details: {
          gstin: buyerDtls.Gstin as string || '',
          name: buyerDtls.LglNm as string || 'Customer',
          trade_name: buyerDtls.TrdNm as string || buyerDtls.LglNm as string || 'Customer',
          address: buyerAddress,
          city: buyerDtls.Loc as string || '',
          pin: typeof buyerDtls.Pin === 'number' ? buyerDtls.Pin.toString() : (buyerDtls.Pin as string || ''),
          state_code: buyerDtls.Stcd as string || '',
          state: extractStateFromGSTIN(buyerDtls.Gstin as string) || '',
          email: buyerDtls.Em as string || '',
          phone: buyerDtls.Ph as string || '',
          pos: buyerDtls.Pos as string || '', // Place of Supply
        },
        
        // Add dispatch details if available
        dispatch_details: dispDtls ? {
          name: dispDtls.Nm as string || '',
          address: dispDtls.Addr1 as string || '',
          city: dispDtls.Loc as string || '',
          state_code: dispDtls.Stcd as string || '',
        } : undefined,
        
        // Add shipping details if available
        shipping_details: shipDtls ? {
          name: shipDtls.LglNm as string || '',
          address: shipDtls.Addr1 as string || '',
          city: shipDtls.Loc as string || '',
          state_code: shipDtls.Stcd as string || '',
        } : undefined,
        
        // Add export details if available
        export_details: expDtls && Object.keys(expDtls).length > 0 ? {
          foreign_currency: expDtls.ForCur as string || '',
          country_code: expDtls.CntCode as string || '',
        } : undefined,
        
        // Extract items
        items: itemList.map((item, index) => {
          const itemName = item.Nm as string || item.PrdDesc as string || `Item ${index + 1}`;
          const hsnSac = item.HsnCd as string || '';
          const quantity = toNumber(item.Qty);
          const unitPrice = toNumber(item.UnitPrice) || (toNumber(item.AssAmt) / (quantity || 1)) || 0;
          const taxRate = toNumber(item.GstRt) || 0;
          const discount = toNumber(item.Discount) || 0;
          
          return {
            product_name: itemName,
            description: item.Desc as string || itemName,
            hsn_sac: hsnSac,
            is_service: item.IsServc === "Y" || false, // SAC codes typically start with 99
            quantity: quantity || 1,
            rate: unitPrice,
            discount_percent: discount,
            tax_rate: taxRate,
            total: toNumber(item.AssAmt) || (quantity * unitPrice * (1 - discount / 100)),
          };
        }),
        
        // Extract value details
        taxable_amount: toNumber(valDtls.AssVal) || 0,
        cgst_amount: toNumber(valDtls.CgstVal) || 0,
        sgst_amount: toNumber(valDtls.SgstVal) || 0,
        igst_amount: toNumber(valDtls.IgstVal) || 0,
        total_discount: toNumber(valDtls.Discount) || 0,
        grand_total: toNumber(valDtls.TotInvVal) || 0,
        
        // Extract payment details if available
        payment_status: (payDtls?.PayTerm as string) || "unpaid",
        paid_amount: toNumber(payDtls?.PaidAmt) || 0,
        
        // Add IRN details if available from approved JSON
        irn_details: nicJson.Irn ? {
          irn: nicJson.Irn as string,
          ack_no: nicJson.AckNo as string,
          ack_date: nicJson.AckDt as string,
          status: nicJson.Status as string,
        } : undefined,
        
        // Add e-way bill details if available
        ewb_details: nicJson.EwbNo ? {
          ewb_no: nicJson.EwbNo as string,
          ewb_date: nicJson.EwbDt as string,
          ewb_valid_till: nicJson.EwbValidTill as string,
        } : undefined
      };
      
      return {
        success: true,
        data: invoiceData
      };
    } else {
      // Try to handle custom JSON format
      // This is a more generic approach to handle various JSON formats
      const invoiceData: Record<string, unknown> = {
        items: []
      };
      
      // Extract invoice number and date if available
      if (nicJson.invoice_number || nicJson.invoiceNumber || nicJson.InvoiceNumber) {
        invoiceData.invoice_number = nicJson.invoice_number || nicJson.invoiceNumber || nicJson.InvoiceNumber;
      } else {
        // Generate a placeholder invoice number in the new format: XX-INV-YY-ZZZZZ
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const randomSeq = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
        invoiceData.invoice_number = `BP-INV-${currentYear}-${randomSeq}`;
      }
      
      if (nicJson.invoice_date || nicJson.invoiceDate || nicJson.InvoiceDate) {
        invoiceData.invoice_date = formatDateString(nicJson.invoice_date as string || nicJson.invoiceDate as string || nicJson.InvoiceDate as string) || new Date().toISOString().split('T')[0];
      } else {
        invoiceData.invoice_date = new Date().toISOString().split('T')[0];
      }
      
      // Set due date
      if (nicJson.due_date || nicJson.dueDate || nicJson.DueDate) {
        invoiceData.due_date = formatDateString(nicJson.due_date as string || nicJson.dueDate as string || nicJson.DueDate as string);
      } else {
        // Calculate due date as 30 days after invoice date
        const invoiceDate = new Date(invoiceData.invoice_date as string);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        invoiceData.due_date = dueDate.toISOString().split('T')[0];
      }
      
      // Extract seller/business details
      const sellerFields = ['seller', 'business', 'supplier', 'from', 'SellerDtls', 'BusinessDetails'];
      let seller = null;
      
      for (const field of sellerFields) {
        if (nicJson[field] && typeof nicJson[field] === 'object') {
          seller = nicJson[field] as Record<string, unknown>;
          break;
        }
      }
      
      if (seller) {
        // Process seller address - combine Addr1 and Addr2 if both exist
        let sellerAddress = seller.address || seller.Address || seller.Addr1 || '';
        if (seller.Addr2) {
          sellerAddress = typeof sellerAddress === 'string' && sellerAddress 
            ? `${sellerAddress}, ${seller.Addr2}` 
            : seller.Addr2;
        }
        
        invoiceData.business_profile_details = {
          gstin: seller.gstin || seller.GSTIN || seller.Gstin || '',
          name: seller.name || seller.Name || seller.LglNm || seller.business_name || 'Business',
          trade_name: seller.trade_name || seller.TrdNm || seller.name || seller.Name || seller.LglNm || 'Business',
          address: sellerAddress,
          city: seller.city || seller.City || seller.Loc || '',
          state: seller.state || seller.State || '',
          state_code: seller.state_code || seller.StateCode || seller.Stcd || '',
          email: seller.email || seller.Email || seller.Em || '',
          phone: seller.phone || seller.Phone || seller.Ph || '',
        };
      } else {
        invoiceData.business_profile_details = {
          name: 'Your Business',
          gstin: '',
          address: '',
          city: '',
          state: '',
          state_code: '',
        };
      }
      
      // Extract buyer/customer details
      const buyerFields = ['buyer', 'customer', 'client', 'to', 'BuyerDtls', 'CustomerDetails'];
      let buyer = null;
      
      for (const field of buyerFields) {
        if (nicJson[field] && typeof nicJson[field] === 'object') {
          buyer = nicJson[field] as Record<string, unknown>;
          break;
        }
      }
      
      if (buyer) {
        // Process buyer address - combine Addr1 and Addr2 if both exist
        let buyerAddress = buyer.address || buyer.Address || buyer.Addr1 || '';
        if (buyer.Addr2) {
          buyerAddress = typeof buyerAddress === 'string' && buyerAddress 
            ? `${buyerAddress}, ${buyer.Addr2}` 
            : buyer.Addr2;
        }
        
        invoiceData.customer_details = {
          gstin: buyer.gstin || buyer.GSTIN || buyer.Gstin || '',
          name: buyer.name || buyer.Name || buyer.LglNm || buyer.customer_name || 'Customer',
          trade_name: buyer.trade_name || buyer.TrdNm || buyer.name || buyer.Name || buyer.LglNm || 'Customer',
          address: buyerAddress,
          city: buyer.city || buyer.City || buyer.Loc || '',
          state: buyer.state || buyer.State || '',
          state_code: buyer.state_code || buyer.StateCode || buyer.Stcd || '',
          email: buyer.email || buyer.Email || buyer.Em || '',
          phone: buyer.phone || buyer.Phone || buyer.Ph || '',
          pos: buyer.pos || buyer.Pos || '',
        };
      } else {
        invoiceData.customer_details = {
          name: 'Customer',
          gstin: '',
          address: '',
          city: '',
          state: '',
          state_code: '',
        };
      }
      
      // Extract items
      let items: any[] = [];
      
      if (Array.isArray(nicJson.items) || Array.isArray(nicJson.Items) || Array.isArray(nicJson.products) || Array.isArray(nicJson.Products) || Array.isArray(nicJson.ItemList)) {
        items = (nicJson.items || nicJson.Items || nicJson.products || nicJson.Products || nicJson.ItemList) as any[];
      }
      
      if (items.length > 0) {
        invoiceData.items = items.map((item) => {
          const name = item.name || item.product_name || item.description || item.PrdDesc || item.Nm || 'Product';
          const quantity = toNumber(item.quantity || item.qty || item.Qty) || 1;
          const rate = toNumber(item.rate || item.price || item.unit_price || item.UnitPrice) || 0;
          const discount = toNumber(item.discount || item.Discount) || 0;
          const tax_rate = toNumber(item.tax_rate || item.taxRate || item.gst_rate || item.GstRt) || 18;
          const unit = item.unit || item.Unit || '';
          
          // Calculate amounts if not provided
          const amount = quantity * rate;
          const discount_amount = amount * (discount / 100);
          const taxable_amount = amount - discount_amount;
          const tax_amount = taxable_amount * (tax_rate / 100);
          
          return {
            product_id: 1, // Default product ID to ensure validation passes
            product_name: name,
            is_service: item.is_service === true || item.IsServc === "Y" || false,
            hsn_sac: item.hsn_sac || item.hsn || item.HsnCd || '',
            quantity,
            rate,
            unit,
            discount,
            tax_rate,
            igst_amount: toNumber(item.igst_amount || item.IgstAmt) || 0,
            cgst_amount: toNumber(item.cgst_amount || item.CgstAmt) || 0,
            sgst_amount: toNumber(item.sgst_amount || item.SgstAmt) || 0,
            total: toNumber(item.total || item.TotAmt || item.AssAmt) || taxable_amount,
            total_with_tax: toNumber(item.total_with_tax || item.TotItemVal) || (taxable_amount + tax_amount),
          };
        });
        
        // Calculate invoice totals
        let taxable_amount = 0;
        let cgst_amount = 0;
        let sgst_amount = 0;
        let igst_amount = 0;
        let grand_total = 0;
        
        (invoiceData.items as Array<Record<string, unknown>>).forEach(item => {
          taxable_amount += toNumber(item.total);
          cgst_amount += toNumber(item.cgst_amount);
          sgst_amount += toNumber(item.sgst_amount);
          igst_amount += toNumber(item.igst_amount);
          grand_total += toNumber(item.total_with_tax);
        });
        
        invoiceData.taxable_amount = taxable_amount;
        invoiceData.cgst_amount = cgst_amount;
        invoiceData.sgst_amount = sgst_amount;
        invoiceData.igst_amount = igst_amount;
        invoiceData.grand_total = grand_total;
        invoiceData.payment_status = 'unpaid';
        invoiceData.paid_amount = 0;
      }
      
      return {
        success: true,
        data: invoiceData
      };
    }
  } catch (err) {
    console.error('Error parsing JSON:', err);
    return {
      success: false,
      error: "Failed to parse JSON. Please check the format and try again."
    };
  }
}

/**
 * Detect if the JSON is an approved e-invoice from GST portal
 * @param jsonData - JSON data to check
 */
export function isApprovedEInvoice(jsonData: Record<string, unknown>): boolean {
  return !!(jsonData.AckNo && jsonData.Irn && (jsonData.SignedInvoice || jsonData.SignedQRCode));
}

/**
 * Extract IRN details from approved e-invoice JSON
 * @param jsonData - Approved e-invoice JSON data
 */
export function extractIRNDetails(jsonData: Record<string, unknown>): Record<string, unknown> | null {
  if (!isApprovedEInvoice(jsonData)) {
    return null;
  }
  
  return {
    irn: jsonData.Irn as string,
    ack_no: jsonData.AckNo as string,
    ack_date: jsonData.AckDt as string,
    status: jsonData.Status as string,
    ewb_no: jsonData.EwbNo as string || null,
    ewb_date: jsonData.EwbDt as string || null,
    ewb_valid_till: jsonData.EwbValidTill as string || null,
  };
}
