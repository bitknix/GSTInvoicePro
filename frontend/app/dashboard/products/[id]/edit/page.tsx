'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { ArrowLeft } from 'lucide-react';
import api from '@/app/utils/api';

// Define validation schema
const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional().or(z.literal('')),
  hsn_sac: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  is_service: z.boolean(),
  tax_rate: z.number().min(0, 'Tax rate must be at least 0').max(100, 'Tax rate cannot exceed 100'),
  unit: z.string().optional().or(z.literal('')),
  custom_unit: z.string().optional().or(z.literal('')),
  price: z.number().min(0, 'Price must be at least 0'),
  stock_quantity: z.union([z.number().optional(), z.null()]),
  low_stock_threshold: z.union([z.number().optional(), z.null()]),
});

// List of standard units for validation
const standardUnits = [
  'PCS', 'NOS', 'UNT', 'SET', 'PAIR',
  'KG', 'GM', 'MG', 'MT', 'TON',
  'MTR', 'CM', 'MM', 'FT', 'IN',
  'LTR', 'ML', 'CUBIC-MTR', 'CUBIC-FT',
  'SQ-MTR', 'SQ-FT', 'SQ-YD',
  'BOX', 'PKT', 'BAG', 'CTN', 'DRUM', 'BTL',
  'HRS', 'DAYS', 'WEEK', 'MONTH', 'YEAR',
  'JOB', 'PROJECT', 'SERVICE',
  'OTHER'
];

