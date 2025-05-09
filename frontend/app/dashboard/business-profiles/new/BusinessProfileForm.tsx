'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import axios from 'axios';

// Define validation schema
const businessProfileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  gstin: z.string().length(15, 'GSTIN must be exactly 15 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State must be at least 2 characters'),
  state_code: z.string().length(2, 'State code must be exactly 2 digits'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  email: z.string().email('Invalid email address'),
  is_default: z.boolean().optional().default(false)
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

export default function BusinessProfileForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form
  const { register, handleSubmit, formState: { errors } } = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      is_default: false,
      state_code: ''
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: BusinessProfileFormData) => {
    setIsSubmitting(true);
    
    try {
      // Format data strictly according to API expectations
      const formattedData = {
        name: data.name.trim(),
        gstin: data.gstin.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        state_code: data.state_code.trim(),
        pin: data.pincode.trim(), // Server expects 'pin', not 'pincode'
        phone: data.phone.trim(),
        email: data.email.trim(),
        is_default: Boolean(data.is_default)
      };
      
      // Make direct API call with axios
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please login.');
        router.push('/auth/login');
        return;
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const API_PREFIX = '/api/v1';
      
      const response = await axios.post(
        `${API_URL}${API_PREFIX}/business-profiles/`,
        formattedData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      toast.success('Business profile created successfully');
      router.push('/dashboard/business-profiles');
    } catch (error: any) {
      console.error('Error creating business profile:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        if (error.response.status === 422) {
          const errorData = error.response.data;
          if (errorData.detail && Array.isArray(errorData.detail)) {
            const messages = errorData.detail.map((err: any) => 
              `${err.loc.slice(1).join('.')}: ${err.msg}`
            ).join('\n');
            toast.error(`Validation errors:\n${messages}`);
          } else if (typeof errorData.detail === 'string') {
            toast.error(`Validation error: ${errorData.detail}`);
          } else {
            toast.error('Invalid data format. Please check your inputs.');
          }
        } else if (error.response.status === 409) {
          toast.error('A business profile with this information already exists.');
        } else if (error.response.status === 401) {
          toast.error('Authentication error. Please login again.');
          router.push('/auth/login');
        } else {
          toast.error(`Server error (${error.response.status}). Please try again later.`);
        }
      } else if (error.request) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(`Error: ${error.message || 'Failed to create business profile'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Name *
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
        
        {/* GSTIN */}
        <div>
          <label htmlFor="gstin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            GSTIN *
          </label>
          <input
            id="gstin"
            type="text"
            {...register('gstin')}
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
            State *
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
        
        {/* State Code */}
        <div>
          <label htmlFor="state_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            State Code *
          </label>
          <input
            id="state_code"
            type="text"
            placeholder="2-digit code (e.g. 29 for Karnataka)"
            {...register('state_code')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.state_code && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.state_code.message}</p>
          )}
        </div>
        
        {/* Pincode */}
        <div>
          <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pincode *
          </label>
          <input
            id="pincode"
            type="text"
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
            Phone *
          </label>
          <input
            id="phone"
            type="text"
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
            Email *
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>
        
        {/* Is Default */}
        <div className="md:col-span-2">
          <div className="flex items-center">
            <input
              id="is_default"
              type="checkbox"
              {...register('is_default')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              Set as default business profile
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard/business-profiles')}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Business Profile'}
        </button>
      </div>
    </form>
  );
} 