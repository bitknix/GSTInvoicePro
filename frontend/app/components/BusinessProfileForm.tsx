'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';

// Define the form validation schema
const formSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Name is required'),
  gstin: z.string().min(1, 'GSTIN is required').regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  state_code: z.string().min(1, 'State code is required').regex(/^[0-9]{2}$/, 'State code must be 2 digits'),
  pin: z.string().min(1, 'PIN code is required').regex(/^[0-9]{6}$/, 'PIN code must be 6 digits'),
  phone: z.string().min(1, 'Phone is required').regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  logo_url: z.string().optional().nullable(),
  is_default: z.boolean().default(false)
});

type BusinessProfileFormData = z.infer<typeof formSchema>;

interface BusinessProfileFormProps {
  initialData?: Partial<BusinessProfileFormData>;
  onSuccess?: (data: unknown) => void;
}

export default function BusinessProfileForm({ initialData, onSuccess }: BusinessProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<BusinessProfileFormData> = {
    name: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    state_code: '',
    pin: '',
    phone: '',
    email: '',
    logo_url: '',
    is_default: false,
    ...initialData
  };

  const { register, handleSubmit, formState: { errors } } = useForm<BusinessProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (formData: BusinessProfileFormData) => {
    setIsSubmitting(true);
    try {
      // Ensure empty strings are sent as null or not included
      const data = {
        ...formData,
        // Convert empty strings to null for optional fields
        logo_url: formData.logo_url?.trim() === '' ? null : formData.logo_url
      };
      
      console.log('Submitting business profile data:', data);
      
      let result;
      if (initialData && initialData.id) {
        // Update existing profile
        result = await api.updateBusinessProfile(initialData.id as number, data);
        toast.success('Business profile updated successfully!');
      } else {
        // Create new profile
        result = await api.createBusinessProfile(data);
        toast.success('Business profile created successfully!');
      }
      
      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push('/dashboard/business-profiles');
      }
    } catch (error: any) {
      console.error('Error saving business profile:', error);
      // Display more detailed error message
      const errorMessage = error.response?.data?.detail || 'Failed to save business profile. Please try again.';
      if (error.response?.data?.detail) {
        console.log('Validation errors:', error.response.data.detail);
      }
      toast.error(errorMessage);
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
            placeholder="Enter business name"
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
            placeholder="e.g., 22AAAAA0000A1Z5"
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
            placeholder="Enter address"
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
            placeholder="Enter city"
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
            placeholder="Enter state"
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
            placeholder="e.g., 22"
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
            placeholder="e.g., 400001"
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
            placeholder="e.g., 9876543210"
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
            placeholder="Enter email"
            {...register('email')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Logo URL */}
        <div>
          <label htmlFor="logo_url" className="block text-sm font-medium mb-1">
            Logo URL (Optional)
          </label>
          <input
            id="logo_url"
            type="text"
            placeholder="Enter logo URL"
            {...register('logo_url')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
          />
          {errors.logo_url && (
            <p className="mt-1 text-sm text-red-600">{errors.logo_url.message}</p>
          )}
        </div>

        {/* Is Default */}
        <div className="md:col-span-2">
          <div className="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-md">
            <input
              id="is_default"
              type="checkbox"
              {...register('is_default')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <label htmlFor="is_default" className="text-sm font-medium">
                Set as Default Profile
              </label>
              <p className="text-sm text-gray-500">
                Make this your default business profile for new invoices
              </p>
            </div>
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
          {isSubmitting ? 'Saving...' : initialData ? 'Update Profile' : 'Create Profile'}
        </button>
      </div>
    </form>
  );
} 