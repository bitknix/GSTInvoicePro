'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import InvoiceForm from '../../../../components/invoice/InvoiceForm';
import api from '../../../../utils/api';

interface EditInvoicePageProps {
  params: {
    id: string;
  };
}

// Define a proper interface for invoice data
interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  status: string;
  payment_status: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  grand_total: number;
  [key: string]: any; // For other properties that might be present
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
  const router = useRouter();
  const urlParams = useParams(); // Use the hook instead of direct params
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const invoiceId = parseInt(urlParams.id as string);

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      if (isNaN(invoiceId)) {
        setError('Invalid invoice ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await api.getInvoice(invoiceId);
        
        // Check if invoice is editable (not published or approved)
        if (data.status && data.status !== 'Draft' && data.status !== 'draft' && data.status !== undefined) {
          setError(`This invoice cannot be edited because it is ${data.status}.`);
        } else {
          setInvoice(data);
        }
      } catch (error: any) {
        console.error('Error fetching invoice:', error);
        setError(error.response?.data?.detail || 'Failed to load invoice');
        toast.error('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !invoice) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
            {error || 'Invoice not found'}
          </h2>
          <p className="text-red-500 dark:text-red-300 mb-4">
            {error ? 
              'You cannot edit this invoice.' : 
              'The invoice you are looking for doesn\'t exist or was deleted.'
            }
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Invoice
            </button>
            <button
              onClick={() => router.push('/dashboard/invoices')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Return to Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Invoice #{invoice.invoice_number || invoice.id}
        </h1>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
      
      <InvoiceForm initialData={invoice} isEditing={true} />
    </div>
  );
} 