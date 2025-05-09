'use client';

import React, { useState } from 'react';
import { DownloadIcon, FileIcon, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';
import { downloadJSON } from '@/app/utils/fileHelpers';

interface InvoiceExportProps {
  invoiceId: string;
  invoiceNumber: string;
  disableExport?: boolean;
}

export default function InvoiceExport({ 
  invoiceId, 
  invoiceNumber,
  disableExport = false
}: InvoiceExportProps) {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportType, setExportType] = useState<string>('');

  const handleExport = async (type: string) => {
    if (isExporting) return;
    
    setIsExporting(true);
    setExportType(type);
    
    try {
      switch (type) {
        case 'pdf':
          // Get the invoice PDF
          const response = await fetch(`/api/v1/invoices/${invoiceId}/pdf`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to generate PDF');
          }
          
          // Get the PDF as blob and open in new window
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          break;
          
        case 'json':
          // Get the invoice data and download as JSON
          const invoiceData = await api.getInvoice(parseInt(invoiceId));
          const jsonString = JSON.stringify(invoiceData, null, 2);
          const jsonBlob = new Blob([jsonString], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          
          const a = document.createElement('a');
          a.href = jsonUrl;
          a.download = `Invoice_${invoiceNumber}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(jsonUrl);
          break;
          
        case 'csv':
          // Use direct API endpoint for CSV download
          const csvUrl = `/api/v1/exports/invoice/${invoiceId}/csv`;
          window.open(csvUrl, '_blank');
          break;
          
        default:
          toast.error('Unsupported export format');
      }
      
      toast.success(`Invoice exported as ${type.toUpperCase()}`);
    } catch (error) {
      console.error(`Error exporting invoice as ${type}:`, error);
      toast.error(`Failed to export invoice as ${type.toUpperCase()}`);
    } finally {
      setIsExporting(false);
      setExportType('');
    }
  };

  // Loading state for specific export type
  const getLoadingState = (type: string) => {
    return isExporting && exportType === type ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    ) : (
      <FileIcon className="mr-2 h-4 w-4" />
    );
  };

  return (
    <div className="relative inline-block">
      <button 
        className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center"
        disabled={disableExport || isExporting}
        onClick={() => document.getElementById('export-dropdown')?.classList.toggle('hidden')}
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <DownloadIcon className="mr-2 h-4 w-4" />
        )}
        Export
      </button>
      <div 
        id="export-dropdown" 
        className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg hidden z-10 border border-gray-200"
      >
        <div className="py-1">
          <button 
            onClick={() => handleExport('pdf')} 
            disabled={isExporting}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            {getLoadingState('pdf')} Export as PDF
          </button>
          <button 
            onClick={() => handleExport('json')} 
            disabled={isExporting}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            {getLoadingState('json')} Export as JSON
          </button>
          <button 
            onClick={() => handleExport('csv')} 
            disabled={isExporting}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            {getLoadingState('csv')} Export as CSV
          </button>
        </div>
      </div>
    </div>
  );
} 