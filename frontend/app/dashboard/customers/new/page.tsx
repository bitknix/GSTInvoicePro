'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';
import { countries } from '@/app/data/countries';

// Define Customer type to match the API interface
type Customer = {
  id?: number;
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
};

// Define validation schema with dynamic gstin validation
const createCustomerSchema = (isIndianCustomer: boolean) => {
  return z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    gstin: isIndianCustomer 
      ? z.string().length(15, 'GSTIN must be exactly 15 characters').optional().or(z.literal(''))
      : z.string().refine(val => val === 'URP' || val === '', {
          message: "GSTIN for foreign customers must be 'URP'"
        }),
    address: z.string().min(5, 'Address must be at least 5 characters'),
    city: z.string().min(2, 'City must be at least 2 characters'),
    state: z.string().min(2, 'State must be at least 2 characters'),
    country: z.string().min(2, 'Country must be at least 2 characters'),
    pincode: isIndianCustomer
      ? z.string().regex(/^\d{4,10}$/, 'Pincode must be 4-10 digits for Indian addresses')
      : z.string().min(2, 'Postal/ZIP code is required'),
    phone: z.string().regex(/^\+?[0-9\s()-]{7,20}$/, 'Enter a valid phone number').optional().or(z.literal('')),
    email: z.union([
      z.string().email('Invalid email address'),
      z.string().length(0),
      z.literal(''),
      z.null(),
      z.undefined()
    ]).optional(),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().or(z.literal(''))
  });
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIndianCustomer, setIsIndianCustomer] = useState(true);
  
  // Initialize form with dynamic schema
  const { register, handleSubmit, formState: { errors }, control, watch, setValue } = useForm({
    resolver: zodResolver(createCustomerSchema(isIndianCustomer)),
    defaultValues: {
      country: 'India',
      gstin: ''
    }
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
    
    // For debugging
    console.log("Form validation schema updated:", {
      isIndianCustomer: isIndia,
      country
    });
  }, [country, setValue]);
  
  // Handle form submission
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // Clean the data by spreading into a new object and removing empty strings
      const filteredEntries = Object.entries(data).filter(([_, value]) => value !== '');
      const cleanedData = Object.fromEntries(filteredEntries) as Omit<Customer, 'id'>;
      
      // Log the cleaned data structure before sending to API
      console.log('Submitting customer data:', JSON.stringify(cleanedData, null, 2));
      await api.createCustomer(cleanedData);
      toast.success('Customer created successfully');
      router.push('/dashboard/customers');
    } catch (error: any) {
      console.error('Error creating customer:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        // Display more helpful error message
        if (error.response.data?.detail) {
          let errorDetail = error.response.data.detail;
          
          if (Array.isArray(errorDetail)) {
            errorDetail = errorDetail.map((err: any) => 
              `${err.loc.join('.')}: ${err.msg}`
            ).join(', ');
          }
          
          toast.error(`Validation error: ${errorDetail}`);
        } else {
          toast.error('Failed to create customer: ' + (error.message || 'Unknown error'));
        }
      } else {
        toast.error('Failed to create customer: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Customer
        </h1>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => router.push('/dashboard/customers')}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
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
              <select
                id="country"
                {...register('country')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.country.message}</p>
              )}
            </div>
            
            {/* GSTIN field - always visible but different behavior based on country */}
            <div>
              <label htmlFor="gstin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isIndianCustomer ? "GSTIN (Optional)" : "GSTIN"}
              </label>
              <input
                id="gstin"
                type="text"
                placeholder={isIndianCustomer ? "15-character GSTIN" : "URP for foreign customers"}
                {...register('gstin')}
                readOnly={!isIndianCustomer}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.gstin && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gstin.message}</p>
              )}
            </div>
            
            {/* Address */}
            <div className="md:col-span-2">
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
                placeholder="Any additional notes about this customer"
                {...register('notes')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.notes.message}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => router.push('/dashboard/customers')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 mr-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 