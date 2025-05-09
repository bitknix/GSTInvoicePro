'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import Link from 'next/link';
import api from '@/app/utils/api';

// Define validation schema with dynamic gstin validation
const createCustomerSchema = (isIndianCustomer: boolean) => {
  return z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    gstin: isIndianCustomer 
      ? z.string().length(15, 'GSTIN must be exactly 15 characters').optional().or(z.literal(''))
      : z.string().optional().or(z.literal('')),
    address: z.string().min(5, 'Address must be at least 5 characters'),
    city: z.string().min(2, 'City must be at least 2 characters'),
    state: z.string().min(2, 'State must be at least 2 characters'),
    country: z.string().min(2, 'Country must be at least 2 characters').default('India'),
    pincode: z.string().regex(/^\d{4,10}$/, 'Pincode must be 4-10 digits'),
    phone: z.string().regex(/^\+?[0-9\s()-]{7,20}$/, 'Enter a valid phone number').optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().or(z.literal(''))
  });
};

interface Customer {
  id: number;
  name: string;
  gstin?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isIndianCustomer, setIsIndianCustomer] = useState(true);
  
  // Initialize form
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(createCustomerSchema(isIndianCustomer))
  });
  
  // Watch for country changes
  const country = watch('country');
  
  useEffect(() => {
    // Update validation schema when country changes
    const isIndia = country === 'India';
    setIsIndianCustomer(isIndia);
    
    // Set GSTIN to URP if not India, otherwise clear it
    if (!isIndia) {
      setValue('gstin', 'URP');
    } else {
      setValue('gstin', '');
    }
  }, [country, setValue]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch customer data
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const data = await api.getCustomer(parseInt(customerId));
        if (data) {
          // Update isIndianCustomer state based on data
          setIsIndianCustomer(data.country === 'India');
          
          // Pre-populate form with customer data
          reset({
            name: data.name,
            gstin: data.gstin || '',
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country || 'India',
            pincode: data.pincode,
            phone: data.phone || '',
            email: data.email || '',
            notes: data.notes || ''
          });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError(true);
        toast.error('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId, router, reset]);
  
  // Handle form submission
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      await api.updateCustomer(parseInt(customerId), data);
      toast.success('Customer updated successfully');
      router.push(`/dashboard/customers/${customerId}`);
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Customer Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The customer you are trying to edit doesn&apos;t exist or was deleted.
          </p>
          <Link
            href="/dashboard/customers"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Customer
        </h1>
        <div className="mt-4 md:mt-0">
          <Link
            href={`/dashboard/customers/${customerId}`}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Name *
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
              )}
            </div>
            
            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country *
              </label>
              <input
                id="country"
                type="text"
                {...register('country')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.country.message}</p>
              )}
            </div>
            
            {/* GSTIN - only show for Indian customers */}
            {isIndianCustomer && (
              <div>
                <label htmlFor="gstin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  id="gstin"
                  type="text"
                  placeholder="15-character GSTIN"
                  {...register('gstin')}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
                {errors.gstin && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gstin.message}</p>
                )}
              </div>
            )}
            
            {/* Address */}
            <div className={isIndianCustomer ? "md:col-span-1" : "md:col-span-2"}>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address *
              </label>
              <textarea
                id="address"
                rows={3}
                {...register('address')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address.message}</p>
              )}
            </div>
            
            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City *
              </label>
              <input
                id="city"
                type="text"
                {...register('city')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city.message}</p>
              )}
            </div>
            
            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State/Province *
              </label>
              <input
                id="state"
                type="text"
                {...register('state')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.state && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.state.message}</p>
              )}
            </div>
            
            {/* Pincode */}
            <div>
              <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pincode/Postal Code *
              </label>
              <input
                id="pincode"
                type="text"
                placeholder="Postal/ZIP code"
                {...register('pincode')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.pincode && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pincode.message}</p>
              )}
            </div>
            
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone (Optional)
              </label>
              <input
                id="phone"
                type="text"
                placeholder="Phone number with country code"
                {...register('phone')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone.message}</p>
              )}
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email (Optional)
              </label>
              <input
                id="email"
                type="email"
                placeholder="customer@example.com"
                {...register('email')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>
            
            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                {...register('notes')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.notes.message}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Link
              href={`/dashboard/customers/${customerId}`}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 