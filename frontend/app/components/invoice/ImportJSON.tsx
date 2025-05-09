'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileJson, Upload, CheckCircle, AlertCircle, FileCheck } from 'lucide-react';
import { parseNICInvoiceJSON, isApprovedEInvoice, extractIRNDetails } from '@/app/utils/enhancedJsonImport';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';

// Import the Invoice interface
interface Invoice {
  id?: number;
  invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  customer_id: number;
  business_profile_id: number;
  taxable_amount: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  total_tax: number;
  total_discount?: number;
  grand_total: number;
  notes?: string;
  terms?: string;
  status: 'draft' | 'published' | 'approved';
  payment_status: 'unpaid' | 'partial' | 'paid';
  paid_amount?: number;
  items: InvoiceItem[];
  document_type: 'Invoice' | 'Credit Note' | 'Debit Note';
  supply_type: 'B2B' | 'B2C' | 'Export with Tax' | 'Export without Tax' | 'SEZ with Tax' | 'SEZ without Tax';
}

interface InvoiceItem {
  id?: number;
  product_id?: number;
  product_name: string;
  description?: string;
  hsn_sac: string;
  quantity: number;
  rate: number;
  discount?: number;
  tax_rate: number;
  total: number;
  is_service: boolean;
}

export default function ImportJSON() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    setValidationErrors([]);
    setParsedData(null);
    
    try {
      // Read file as text
      const text = await file.text();
      
      // Try to parse JSON
      const jsonData = JSON.parse(text);
      
      // Validate and parse NIC-compliant JSON
      const result = parseNICInvoiceJSON(jsonData);
      
      if (result.success) {
        setParsedData(result.data);
        toast.success('JSON parsed successfully');
      } else {
        setError(result.error || 'Invalid JSON format');
        toast.error('Error parsing JSON file');
      }
    } catch (err: any) {
      console.error('Error reading JSON file:', err);
      setError(err.message || 'Error reading JSON file');
      toast.error('Error reading JSON file');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Perform additional validation
  const validateData = () => {
    const errors: string[] = [];
    
    // Check required fields
    if (!parsedData.invoice_number) {
      errors.push('Invoice number is missing');
    }
    
    if (!parsedData.invoice_date) {
      errors.push('Invoice date is missing');
    }
    
    // Check business profile
    if (!parsedData.business_profile?.gstin) {
      errors.push('Seller GSTIN is missing');
    }
    
    if (!parsedData.business_profile?.name) {
      errors.push('Seller name is missing');
    }
    
    // Check customer
    if (!parsedData.customer?.name) {
      errors.push('Customer name is missing');
    }
    
    // Check items
    if (!parsedData.items || parsedData.items.length === 0) {
      errors.push('Invoice items are missing');
    } else {
      parsedData.items.forEach((item: any, index: number) => {
        if (!item.product_name) {
          errors.push(`Item #${index + 1}: Product name is missing`);
        }
        
        if (!item.hsn_sac) {
          errors.push(`Item #${index + 1}: HSN/SAC code is missing`);
        }
        
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item #${index + 1}: Invalid quantity`);
        }
        
        if (!item.rate || item.rate < 0) {
          errors.push(`Item #${index + 1}: Invalid rate`);
        }
      });
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };
  
  // Save the imported invoice
  const saveInvoice = async () => {
    if (!parsedData) {
      toast.error('No data to save');
      return;
    }
    
    // Validate data before saving
    if (!validateData()) {
      toast.error('Please fix the validation errors before saving');
      return;
    }
    
    setIsUploading(true);
    try {
      // Define invoice status types
      type InvoiceStatus = 'draft' | 'published' | 'approved';
      type PaymentStatus = 'unpaid' | 'partial' | 'paid';
      
      // Determine the invoice status based on IRN details
      let invoiceStatus: InvoiceStatus = 'draft';
      if (parsedData.irn_details) {
        // If the invoice has IRN details, it's an approved e-invoice
        invoiceStatus = 'approved';
      }
      
      // Convert parsedData to API format
      const invoiceData = {
        invoice_number: parsedData.invoice_number,
        invoice_date: parsedData.invoice_date,
        due_date: parsedData.due_date || parsedData.invoice_date, // Use invoice date as fallback
        business_profile_id: parsedData.business_profile_id,
        customer_id: parsedData.customer_id,
        notes: parsedData.notes || '',
        items: parsedData.items.map((item: any) => ({
          product_id: item.product_id,
          hsn_sac: item.hsn_sac,
          quantity: item.quantity,
          rate: item.rate,
          tax_rate: item.tax_rate,
          discount: item.discount || 0,
          is_service: item.is_service || false,
          description: item.description || '',
          total: (item.quantity || 0) * (item.rate || 0),
          product_name: item.product_name || 'Unnamed Product'
        })),
        status: invoiceStatus,
        taxable_amount: parsedData.taxable_amount || 0,
        total_tax: parsedData.total_tax || 0,
        grand_total: parsedData.grand_total || 0,
        payment_status: parsedData.payment_status || 'unpaid' as PaymentStatus,
        paid_amount: parsedData.paid_amount || 0,
        document_type: parsedData.document_type || 'Invoice',
        supply_type: determineSupplyType(parsedData),
        
        // Preserve IRN details if present
        irn: parsedData.irn_details?.irn,
        ack_no: parsedData.irn_details?.ack_no,
        ack_date: parsedData.irn_details?.ack_date,
        
        // Preserve e-way bill details if present
        ewb_no: parsedData.ewb_details?.ewb_no,
        ewb_date: parsedData.ewb_details?.ewb_date,
        ewb_valid_till: parsedData.ewb_details?.ewb_valid_till,
        
        // Add QR code data if present
        qr_code: parsedData.qr_code || null,
        
        // Add signed invoice data if present
        signed_invoice: parsedData.signed_invoice || null,
        
        // Add imported flag to indicate this was imported from external source
        is_imported: true
      };
      
      // Call API to create invoice with type assertion
      const createData = invoiceData as unknown as Omit<Invoice, 'id'>;
      const response = await api.createInvoice(createData);
      
      toast.success('Invoice imported successfully');
      
      // Navigate to the created invoice
      router.push(`/dashboard/invoices/${response.id}`);
    } catch (err) {
      console.error('Error saving imported invoice:', err);
      toast.error('Failed to save invoice');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Open file dialog
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Determine supply type based on parsed data
  const determineSupplyType = (data: any) => {
    // Implement logic to determine supply type based on parsed data
    // For example:
    if (data.export_type === 'with_tax') {
      return 'Export with Tax';
    } else if (data.export_type === 'without_tax') {
      return 'Export without Tax';
    } else if (data.supply_type === 'sez') {
      return 'SEZ with Tax';
    } else if (data.supply_type === 'sez_without_tax') {
      return 'SEZ without Tax';
    } else {
      return 'B2B';
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Import Invoice from NIC-compliant JSON
      </h2>
      
      <div className="space-y-4">
        {/* File upload area */}
        <div 
          onClick={triggerFileInput}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            ${error ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
            hover:border-blue-400 dark:hover:border-blue-600 transition-colors
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <FileJson className="h-10 w-10 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
          
          <p className="text-gray-700 dark:text-gray-300 mb-1">
            {error ? (
              <span className="text-red-500 dark:text-red-400 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </span>
            ) : parsedData ? (
              <span className="text-green-500 dark:text-green-400 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                File parsed successfully
              </span>
            ) : (
              'Click to select a JSON file or drag and drop here'
            )}
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Must be a valid NIC-compliant e-Invoice JSON file
          </p>
        </div>
        
        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mt-4">
            <h3 className="text-red-800 dark:text-red-400 font-medium mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Validation Errors
            </h3>
            <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* IRN Details for approved e-invoices */}
        {parsedData?.irn_details && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mt-4">
            <h3 className="text-green-800 dark:text-green-400 font-medium mb-2 flex items-center">
              <FileCheck className="h-4 w-4 mr-1" />
              Approved e-Invoice Detected
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700 dark:text-green-300">
              <p><span className="font-medium">IRN:</span> {parsedData.irn_details.irn}</p>
              <p><span className="font-medium">Ack No:</span> {parsedData.irn_details.ack_no}</p>
              <p><span className="font-medium">Ack Date:</span> {parsedData.irn_details.ack_date}</p>
              <p><span className="font-medium">Status:</span> {parsedData.irn_details.status}</p>
              {parsedData.ewb_details && (
                <>
                  <p><span className="font-medium">E-way Bill No:</span> {parsedData.ewb_details.ewb_no}</p>
                  <p><span className="font-medium">Valid Till:</span> {parsedData.ewb_details.ewb_valid_till}</p>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Parsed data preview */}
        {parsedData && (
          <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">Invoice Preview</h3>
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Invoice Details</h4>
                  <p className="text-sm"><span className="font-medium">Number:</span> {parsedData.invoice_number}</p>
                  <p className="text-sm"><span className="font-medium">Date:</span> {parsedData.invoice_date}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</h4>
                  <p className="text-sm"><span className="font-medium">Name:</span> {parsedData.customer?.name}</p>
                  {parsedData.customer?.gstin && (
                    <p className="text-sm"><span className="font-medium">GSTIN:</span> {parsedData.customer.gstin}</p>
                  )}
                </div>
              </div>
              
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Items ({parsedData.items?.length || 0})</h4>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">HSN/SAC</th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Rate</th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Tax %</th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {parsedData.items?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">{item.product_name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">{item.hsn_sac}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300 text-right">₹{item.rate.toFixed(2)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300 text-right">{item.tax_rate}%</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300 text-right">₹{(item.total_with_tax || (item.quantity * item.rate)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Total:</td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-300">₹{parsedData.grand_total?.toFixed(2) || '0.00'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-end mt-4 space-x-3">
          <button
            type="button"
            onClick={triggerFileInput}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {parsedData ? 'Change File' : 'Select File'}
          </button>
          
          {parsedData && (
            <button
              type="button"
              onClick={saveInvoice}
              disabled={isUploading || validationErrors.length > 0}
              className={`
                px-4 py-2 rounded-md text-sm font-medium text-white
                ${validationErrors.length > 0 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'}
              `}
            >
              {isUploading ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Invoice
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 