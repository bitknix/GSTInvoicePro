'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import ThemeToggle from '../../components/ThemeToggle';
import api from '../../utils/api';

// GSTIN regex pattern
const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;

// Form validation schema
const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  gstin: z.string().trim().toUpperCase()
    .refine(val => val === '' || gstinPattern.test(val), {
      message: 'Invalid GSTIN format. Format: 2 digits (state code) + 5 chars (PAN) + 4 digits + 1 char + 1 char + Z + 1 char',
    })
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type for form data
type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      gstin: '',
    }
  });

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  // Handle form submission
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...userData } = data;
      
      // If GSTIN is empty string, set it to undefined
      // This will be serialized to null when sent to the API
      if (userData.gstin === '') {
        userData.gstin = undefined;
      }
      
      console.log('Sending registration data:', userData);
      await api.register(userData);
      
      // After registration, log in automatically
      const loginResult = await api.login(data.email, data.password);
      localStorage.setItem('token', loginResult.access_token);
      
      toast.success('Registration successful! Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorDetail = error.response?.data?.detail || 'Registration failed. Please try again.';
      console.log('Error details:', errorDetail);
      toast.error(errorDetail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                Create a new account
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Or{' '}
                <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  sign in to your existing account
                </Link>
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="mt-8">
            <div className="mt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register('email')}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm`}
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      {...register('password')}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm`}
                    />
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      {...register('confirmPassword')}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm`}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="gstin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    GSTIN (Optional)
                  </label>
                  <div className="mt-1">
                    <input
                      id="gstin"
                      type="text"
                      {...register('gstin')}
                      placeholder="15-character GSTIN"
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.gstin ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm`}
                    />
                    {errors.gstin && (
                      <p className="mt-2 text-sm text-red-600">{errors.gstin.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Format: 2 digits (state code) + 5 chars (PAN) + 4 digits + 1 char + 1 char + Z + 1 char
                    </p>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      'Create account'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="relative flex-1 hidden w-0 lg:block">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-900">
          <div className="flex items-center justify-center h-full px-12 text-white">
            <div className="max-w-xl">
              <h2 className="text-4xl font-bold">GSTInvoicePro</h2>
              <p className="mt-3 text-xl">
                Register now to create GST-compliant invoices for your Indian business.
              </p>
              <ul className="mt-6 space-y-2 text-lg">
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Auto-calculate CGST, SGST, & IGST
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Store multiple business profiles
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Monthly tax summaries
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 