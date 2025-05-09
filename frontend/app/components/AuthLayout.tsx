'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from './Navbar';
import { toast } from 'react-toastify';
import { isTokenExpired, startTokenExpiryCheck } from '../utils/apiUtils';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Token expiration check function
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        if (!pathname.includes('/auth/')) {
          router.push('/auth/login');
        }
        return;
      }
      
      if (isTokenExpired(token)) {
        // Token is expired, log out the user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only show message and redirect if not already on login page
        if (!pathname.includes('/auth/login')) {
          toast.error('Your session has expired. Please log in again.');
          router.push('/auth/login?session=expired');
        }
      }
    };

    // Initial check
    checkTokenExpiration();
    
    // Set up periodic checks using the utility function
    const intervalId = startTokenExpiryCheck();
    
    setIsLoading(false);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 