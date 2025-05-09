'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { formatIndianCurrency, numberToWords } from '../../utils/taxCalculations';
import api from '../../utils/api';
import { generateFallbackPdf } from '../../utils/pdfFallback';

interface InvoiceDetailProps {
  invoice: any;
  onStatusChange?: (newStatus: string) => void;
}

export default function InvoiceDetail({ invoice, onStatusChange }: InvoiceDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState({
    pdf: false,
    json: false,
    delete: false,
    status: false
  });

  const isEditable = !invoice?.status || invoice?.status === 'draft' || invoice?.status === 'Draft';
  const isPublished = invoice?.status === 'published' || invoice?.status === 'Published';
  const isApproved = invoice?.status === 'approved' || invoice?.status === 'Approved';

  // Helper to determine badge color based on status
  const getStatusBadgeClass = () => {
    switch (invoice?.status) {
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle downloading PDF
  const handleDownloadPdf = async () => {
    if (!invoice?.id) {
      toast.error('Cannot download PDF: Invoice ID is missing');
      return;
    }
    
    setLoading({ ...loading, pdf: true });
    try {
      console.log(`Starting PDF download for invoice ID: ${invoice.id}`);
      toast.info('Generating PDF, please wait...');
      
      const pdfBlob = await api.generateInvoicePdf(invoice.id);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number || invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      toast.error(`Failed to download PDF: ${errorMessage}`);
      
      // If it's likely a backend issue, suggest a solution and use fallback
      if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
        toast.info('Falling back to browser-based PDF generation...');
        try {
          const printWindow = generateFallbackPdf(invoice);
          toast.success('PDF opened in new window. Use browser print function to save as PDF.');
        } catch (fallbackError) {
          console.error('Error with fallback PDF generation:', fallbackError);
          toast.error('Failed to generate fallback PDF. Please check if pop-ups are allowed.');
        }
      }
    } finally {
      setLoading({ ...loading, pdf: false });
    }
  };

  // Handle exporting as JSON (NIC format)
  const handleExportJson = async () => {
    if (!invoice?.id) {
      toast.error('Cannot export JSON: Invoice ID is missing');
      return;
    }
    
    setLoading({ ...loading, json: true });
    try {
      const jsonData = await api.exportInvoiceJson(invoice.id);
      
      // Convert to blob and create download link
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(jsonBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number || invoice.id}_NIC.json`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('JSON exported successfully');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Failed to export JSON');
    } finally {
      setLoading({ ...loading, json: false });
    }
  };

  // Handle invoice deletion
  const handleDelete = async () => {
    if (!invoice?.id) {
      toast.error('Cannot delete: Invoice ID is missing');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    
    setLoading({ ...loading, delete: true });
    try {
      await api.deleteInvoice(invoice.id);
      toast.success('Invoice deleted successfully');
      router.push('/dashboard/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    } finally {
      setLoading({ ...loading, delete: false });
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: 'draft' | 'published' | 'approved') => {
    if (!invoice?.id) {
      toast.error('Cannot update status: Invoice ID is missing');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to mark this invoice as ${newStatus}?`)) {
      return;
    }
    
    setLoading({ ...loading, status: true });
    try {
      await api.updateInvoiceStatus(invoice.id, newStatus);
      toast.success(`Invoice marked as ${newStatus}`);
      
      // Update local state if callback provided
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    } finally {
      setLoading({ ...loading, status: false });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden">
      {/* Invoice Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Invoice #{invoice?.invoice_number || invoice?.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {invoice?.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : 'No date'}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center">
            <span className={`px-3 py-1 text-xs rounded-full ${getStatusBadgeClass()}`}>
              {invoice?.status ? (invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)) : 'Draft'}
            </span>
            
            <div className="ml-4 flex space-x-2">
              {isEditable && (
                <button
                  onClick={() => handleStatusChange('published')}
                  disabled={loading.status}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading.status ? 'Publishing...' : 'Publish'}
                </button>
              )}
              
              {isPublished && (
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={loading.status}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading.status ? 'Approving...' : 'Approve'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Business and Customer Info */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">From</h2>
          <div className="space-y-1">
            <p className="font-medium text-gray-900 dark:text-white">{invoice?.business_profile?.name || invoice?.business_name || 'Unknown Business'}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">GSTIN: {invoice?.business_profile?.gstin || invoice?.business_gstin || 'N/A'}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{invoice?.business_profile?.address || invoice?.business_address || 'No address'}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {invoice?.business_profile?.city || invoice?.business_city || ''}, 
              {invoice?.business_profile?.state || invoice?.business_state || ''} 
              {invoice?.business_profile?.pincode || invoice?.business_pincode || ''}
            </p>
            {(invoice?.business_profile?.phone || invoice?.business_phone) && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {invoice?.business_profile?.phone || invoice?.business_phone}</p>
            )}
            {(invoice?.business_profile?.email || invoice?.business_email) && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Email: {invoice?.business_profile?.email || invoice?.business_email}</p>
            )}
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">To</h2>
          <div className="space-y-1">
            <p className="font-medium text-gray-900 dark:text-white">{invoice?.customer?.name || invoice?.customer_name || 'Unknown Customer'}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              GSTIN: {(() => {
                // If customer has a GSTIN, show it
                if (invoice?.customer?.gstin || invoice?.customer_gstin) {
                  return invoice?.customer?.gstin || invoice?.customer_gstin;
                }
                
                // Check if it's a foreign customer
                const isNonIndianCustomer = 
                  (invoice?.customer?.country && invoice?.customer?.country !== 'India') || 
                  (invoice?.customer_country && invoice?.customer_country !== 'India');
                
                // Check if it's an export or SEZ supply type
                const isExportOrSEZ = 
                  invoice?.supply_type && 
                  ['Export with Tax', 'Export without Tax', 'SEZ with Tax', 'SEZ without Tax'].includes(invoice?.supply_type);
                
                // Show URP for foreign customers or export/SEZ supply types
                if (isNonIndianCustomer || isExportOrSEZ) {
                  return 'URP';
                }
                
                // Default case
                return 'N/A';
              })()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{invoice?.customer?.address || invoice?.customer_address || 'No address'}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {invoice?.customer?.city || invoice?.customer_city || ''}, 
              {invoice?.customer?.state || invoice?.customer_state || ''} 
              {invoice?.customer?.pincode || invoice?.customer_pincode || ''}
            </p>
            {(invoice?.customer?.phone || invoice?.customer_phone) && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {invoice?.customer?.phone || invoice?.customer_phone}</p>
            )}
            {(invoice?.customer?.email || invoice?.customer_email) && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Email: {invoice?.customer?.email || invoice?.customer_email}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Invoice Details */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">HSN/SAC</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tax %</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Handle both nested items array and flattened item structure */}
              {invoice?.items && invoice.items.length > 0 ? (
                invoice.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.product_name || item.name || (item.product && item.product.name) || ''}
                      {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.hsn_sac || (item.product && item.product.hsn_sac) || item.hsn_code || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {(item.quantity || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      ₹{(item.rate || item.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {(item.tax_rate || item.tax_percent || 0).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      ₹{(item.total || item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No items found in this invoice
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Invoice Summary */}
      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="text-gray-900 dark:text-white">₹{(invoice?.taxable_amount || invoice?.subtotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          
          {/* CGST (if applicable) */}
          {(invoice?.cgst_amount > 0 || invoice?.cgst > 0) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">CGST:</span>
              <span className="text-gray-900 dark:text-white">₹{(invoice?.cgst_amount || invoice?.cgst || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          
          {/* SGST (if applicable) */}
          {(invoice?.sgst_amount > 0 || invoice?.sgst > 0) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">SGST:</span>
              <span className="text-gray-900 dark:text-white">₹{(invoice?.sgst_amount || invoice?.sgst || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          
          {/* IGST (if applicable) */}
          {(invoice?.igst_amount > 0 || invoice?.igst > 0) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">IGST:</span>
              <span className="text-gray-900 dark:text-white">₹{(invoice?.igst_amount || invoice?.igst || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          
          {/* Total Tax (if not broken down) */}
          {(!invoice?.cgst_amount && !invoice?.sgst_amount && !invoice?.igst_amount && 
           !invoice?.cgst && !invoice?.sgst && !invoice?.igst && 
           (invoice?.total_tax > 0 || invoice?.tax_amount > 0)) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Tax:</span>
              <span className="text-gray-900 dark:text-white">₹{(invoice?.total_tax || invoice?.tax_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          
          {/* Discount (if applicable) */}
          {(invoice?.total_discount > 0 || invoice?.discount_amount > 0) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Discount:</span>
              <span className="text-gray-900 dark:text-white">-₹{(invoice?.total_discount || invoice?.discount_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          
          <div className="flex justify-between text-lg font-semibold pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Total:</span>
            <span className="text-gray-900 dark:text-white">₹{(invoice?.grand_total || invoice?.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          
          {/* Amount in words */}
          {invoice?.grand_total && (
            <div className="text-sm text-gray-600 dark:text-gray-400 italic mt-2">
              {numberToWords((invoice?.grand_total || invoice?.total || 0))} Only
            </div>
          )}
        </div>
      </div>
      
      {/* Notes and Terms */}
      {(invoice?.notes || invoice?.terms) && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {invoice?.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}
          
          {invoice?.terms && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Terms & Conditions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 justify-end">
        <button
          onClick={handleDownloadPdf}
          disabled={loading.pdf}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading.pdf ? 'Downloading...' : 'Download PDF'}
        </button>
        
        <button
          onClick={handleExportJson}
          disabled={loading.json}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading.json ? 'Exporting...' : 'Export JSON'}
        </button>
        
        {isEditable && (
          <Link
            href={`/dashboard/invoices/${invoice?.id}/edit`}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            Edit Invoice
          </Link>
        )}
        
        {isEditable && (
          <button
            onClick={handleDelete}
            disabled={loading.delete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading.delete ? 'Deleting...' : 'Delete Invoice'}
          </button>
        )}
      </div>
    </div>
  );
} 