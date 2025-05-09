'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import api from '../../../utils/api';

// Define validation schema
const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional().or(z.literal('')),
  hsn_sac: z.string().min(4, 'HSN/SAC code must be at least 4 characters'),
  sku: z.string().optional().or(z.literal('')),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  custom_unit: z.string().optional().or(z.literal('')),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: 'Price must be a positive number'
  }),
  tax_rate: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 28, {
    message: 'Tax rate must be between 0 and 28'
  }),
  stock_quantity: z.string().optional().or(z.literal('')),
  low_stock_threshold: z.string().optional().or(z.literal('')),
  tax_included: z.boolean().optional(),
  is_service: z.boolean().optional()
});

type ProductFormData = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      tax_rate: '18',
      tax_included: false,
      is_service: false,
      unit_of_measure: 'PCS',
      custom_unit: '',
      stock_quantity: '',
      low_stock_threshold: ''
    }
  });
  
  const taxIncluded = watch('tax_included');
  const isService = watch('is_service');
  const selectedUnit = watch('unit_of_measure');
  const showCustomUnitField = selectedUnit === 'OTHER';
  
  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    
    // Convert string values to numbers and format data according to API expectations
    const formattedData = {
      name: data.name,
      description: data.description || '',
      hsn_sac: data.hsn_sac,
      sku: data.sku || '',
      is_service: data.is_service || false,
      tax_rate: parseFloat(data.tax_rate),
      unit: data.unit_of_measure === 'OTHER' ? data.custom_unit : data.unit_of_measure,
      price: parseFloat(data.price),
      stock_quantity: data.stock_quantity && data.stock_quantity !== '' ? parseInt(data.stock_quantity) : undefined,
      low_stock_threshold: data.low_stock_threshold && data.low_stock_threshold !== '' ? parseInt(data.low_stock_threshold) : undefined
    };
    
    try {
      await api.createProduct(formattedData);
      toast.success('Product created successfully');
      router.push('/dashboard/products');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New {isService ? 'Service' : 'Product'}
        </h1>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => router.push('/dashboard/products')}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product/Service Toggle */}
            <div className="flex items-center space-x-2">
              <input
                id="is_service"
                type="checkbox"
                {...register('is_service')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_service" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                This is a service (not a physical product)
              </label>
            </div>
            
            {/* Tax Included Toggle */}
            <div className="flex items-center space-x-2">
              <input
                id="tax_included"
                type="checkbox"
                {...register('tax_included')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="tax_included" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Price is tax-inclusive
              </label>
            </div>
            
            {/* Product Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isService ? 'Service' : 'Product'} Name *
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
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
              )}
            </div>
            
            {/* HSN/SAC Code */}
            <div>
              <label htmlFor="hsn_sac" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isService ? 'SAC' : 'HSN'} Code *
              </label>
              <input
                id="hsn_sac"
                type="text"
                placeholder={isService ? "Service Accounting Code" : "Harmonized System Nomenclature"}
                {...register('hsn_sac')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              {errors.hsn_sac && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hsn_sac.message}</p>
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
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sku.message}</p>
              )}
            </div>
            
            {/* Unit of Measure */}
            <div>
              <label htmlFor="unit_of_measure" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit of Measure *
              </label>
              <select
                id="unit_of_measure"
                {...register('unit_of_measure')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              >
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
              {errors.unit_of_measure && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.unit_of_measure.message}</p>
              )}
            </div>
            
            {showCustomUnitField && (
              <div className="mt-4">
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
              </div>
            )}
            
            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price (₹) *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">₹</span>
                </div>
                <input
                  id="price"
                  type="text"
                  placeholder="0.00"
                  {...register('price')}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 pl-7 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {taxIncluded ? 'Price includes all taxes' : 'Tax will be calculated on top of this price'}
              </p>
            </div>
            
            {/* Tax Rate */}
            <div>
              <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                GST Rate (%) *
              </label>
              <select
                id="tax_rate"
                {...register('tax_rate')}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              >
                <option value="0">GST 0%</option>
                <option value="3">GST 3%</option>
                <option value="5">GST 5%</option>
                <option value="12">GST 12%</option>
                <option value="18">GST 18%</option>
                <option value="28">GST 28%</option>
              </select>
              {errors.tax_rate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tax_rate.message}</p>
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
                    {...register('stock_quantity')}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  />
                  {errors.stock_quantity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stock_quantity.message}</p>
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
                    {...register('low_stock_threshold')}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 text-gray-900 dark:text-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  />
                  {errors.low_stock_threshold && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.low_stock_threshold.message}</p>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => router.push('/dashboard/products')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 mr-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : `Create ${isService ? 'Service' : 'Product'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 