export default function EditProductPage() {
  // Use useParams hook instead of directly accessing params prop
  const params = useParams();
  const productId = params.id as string;
  
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      hsn_sac: '',
      sku: '',
      is_service: false,
      tax_rate: 18,
      unit: '',
      custom_unit: '',
      price: 0,
      stock_quantity: null,
      low_stock_threshold: null,
    }
  });

  const isService = watch('is_service');
  const selectedUnit = watch('unit');
  const showCustomUnitField = selectedUnit === 'OTHER';

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch product details
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await api.getProduct(parseInt(productId));
        
        // Populate the form with product data
        setValue('name', data.name);
        setValue('description', data.description || '');
        setValue('hsn_sac', data.hsn_sac || '');
        setValue('sku', data.sku || '');
        setValue('is_service', data.is_service);
        setValue('tax_rate', data.tax_rate);
        
        // Handle custom unit
        if (data.unit && !standardUnits.includes(data.unit)) {
          setValue('unit', 'OTHER');
          setValue('custom_unit', data.unit);
        } else {
          setValue('unit', data.unit || '');
          setValue('custom_unit', '');
        }
        
        setValue('price', data.price || 0);
        setValue('stock_quantity', data.stock_quantity || null);
        setValue('low_stock_threshold', data.low_stock_threshold || null);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product details');
        router.push('/dashboard/products');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, router, setValue]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // Format the data with proper unit handling
      const formattedData = {
        ...data,
        unit: data.unit === 'OTHER' ? data.custom_unit : data.unit,
        stock_quantity: data.stock_quantity === null || isNaN(data.stock_quantity) ? undefined : data.stock_quantity,
        low_stock_threshold: data.low_stock_threshold === null || isNaN(data.low_stock_threshold) ? undefined : data.low_stock_threshold
      };
      
      // Remove unwanted fields
      delete formattedData.custom_unit;
      
      // Remove empty strings
      Object.keys(formattedData).forEach(key => {
        if (formattedData[key] === '') {
          formattedData[key] = undefined;
        }
      });
      
      await api.updateProduct(parseInt(productId), formattedData);
      toast.success('Product updated successfully');
      router.push(`/dashboard/products/${productId}`);
    } catch (error: any) {
      console.error('Error updating product:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
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
          toast.error('Failed to update product: ' + (error.message || 'Unknown error'));
        }
      } else {
        toast.error('Failed to update product: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Link href={`/dashboard/products/${productId}`} className="mr-4">
            <button className="p-2 border border-gray-300 rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Product
          </h1>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product/Service Name *
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message as string}</p>
              )}
            </div>
            
            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    id="type-product"
                    name="is_service"
                    checked={isService === false}
                    onChange={() => setValue('is_service', false)}
                    className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Product</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    id="type-service"
                    name="is_service"
                    checked={isService === true}
                    onChange={() => setValue('is_service', true)}
                    className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Service</span>
                </label>
              </div>
              {errors.is_service && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.is_service.message as string}</p>
              )}
            </div>
            
            {/* HSN/SAC Code */}
            <div>
              <label htmlFor="hsn_sac" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isService ? 'SAC Code' : 'HSN Code'} (Optional)
              </label>
              <input
                id="hsn_sac"
                type="text"
                {...register('hsn_sac')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.hsn_sac && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hsn_sac.message as string}</p>
              )}
            </div>
            
            {/* SKU */}
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU (Optional)
              </label>
              <input
                id="sku"
                type="text"
                placeholder="Stock Keeping Unit"
                {...register('sku')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sku.message as string}</p>
              )}
            </div>
            
            {/* Tax Rate */}
            <div>
              <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Rate (%) *
              </label>
              <select
                id="tax_rate"
                {...register('tax_rate', { valueAsNumber: true })}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% (GST)</option>
                <option value="12">12% (GST)</option>
                <option value="18">18% (GST)</option>
                <option value="28">28% (GST)</option>
              </select>
              {errors.tax_rate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tax_rate.message as string}</p>
              )}
            </div>
            
            {/* Unit */}
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit (Optional)
              </label>
              <select
                id="unit"
                {...register('unit')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              >
                <option value="">Select a unit</option>
                {/* Common Units */}
                <optgroup label="Common Units">
                  <option value="PCS">Pieces (PCS)</option>
                  <option value="NOS">Numbers (NOS)</option>
                  <option value="UNT">Unit (UNT)</option>
                  <option value="SET">Set (SET)</option>
                  <option value="PAIR">Pair (PAIR)</option>
                </optgroup>
                
                {/* Weight Units */}
                <optgroup label="Weight Units">
                  <option value="KG">Kilograms (KG)</option>
                  <option value="GM">Grams (GM)</option>
                  <option value="MG">Milligrams (MG)</option>
                  <option value="MT">Metric Ton (MT)</option>
                  <option value="TON">Ton (TON)</option>
                </optgroup>
                
                {/* Length Units */}
                <optgroup label="Length Units">
                  <option value="MTR">Meters (MTR)</option>
                  <option value="CM">Centimeters (CM)</option>
                  <option value="MM">Millimeters (MM)</option>
                  <option value="FT">Feet (FT)</option>
                  <option value="IN">Inches (IN)</option>
                </optgroup>
                
                {/* Volume Units */}
                <optgroup label="Volume Units">
                  <option value="LTR">Liters (LTR)</option>
                  <option value="ML">Milliliters (ML)</option>
                  <option value="CUBIC-MTR">Cubic Meter (CUBIC-MTR)</option>
                  <option value="CUBIC-FT">Cubic Feet (CUBIC-FT)</option>
                </optgroup>
                
                {/* Area Units */}
                <optgroup label="Area Units">
                  <option value="SQ-MTR">Square Meter (SQ-MTR)</option>
                  <option value="SQ-FT">Square Feet (SQ-FT)</option>
                  <option value="SQ-YD">Square Yard (SQ-YD)</option>
                </optgroup>
                
                {/* Packaging Units */}
                <optgroup label="Packaging Units">
                  <option value="BOX">Box (BOX)</option>
                  <option value="PKT">Packet (PKT)</option>
                  <option value="BAG">Bag (BAG)</option>
                  <option value="CTN">Carton (CTN)</option>
                  <option value="DRUM">Drum (DRUM)</option>
                  <option value="BTL">Bottle (BTL)</option>
                </optgroup>
                
                {/* Time Units (for Services) */}
                <optgroup label="Time Units">
                  <option value="HRS">Hours (HRS)</option>
                  <option value="DAYS">Days (DAYS)</option>
                  <option value="WEEK">Week (WEEK)</option>
                  <option value="MONTH">Month (MONTH)</option>
                  <option value="YEAR">Year (YEAR)</option>
                </optgroup>
                
                {/* Other Service Units */}
                <optgroup label="Service Units">
                  <option value="JOB">Job (JOB)</option>
                  <option value="PROJECT">Project (PROJECT)</option>
                  <option value="SERVICE">Service (SERVICE)</option>
                </optgroup>
                
                {/* Allow custom unit entry as well */}
                <optgroup label="Custom">
                  <option value="OTHER">Other</option>
                </optgroup>
              </select>
              {errors.unit && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.unit.message as string}</p>
              )}
            </div>
            
            {showCustomUnitField && (
              <div>
                <label htmlFor="custom_unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custom Unit *
                </label>
                <input
                  id="custom_unit"
                  type="text"
                  placeholder="Enter custom unit"
                  {...register('custom_unit')}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
                {errors.custom_unit && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.custom_unit.message as string}</p>
                )}
              </div>
            )}
            
            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price *
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price', { valueAsNumber: true })}
                  className="block w-full pl-7 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price.message as string}</p>
              )}
            </div>
            
            {!isService && (
              <>
                {/* Stock Quantity */}
                <div>
                  <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stock Quantity (Optional)
                  </label>
                  <input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    placeholder="Current inventory"
                    {...register('stock_quantity', { 
                      valueAsNumber: true,
                      setValueAs: (v) => v === "" ? null : Number(v)
                    })}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  />
                  {errors.stock_quantity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stock_quantity.message as string}</p>
                  )}
                </div>
                
                {/* Low Stock Threshold */}
                <div>
                  <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Low Stock Alert (Optional)
                  </label>
                  <input
                    id="low_stock_threshold"
                    type="number"
                    min="0"
                    placeholder="Minimum stock level"
                    {...register('low_stock_threshold', { 
                      valueAsNumber: true,
                      setValueAs: (v) => v === "" ? null : Number(v)
                    })}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  />
                  {errors.low_stock_threshold && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.low_stock_threshold.message as string}</p>
                  )}
                </div>
              </>
            )}
            
            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message as string}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Link href={`/dashboard/products/${productId}`}>
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 mr-4"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 