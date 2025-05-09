'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Building, Home } from 'lucide-react';
import BusinessProfileForm from '@/app/components/BusinessProfileForm';
import api from '@/app/utils/api';

export default function NewBusinessProfilePage() {
  // Set page title
  useEffect(() => {
    document.title = 'New Business Profile - GSTInvoicePro';
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <nav className="flex items-center text-sm mb-4">
        <Link href="/dashboard" className="flex items-center text-blue-500 hover:text-blue-700">
          <Home className="h-4 w-4 mr-1" />
          <span>Dashboard</span>
        </Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/business-profiles" className="flex items-center text-blue-500 hover:text-blue-700">
          <Building className="h-4 w-4 mr-1" />
          <span>Business Profiles</span>
        </Link>
        <span className="mx-2">/</span>
        <span>New</span>
      </nav>

      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create Business Profile</h1>
        <p className="text-gray-500">
          Enter your business details. This information will appear on your invoices.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <BusinessProfileForm />
      </div>
    </div>
  );
} 