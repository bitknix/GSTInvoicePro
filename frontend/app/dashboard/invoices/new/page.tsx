'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import InvoiceForm from '@/app/components/invoice/InvoiceForm';

export default function NewInvoicePage() {
  const router = useRouter();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Invoice
        </h1>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => router.push('/dashboard/invoices')}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
      
      <InvoiceForm />
    </div>
  );
} 