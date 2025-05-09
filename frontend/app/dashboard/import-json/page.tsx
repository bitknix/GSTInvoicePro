'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';
import { parseNICInvoiceJSON } from '@/app/utils/taxCalculations';

// Define interfaces for the types of data we'll handle
interface InvoiceJsonData {
  Version?: string;
  Irn?: string;
  TranDtls?: Record<string, unknown>;
  DocDtls?: {
    Typ?: string;
    No?: string;
    Dt?: string;
  };
  SellerDtls?: {
    LglNm?: string;
    Gstin?: string;
    Loc?: string;
    [key: string]: unknown;
  };
  BuyerDtls?: {
    LglNm?: string;
    Gstin?: string;
    Loc?: string;
    [key: string]: unknown;
  };
  ValDtls?: {
    AssVal?: string | number;
    CgstVal?: string | number;
    SgstVal?: string | number;
    IgstVal?: string | number;
    TotInvVal?: string | number;
    [key: string]: unknown;
  };
  ItemList?: Array<{
    Nm?: string;
    Qty?: string | number;
    AssAmt?: string | number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export default function ImportJsonPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonData, setJsonData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewData, setPreviewData] = useState<InvoiceJsonData | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please upload a valid JSON file');
      return;
    }
    
    setFileName(file.name);
    setIsUploading(true);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        setJsonData(jsonContent);
        
        // Parse and validate JSON
        const parsedData = JSON.parse(jsonContent);
        setPreviewData(parsedData);
        setIsUploading(false);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        setError('Invalid JSON format. Please check the file and try again.');
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file. Please try again.');
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };

  // Handle manual JSON input
  const handleJsonInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonData(e.target.value);
    setError('');
    
    if (!e.target.value.trim()) {
      setPreviewData(null);
      return;
    }
    
    try {
      const parsedData = JSON.parse(e.target.value);
      setPreviewData(parsedData);
    } catch {
      setError('Invalid JSON format. Please check your input and try again.');
      setPreviewData(null);
    }
  };

  // Import JSON data to create invoice
  const handleImport = async () => {
    if (!jsonData || !previewData) {
      setError('No valid JSON data to import');
      return;
    }
    
    setIsImporting(true);
    
    try {
      // First parse the JSON data to our internal format
      const parsedResult = parseNICInvoiceJSON(previewData as Record<string, unknown>);
      
      if (!parsedResult.success) {
        setError(parsedResult.error || 'Failed to parse JSON data');
        toast.error('Failed to parse JSON data');
        setIsImporting(false);
        return;
      }

      // Call API to import parsed JSON data
      const response = await api.importInvoiceJson(parsedResult.data as Record<string, unknown>);
      toast.success('Invoice imported successfully');
      
      // Navigate to the created invoice
      router.push(`/dashboard/invoices/${response.id}`);
    } catch (error: unknown) {
      console.error('Error importing invoice:', error);
      
      // Handle different error formats
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error.response as Record<string, unknown>;
        const errorData = errorResponse.data as Record<string, unknown> || {};
        
        // Try to extract the error message in a user-friendly format
        let errorMessage = 'Failed to import invoice. Please check your data format.';
        
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err: { loc: string[], msg: string }) => `${err.loc.join('.')}: ${err.msg}`)
            .join('; ');
        } else if (error instanceof Error && error.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        toast.error('Import failed: ' + errorMessage);
      } else {
        setError('Failed to import invoice. Please check your data format.');
        toast.error('Failed to import invoice');
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Handle clear
  const handleClear = () => {
    setJsonData('');
    setFileName('');
    setPreviewData(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper function to check if the preview data appears to have required invoice fields
  const isValidInvoiceJson = () => {
    if (!previewData) return false;
    
    // Basic validation - NIC format should have at least some of these fields
    const requiredFields = [
      'Version', 'Irn', 'TranDtls', 'DocDtls', 'SellerDtls', 'BuyerDtls', 'ItemList'
    ];
    
    return requiredFields.some(field => Object.prototype.hasOwnProperty.call(previewData, field));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Import Invoice from JSON</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Import a JSON file in NIC (Government of India) e-Invoice format to create a new invoice.
        </p>
        
        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload JSON File
          </label>
          <div className="mt-1 flex items-center">
            <label
              htmlFor="file-upload"
              className="cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Choose File
            </label>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={handleFileUpload}
              disabled={isUploading || isImporting}
            />
            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
              {fileName ? fileName : 'No file chosen'}
            </span>
          </div>
        </div>
        
        {/* OR Divider */}
        <div className="flex items-center my-8">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400">OR</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        
        {/* JSON Input */}
        <div className="mb-6">
          <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Paste JSON Data
          </label>
          <textarea
            id="json-input"
            rows={10}
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-3 text-sm font-mono bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-blue-500 focus:border-blue-500"
            value={jsonData}
            onChange={handleJsonInput}
            placeholder='Paste your JSON data here...'
            disabled={isUploading || isImporting}
          ></textarea>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {/* Preview */}
        {previewData && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Preview</h3>
            
            {isValidInvoiceJson() ? (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Details */}
                  {previewData.DocDtls && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Document Details</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Type: {previewData.DocDtls.Typ || 'N/A'}<br />
                        No: {previewData.DocDtls.No || 'N/A'}<br />
                        Date: {previewData.DocDtls.Dt || 'N/A'}
                      </p>
                    </div>
                  )}
                  
                  {/* Seller Details */}
                  {previewData.SellerDtls && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Seller Details</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Name: {previewData.SellerDtls.LglNm || 'N/A'}<br />
                        GSTIN: {previewData.SellerDtls.Gstin || 'N/A'}<br />
                        Location: {previewData.SellerDtls.Loc || 'N/A'}
                      </p>
                    </div>
                  )}
                  
                  {/* Buyer Details */}
                  {previewData.BuyerDtls && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Buyer Details</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Name: {previewData.BuyerDtls.LglNm || 'N/A'}<br />
                        GSTIN: {previewData.BuyerDtls.Gstin || 'N/A'}<br />
                        Location: {previewData.BuyerDtls.Loc || 'N/A'}
                      </p>
                    </div>
                  )}
                  
                  {/* Value Details */}
                  {previewData.ValDtls && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Value Details</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Taxable Value: ₹{previewData.ValDtls.AssVal || '0'}<br />
                        CGST: ₹{previewData.ValDtls.CgstVal || '0'}<br />
                        SGST: ₹{previewData.ValDtls.SgstVal || '0'}<br />
                        IGST: ₹{previewData.ValDtls.IgstVal || '0'}<br />
                        Total: ₹{previewData.ValDtls.TotInvVal || '0'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Items Summary */}
                {previewData.ItemList && previewData.ItemList.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Items ({previewData.ItemList.length})
                    </h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400">
                      {previewData.ItemList.slice(0, 3).map((item, index) => (
                        <li key={index} className="mb-1">
                          {item.Nm || `Item ${index + 1}`} - Qty: {item.Qty || '0'}, Value: ₹{item.AssAmt || '0'}
                        </li>
                      ))}
                      {previewData.ItemList.length > 3 && (
                        <li className="text-gray-500 dark:text-gray-500">
                          ...and {previewData.ItemList.length - 3} more items
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                  Warning: The JSON data doesn&apos;t appear to be in the standard NIC e-Invoice format. 
                  Import might fail or result in incomplete invoice data.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={isUploading || isImporting}
          >
            Clear
          </button>
          
          <button
            type="button"
            onClick={handleImport}
            disabled={!previewData || isUploading || isImporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isImporting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importing...
              </span>
            ) : (
              'Import Invoice'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 