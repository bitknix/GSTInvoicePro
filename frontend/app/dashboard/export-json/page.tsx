'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

// Define an interface for invoice data
interface Invoice {
  id: number;
  invoice_number?: string;
  invoice_date: string;
  customer?: {
    name: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export default function ExportJsonPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [exportingInvoice, setExportingInvoice] = useState<boolean>(false);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);

  // Fetch invoices on component mount
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await api.getInvoices();
        setInvoices(data || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Handle invoice selection change
  const handleInvoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    setSelectedInvoiceId(isNaN(id) ? null : id);
    setJsonPreview(null); // Clear previous preview
  };

  // Generate JSON preview
  const generatePreview = async () => {
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice first');
      return;
    }

    setExportingInvoice(true);
    try {
      const jsonData = await api.exportInvoiceJson(selectedInvoiceId);
      setJsonPreview(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.error('Error generating JSON preview:', error);
      toast.error('Failed to generate JSON preview');
    } finally {
      setExportingInvoice(false);
    }
  };

  // Handle JSON export/download
  const handleExport = async () => {
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice first');
      return;
    }

    if (!jsonPreview) {
      await generatePreview();
    }

    try {
      // Create a blob from the JSON data
      const jsonBlob = new Blob([jsonPreview || '{}'], { type: 'application/json' });
      const url = window.URL.createObjectURL(jsonBlob);
      
      // Get selected invoice details for the filename
      const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);
      const invoiceNumber = selectedInvoice?.invoice_number || selectedInvoiceId;
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceNumber}_NIC.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('JSON exported successfully');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Failed to export JSON');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Export Invoice to JSON</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Export an invoice to JSON format following the NIC (Government of India) e-Invoice schema.
        </p>
        
        {/* Invoice Selection */}
        <div className="mb-6">
          <label htmlFor="invoice-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Invoice
          </label>
          
          {loading ? (
            <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          ) : invoices.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                No invoices found. Create an invoice first before exporting.
              </p>
            </div>
          ) : (
            <select
              id="invoice-select"
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              onChange={handleInvoiceChange}
              value={selectedInvoiceId || ''}
            >
              <option value="">Select an invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  Invoice #{invoice.invoice_number || invoice.id} - {invoice.customer?.name || 'Unknown Customer'} ({new Date(invoice.invoice_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            type="button"
            onClick={generatePreview}
            disabled={!selectedInvoiceId || loading || exportingInvoice}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {exportingInvoice ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Preview'
            )}
          </button>
          
          <button
            type="button"
            onClick={handleExport}
            disabled={!selectedInvoiceId || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            Download JSON
          </button>
        </div>
        
        {/* JSON Preview */}
        {jsonPreview && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">JSON Preview</h3>
            <div className="relative">
              <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4 text-xs font-mono text-gray-800 dark:text-gray-300 overflow-x-auto max-h-96">
                {jsonPreview}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(jsonPreview);
                  toast.success('JSON copied to clipboard');
                }}
                className="absolute top-2 right-2 p-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
                title="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Information about NIC format */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h3 className="text-md font-medium text-blue-800 dark:text-blue-400 mb-2">About NIC e-Invoice Format</h3>
          <p className="text-sm text-blue-600 dark:text-blue-300 mb-2">
            The NIC (National Informatics Centre) e-Invoice format is the standard JSON schema used by the Government of India for GST e-invoicing.
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            This exported JSON file can be used to:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-600 dark:text-blue-300 mt-1 ml-2">
            <li>Submit to the government e-Invoice portal</li>
            <li>Import into other GST-compliant accounting software</li>
            <li>Archive for compliance purposes</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 