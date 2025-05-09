/**
 * Fallback PDF generation when backend PDF generation fails
 * This creates a simple printable view that can be saved as PDF using browser print functionality
 */

export function generateFallbackPdf(invoice: any) {
  // Create a new window for the printable content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check if pop-ups are blocked.');
  }

  // Business and customer info
  const businessName = invoice?.business_profile?.name || invoice?.business_name || 'Business';
  const businessGstin = invoice?.business_profile?.gstin || invoice?.business_gstin || 'N/A';
  const businessAddress = invoice?.business_profile?.address || invoice?.business_address || '';
  
  const customerName = invoice?.customer?.name || invoice?.customer_name || 'Customer';
  const customerGstin = invoice?.customer?.gstin || invoice?.customer_gstin || 'N/A';
  const customerAddress = invoice?.customer?.address || invoice?.customer_address || '';

  // Generate items HTML
  let itemsHtml = '';
  if (invoice?.items && invoice.items.length > 0) {
    invoice.items.forEach((item: any, index: number) => {
      const itemName = item.product_name || item.name || '';
      const hsn = item.hsn_sac || '';
      const qty = item.quantity || 0;
      const rate = item.rate || item.price || 0;
      const taxRate = item.tax_rate || item.tax_percent || 0;
      const amount = item.total || item.amount || 0;
      
      itemsHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${itemName}</td>
          <td>${hsn}</td>
          <td>${qty}</td>
          <td>₹${rate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          <td>${taxRate}%</td>
          <td>₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });
  } else {
    itemsHtml = '<tr><td colspan="7" style="text-align: center;">No items found</td></tr>';
  }

  // Create HTML content
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice?.invoice_number || invoice?.id}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #eee;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        table th, table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        table th {
          background-color: #f8f8f8;
        }
        .summary {
          margin-top: 20px;
          text-align: right;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #777;
          font-size: 0.8em;
        }
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div>
            <h2>TAX INVOICE</h2>
            <p><strong>Invoice #:</strong> ${invoice?.invoice_number || invoice?.id}</p>
            <p><strong>Date:</strong> ${invoice?.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Status:</strong> ${invoice?.status || 'Draft'}</p>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h3>From:</h3>
            <p><strong>${businessName}</strong></p>
            <p>GSTIN: ${businessGstin}</p>
            <p>${businessAddress}</p>
          </div>
          
          <div>
            <h3>To:</h3>
            <p><strong>${customerName}</strong></p>
            <p>GSTIN: ${customerGstin}</p>
            <p>${customerAddress}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>SL</th>
              <th>Item</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Tax %</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="summary">
          <p><strong>Subtotal:</strong> ₹${(invoice?.taxable_amount || invoice?.subtotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          ${invoice?.cgst_amount > 0 ? `<p><strong>CGST:</strong> ₹${(invoice?.cgst_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>` : ''}
          ${invoice?.sgst_amount > 0 ? `<p><strong>SGST:</strong> ₹${(invoice?.sgst_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>` : ''}
          ${invoice?.igst_amount > 0 ? `<p><strong>IGST:</strong> ₹${(invoice?.igst_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>` : ''}
          <p style="font-size: 1.2em;"><strong>Grand Total:</strong> ₹${(invoice?.grand_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>

        ${invoice?.notes ? `
        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
          <h3>Notes:</h3>
          <p>${invoice.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p>Generated by GSTInvoicePro</p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print/Save as PDF
          </button>
          <p style="font-size: 0.8em; color: #777;">
            To save as PDF, select "Save as PDF" in the print dialog (or use your browser's print to PDF feature).
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Write to the new window and print
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  
  return printWindow;
} 