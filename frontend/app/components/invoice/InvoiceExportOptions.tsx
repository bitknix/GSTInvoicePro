'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  FileSpreadsheet, 
  File,
  FileJson, 
  Printer, 
  Download,
  Share2
} from 'lucide-react';
import { generateNICInvoiceJSON } from '@/app/utils/taxCalculations';
import { toast } from 'react-toastify';

interface InvoiceExportOptionsProps {
  invoice: any;
  isDetailPage?: boolean;
}

export default function InvoiceExportOptions({ invoice, isDetailPage = false }: InvoiceExportOptionsProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  
  // Download invoice as PDF
  const downloadPDF = async () => {
    if (!invoice || !invoice.id) {
      toast.error('Invoice details not available');
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/invoices/${invoice.id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Get the PDF as blob
      const blob = await response.blob();
      
      // Create URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Download invoice as Excel
  const downloadExcel = async () => {
    if (!invoice || !invoice.id) {
      toast.error('Invoice details not available');
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/invoices/${invoice.id}/excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }
      
      // Get the Excel file as blob
      const blob = await response.blob();
      
      // Create URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to download Excel file');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Download invoice as NIC-compliant JSON
  const downloadJSON = () => {
    if (!invoice) {
      toast.error('Invoice details not available');
      return;
    }
    
    try {
      // Generate NIC-compliant JSON
      const nicJson = generateNICInvoiceJSON(invoice);
      
      // Convert to string with proper formatting
      const jsonString = JSON.stringify(nicJson, null, 2);
      
      // Create blob from JSON string
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('JSON file downloaded successfully');
    } catch (error) {
      console.error('Error generating JSON:', error);
      toast.error('Failed to generate JSON file');
    }
  };
  
  // Print invoice
  const printInvoice = () => {
    if (!invoice) {
      toast.error('Invoice details not available');
      return;
    }
    
    if (isDetailPage) {
      // If we're on the detail page, just trigger browser print
      window.print();
    } else {
      // Navigate to detail page with print parameter
      router.push(`/dashboard/invoices/${invoice.id}?print=true`);
    }
  };
  
  // Share invoice (generate shareable link)
  const shareInvoice = async () => {
    if (!invoice || !invoice.id) {
      toast.error('Invoice details not available');
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/invoices/${invoice.id}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate shareable link');
      }
      
      const data = await response.json();
      
      // Copy link to clipboard
      await navigator.clipboard.writeText(data.shareUrl);
      
      toast.success('Shareable link copied to clipboard!');
    } catch (error) {
      console.error('Error generating shareable link:', error);
      toast.error('Failed to generate shareable link');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={downloadPDF}
        disabled={isExporting}
        className="inline-flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/30 dark:hover:bg-blue-900/50"
      >
        <File className="mr-2 h-4 w-4" />
        PDF
      </button>
      
      <button
        onClick={downloadExcel}
        disabled={isExporting}
        className="inline-flex items-center rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-700/10 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-400/30 dark:hover:bg-green-900/50"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel
      </button>
      
      <button
        onClick={downloadJSON}
        disabled={isExporting}
        className="inline-flex items-center rounded-md bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-400/30 dark:hover:bg-purple-900/50"
      >
        <FileJson className="mr-2 h-4 w-4" />
        NIC JSON
      </button>
      
      <button
        onClick={printInvoice}
        className="inline-flex items-center rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-400/30 dark:hover:bg-gray-700"
      >
        <Printer className="mr-2 h-4 w-4" />
        Print
      </button>
      
      <button
        onClick={shareInvoice}
        disabled={isExporting}
        className="inline-flex items-center rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-400/30 dark:hover:bg-amber-900/50"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </button>
      
      {isExporting && (
        <div className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          Processing...
        </div>
      )}
    </div>
  );
} 