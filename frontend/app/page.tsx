'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    // Redirect to dashboard if logged in, otherwise to login page
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  // Display loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
          GSTInvoicePro
        </h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting, please wait...</p>
      </div>
    </div>
  );
}
