'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';

// Define the form schema
const businessProfileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  gstin: z.string().length(15, 'GSTIN must be exactly 15 characters'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  state_code: z.string().length(2, 'State code must be exactly 2 digits'),
  pin: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  email: z.string().email('Invalid email address'),
  is_default: z.boolean().default(false)
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

interface BusinessProfileFormProps {
  initialData?: Partial<BusinessProfileFormData>;
  onSuccess?: () => void;
}

export function BusinessProfileForm({ initialData, onSuccess }: BusinessProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values or initial data
  const { register, handleSubmit, formState: { errors } } = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: '',
      gstin: '',
      address: '',
      city: '',
      state: '',
      state_code: '',
      pin: '',
      phone: '',
      email: '',
      is_default: false,
      ...initialData
    }
  });

  // Handle form submission
  const onSubmit = async (data: BusinessProfileFormData) => {
    setIsSubmitting(true);
    
    try {
      await api.createBusinessProfile(data);
      toast.success('Business profile created successfully');
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/business-profiles');
      }
    } catch (error) {
      console.error('Error creating business profile:', error);
      toast.error('Failed to create business profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Business Name *
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        
        {/* GSTIN */}
        <div>
          <label htmlFor="gstin" className="block text-sm font-medium mb-1">
            GSTIN *
          </label>
          <input
            id="gstin"
            type="text"
            {...register('gstin')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.gstin && (
            <p className="mt-1 text-sm text-red-600">{errors.gstin.message}</p>
          )}
        </div>
        
        {/* Address */}
        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium mb-1">
            Address *
          </label>
          <textarea
            id="address"
            rows={3}
            {...register('address')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>
        
        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium mb-1">
            City *
          </label>
          <input
            id="city"
            type="text"
            {...register('city')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>
        
        {/* State */}
        <div>
          <label htmlFor="state" className="block text-sm font-medium mb-1">
            State *
          </label>
          <input
            id="state"
            type="text"
            {...register('state')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.state && (
            <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
          )}
        </div>
        
        {/* State Code */}
        <div>
          <label htmlFor="state_code" className="block text-sm font-medium mb-1">
            State Code *
          </label>
          <input
            id="state_code"
            type="text"
            placeholder="2-digit code (e.g. 29 for Karnataka)"
            {...register('state_code')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.state_code && (
            <p className="mt-1 text-sm text-red-600">{errors.state_code.message}</p>
          )}
        </div>
        
        {/* PIN Code */}
        <div>
          <label htmlFor="pin" className="block text-sm font-medium mb-1">
            PIN Code *
          </label>
          <input
            id="pin"
            type="text"
            {...register('pin')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.pin && (
            <p className="mt-1 text-sm text-red-600">{errors.pin.message}</p>
          )}
        </div>
        
        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone *
          </label>
          <input
            id="phone"
            type="text"
            {...register('phone')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>
        
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email *
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
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
            <label htmlFor="is_default" className="ml-2 block text-sm">
              Set as default business profile
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard/business-profiles')}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
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