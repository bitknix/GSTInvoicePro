'use client';

import React, { useEffect, useState } from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import { TrashIcon } from 'lucide-react';
import { calculateItemTaxes, shouldApplyIGST, formatIndianCurrency } from '@/app/utils/taxCalculations';

interface InvoiceItemCardProps {
  index: number;
  control: Control<any>;
  register: any;
  remove: (index: number) => void;
  products: any[];
  businessState: string;
  customerState: string;
  errors: any;
}

export default function InvoiceItemCard({
  index,
  control,
  register,
  remove,
  products,
  businessState,
  customerState,
  errors
}: InvoiceItemCardProps) {
  const [product, setProduct] = useState<any>(null);
  const [itemTotal, setItemTotal] = useState(0);
  const [taxDetails, setTaxDetails] = useState<{
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalWithTax: number;
  }>({
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalWithTax: 0
  });

  // Watch for changes in this item's fields
  const itemFields = useWatch({
    control,
    name: `items.${index}`
  });

  // Handle product selection
  const handleProductChange = (productId: number) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      setProduct(selectedProduct);
    }
  };

  // Calculate item totals when values change
  useEffect(() => {
    if (!itemFields) return;

    const { quantity = 0, price = 0, discount = 0, taxable = true } = itemFields;
    const qty = parseFloat(quantity) || 0;
    const unitPrice = parseFloat(price) || 0;
    const discountPercent = parseFloat(discount) || 0;
    
    // Calculate base amount
    const subtotal = qty * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    
    setItemTotal(taxableAmount);

    // Calculate taxes if item is taxable
    if (taxable && businessState && customerState) {
      const applyIGST = shouldApplyIGST(businessState, customerState);
      let cgstRate = 0;
      let sgstRate = 0;
      let igstRate = 0;
      
      // Get tax rates from the form or product
      if (itemFields.taxRate) {
        if (applyIGST) {
          igstRate = parseFloat(itemFields.taxRate) || 0;
        } else {
          // Split tax rate for CGST/SGST
          cgstRate = parseFloat(itemFields.taxRate) / 2 || 0;
          sgstRate = cgstRate;
        }
      }
      
      // Calculate tax amounts
      const cgstAmount = taxableAmount * (cgstRate / 100);
      const sgstAmount = taxableAmount * (sgstRate / 100);
      const igstAmount = taxableAmount * (igstRate / 100);
      const totalTax = cgstAmount + sgstAmount + igstAmount;
      
      setTaxDetails({
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalWithTax: taxableAmount + totalTax
      });
    } else {
      // For non-taxable items
      setTaxDetails({
        taxableAmount,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalWithTax: taxableAmount
      });
    }
  }, [itemFields, businessState, customerState]);
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 mb-4 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-semibold">Item #{index + 1}</h4>
        <button
          type="button"
          onClick={() => remove(index)}
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none"
          aria-label="Remove item"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Product selection */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product/Service
          </label>
          <Controller
            control={control}
            name={`items.${index}.productId`}
            render={({ field }) => (
              <select
                {...field}
                onChange={(e) => {
                  field.onChange(parseInt(e.target.value));
                  handleProductChange(parseInt(e.target.value));
                }}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors?.items?.[index]?.productId && (
            <p className="mt-1 text-sm text-red-600">{errors.items[index].productId.message}</p>
          )}
        </div>
        
        {/* HSN/SAC Code */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            HSN/SAC Code
          </label>
          <input
            type="text"
            {...register(`items.${index}.hsnCode`)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="HSN Code"
          />
          {errors?.items?.[index]?.hsnCode && (
            <p className="mt-1 text-sm text-red-600">{errors.items[index].hsnCode.message}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Description */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            {...register(`items.${index}.description`)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Item description"
          />
          {errors?.items?.[index]?.description && (
            <p className="mt-1 text-sm text-red-600">{errors.items[index].description.message}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Quantity */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            step="1"
            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors?.items?.[index]?.quantity && (
            <p className="mt-1 text-sm text-red-600">{errors.items[index].quantity.message}</p>
          )}
        </div>
        
        {/* Unit Price */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register(`items.${index}.price`, { valueAsNumber: true })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors?.items?.[index]?.price && (
            <p className="mt-1 text-sm text-red-600">{errors.items[index].price.message}</p>
          )}
        </div>
        
        {/* Discount */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Discount (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            {...register(`items.${index}.discount`, { valueAsNumber: true })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors?.items?.[index]?.discount && (
            <p className="mt-1 text-sm text-red-600">{errors.items[index].discount.message}</p>
          )}
        </div>
        
        {/* Tax Rate */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tax Rate (%)
          </label>
          <select
            {...register(`items.${index}.taxRate`, { valueAsNumber: true })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18">18%</option>
            <option value="28">28%</option>
          </select>
          {errors?.items?.[index]?.taxRate && (
            <p className="mt-1 text-sm text-red-600">{errors.items[index].taxRate.message}</p>
          )}
        </div>
      </div>
      
      {/* Taxable checkbox */}
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id={`taxable-${index}`}
          {...register(`items.${index}.taxable`)}
          defaultChecked={true}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor={`taxable-${index}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          Item is taxable
        </label>
      </div>
      
      {/* Tax calculation summary */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-600 dark:text-gray-400">Taxable Value:</span>
          <span>{formatIndianCurrency(taxDetails.taxableAmount)}</span>
        </div>
        
        {shouldApplyIGST(businessState, customerState) ? (
          <div className="flex justify-between text-sm mt-1">
            <span className="font-medium text-gray-600 dark:text-gray-400">IGST:</span>
            <span>{formatIndianCurrency(taxDetails.igstAmount)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm mt-1">
              <span className="font-medium text-gray-600 dark:text-gray-400">CGST:</span>
              <span>{formatIndianCurrency(taxDetails.cgstAmount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="font-medium text-gray-600 dark:text-gray-400">SGST:</span>
              <span>{formatIndianCurrency(taxDetails.sgstAmount)}</span>
            </div>
          </>
        )}
        
        <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Total:</span>
          <span>{formatIndianCurrency(taxDetails.totalWithTax)}</span>
        </div>
      </div>
    </div>
  );
} 