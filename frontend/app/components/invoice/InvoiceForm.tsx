'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import api from '@/app/utils/api';
import { Invoice, InvoiceItem, Product, BusinessProfile, Customer } from '@/app/types';

// Form validation schema
const invoiceItemSchema = z.object({
  product_id: z.number({
    required_error: 'Product is required',
  }),
  product_name: z.string().optional(),
  description: z.string().optional(),
  hsn_sac: z.string().min(4, 'HSN/SAC code must be at least 4 digits'),
  quantity: z.number({
    required_error: 'Quantity is required',
  }).positive('Quantity must be greater than 0'),
  rate: z.number({
    required_error: 'Rate is required',
  }).positive('Rate must be greater than 0'),
  discount_percent: z.number().min(0).max(100).default(0).optional(),
  discount_amount: z.number().min(0).default(0).optional(),
  tax_rate: z.number({
    required_error: 'Tax rate is required',
  }).min(0, 'Tax rate must be at least 0'),
  is_service: z.boolean().default(false),
});

const invoiceSchema = z.object({
  invoice_date: z.string({
    required_error: 'Invoice date is required',
  }),
  due_date: z.string({
    required_error: 'Due date is required',
  }),
  business_profile_id: z.number({
    required_error: 'Business profile is required',
  }),
  customer_id: z.number({
    required_error: 'Customer is required',
  }),
  notes: z.string().optional(),
  
  // Status fields
  status: z.enum(['draft', 'published', 'approved']).default('draft'),
  payment_status: z.enum(['unpaid', 'partial', 'paid']).default('unpaid'),
  
  // New fields
  document_type: z.enum(['Invoice', 'Credit Note', 'Debit Note']).default('Invoice'),
  supply_type: z.enum(['B2B', 'B2C', 'Export with Tax', 'Export without Tax', 'SEZ with Tax', 'SEZ without Tax']).default('B2B'),
  reference_number: z.string().optional(),
  place_of_supply: z.string().optional(),
  dispatch_from: z.string().optional(),
  ship_to: z.string().optional(),
  currency: z.string().default('INR').optional(),
  port_of_export: z.string().optional(),
  discount_amount: z.number().min(0).default(0).optional(),
  round_off: z.boolean().default(true).optional(),
  
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  initialData?: Partial<Invoice>;
  isEditing?: boolean;
}

export default function InvoiceForm({ initialData, isEditing = false }: InvoiceFormProps) {
  const router = useRouter();
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBusinessProfile, setSelectedBusinessProfile] = useState<BusinessProfile | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemsInitialized, setItemsInitialized] = useState(false);

  // Tax calculations
  const [taxSummary, setTaxSummary] = useState({
    subtotal: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0,
    taxAmount: 0,
    total: 0,
    taxType: 'intra-state' as 'intra-state' | 'inter-state',
    discountTotal: 0,
    roundOff: 0,
  });

  // Initialize react-hook-form
  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days from now
      notes: '',
      
      // Status fields
      status: 'draft',
      payment_status: 'unpaid',
      
      // New fields
      document_type: 'Invoice',
      supply_type: 'B2B',
      reference_number: '',
      place_of_supply: '',
      dispatch_from: '',
      ship_to: '',
      currency: 'INR',
      port_of_export: '',
      discount_amount: 0,
      round_off: true,
      
      items: initialData?.items || [{ 
        product_id: 0,
        product_name: '',
        hsn_sac: '',
        quantity: 1,
        rate: 0,
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: 18, // Default 18% GST
        is_service: false,
      }],
    }
  });

  // Create a field array for invoice items
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch form fields for tax calculations
  const watchedItems = watch('items');
  const watchedBusinessProfileId = watch('business_profile_id');
  const watchedCustomerId = watch('customer_id');

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [profilesData, customersData, productsData] = await Promise.all([
          api.getBusinessProfiles(),
          api.getCustomers(),
          api.getProducts(),
        ]);

        setBusinessProfiles(profilesData || []);
        setCustomers(customersData || []);
        setProducts(productsData || []);

        // Set initial values for editing
        if (isEditing && initialData && !itemsInitialized) {
          if (initialData.invoice_date) {
            setValue('invoice_date', initialData.invoice_date);
          }
          if (initialData.due_date) {
            setValue('due_date', initialData.due_date);
          }
          if (initialData.business_profile_id) {
            setValue('business_profile_id', initialData.business_profile_id);
          }
          if (initialData.customer_id) {
            setValue('customer_id', initialData.customer_id);
          }
          setValue('notes', initialData.notes || '');
          setValue('status', initialData.status || 'draft');
          setValue('payment_status', initialData.payment_status || 'unpaid');
          setValue('document_type', initialData.document_type || 'Invoice');
          setValue('supply_type', initialData.supply_type || 'B2B');
          setValue('reference_number', initialData.reference_number || '');
          setValue('place_of_supply', initialData.place_of_supply || '');
          setValue('dispatch_from', initialData.dispatch_from || '');
          setValue('ship_to', initialData.ship_to || '');
          setValue('currency', initialData.currency || 'INR');
          setValue('port_of_export', initialData.port_of_export || '');
          setValue('discount_amount', initialData.discount_amount || 0);
          setValue('round_off', initialData.round_off !== undefined ? Boolean(initialData.round_off) : true);
          
          // Set items - Clear all existing items first
          remove();
          
          // Add each item from initialData, ensuring no duplicates
          // Create a Set to track unique item IDs we've already added
          const addedItemIds = new Set();
          
          if (initialData.items && initialData.items.length > 0) {
            initialData.items.forEach((item: InvoiceItem) => {
              // Skip duplicate items (those with the same ID)
              if (item.id && addedItemIds.has(item.id)) {
                return;
              }
              
              // Add this item's ID to our tracking set if it has one
              if (item.id) {
                addedItemIds.add(item.id);
              }
              
              append({
                product_id: item.product_id || 0,
                product_name: item.product_name || '',
                description: item.description || '',
                hsn_sac: item.hsn_sac || '',
                quantity: item.quantity || 0,
                rate: item.rate || 0,
                discount_percent: item.discount_percent || 0,
                discount_amount: item.discount_amount || 0,
                tax_rate: item.tax_rate || 0,
                is_service: item.is_service || false,
              });
            });
          }
          
          // If no items were added (empty or all duplicates), add a default item
          if (fields.length === 0) {
            append({ 
              product_id: 0,
              product_name: '',
              description: '',
              hsn_sac: '',
              quantity: 1,
              rate: 0,
              discount_percent: 0,
              discount_amount: 0,
              tax_rate: 18, // Default 18% GST
              is_service: false,
            });
          }
          
          setItemsInitialized(true);
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isEditing, initialData, setValue, append, remove, fields.length, itemsInitialized]);

  // Update selected business profile and customer when IDs change
  useEffect(() => {
    if (watchedBusinessProfileId) {
      const profile = businessProfiles.find(p => p.id === watchedBusinessProfileId);
      setSelectedBusinessProfile(profile || null);
    }
    
    if (watchedCustomerId) {
      const customer = customers.find(c => c.id === watchedCustomerId);
      setSelectedCustomer(customer || null);
    }
  }, [watchedBusinessProfileId, watchedCustomerId, businessProfiles, customers]);

  // Calculate taxes whenever watched items change
  useEffect(() => {
    if (!selectedBusinessProfile || !selectedCustomer) return;

    // Determine if intra-state or inter-state
    const isSameState = selectedBusinessProfile.state === selectedCustomer.state;
    const taxType = isSameState ? 'intra-state' : 'inter-state';

    // Calculate taxes for each item
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let taxAmount = 0;
    let discountTotal = 0;

    watchedItems.forEach(item => {
      if (!item) return;
      
      const itemSubtotal = (item.quantity || 0) * (item.rate || 0);
      const itemDiscountAmount = itemSubtotal * ((item.discount_percent || 0) / 100);
      const taxableAmount = itemSubtotal - itemDiscountAmount;
      
      discountTotal += itemDiscountAmount;
      subtotal += itemSubtotal;
      
      // Calculate tax based on tax type
      if (taxType === 'intra-state') {
        const cgst = taxableAmount * ((item.tax_rate || 0) / 200); // Half rate for CGST
        const sgst = taxableAmount * ((item.tax_rate || 0) / 200); // Half rate for SGST
        cgstTotal += cgst;
        sgstTotal += sgst;
        taxAmount += cgst + sgst;
      } else {
        const igst = taxableAmount * ((item.tax_rate || 0) / 100);
        igstTotal += igst;
        taxAmount += igst;
      }
    });

    // Calculate total
    let total = (subtotal - discountTotal) + taxAmount;
    
    // Apply round off if enabled
    let roundOff = 0;
    if (watch('round_off')) {
      const roundedTotal = Math.round(total);
      roundOff = roundedTotal - total;
      total = roundedTotal;
    }

    setTaxSummary({
      subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      taxAmount,
      total,
      discountTotal,
      roundOff,
      taxType,
    });
  }, [watchedItems, selectedBusinessProfile, selectedCustomer, watch]);

  // Add a new invoice item
  const addItem = () => {
    console.log('Adding new item, current items count:', fields.length);
    try {
      append({ 
        product_id: 0,
        product_name: '',
        description: '',
        hsn_sac: '',
        quantity: 1,
        rate: 0,
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: 18,
        is_service: false,
      });
      toast.success('New item added');
      console.log('New item added, total items:', fields.length + 1);
    } catch (error) {
      console.error('Error adding new item:', error);
      toast.error('Failed to add new item');
    }
  };

  // Handle item deletion with safety check
  const handleDeleteItem = (index: number) => {
    console.log('Attempting to delete item at index:', index);
    
    // Prevent deleting the last item
    if (fields.length <= 1) {
      toast.warning('Invoice must have at least one item');
      return;
    }
    
    try {
      // Remove the item at the specified index
      remove(index);
      
      // Force re-render of the items list to ensure the UI updates
      setTimeout(() => {
        const currentItems = [...watch('items')];
        setValue('items', currentItems);
      }, 0);
      
      toast.success('Item removed successfully');
      console.log('Item removed, remaining items:', fields.length - 1);
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    }
  };

  // Handle form submission
  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      console.log('Submitting with items:', data.items);
      
      // Get the current items from the form state to ensure deleted items are not included
      const currentItems = data.items || [];
      
      // Process items to calculate amounts
      const processedItems = currentItems.map((item) => {
        const amount = item.quantity * item.rate;
        const discountAmount = amount * ((item.discount_percent || 0) / 100);
        const taxableAmount = amount - discountAmount;
        const taxAmount = taxableAmount * ((item.tax_rate || 0) / 100);
        
        return {
          product_id: item.product_id || 0,
          product_name: item.product_name || '',
          description: item.description || '',
          hsn_sac: item.hsn_sac || '',
          quantity: item.quantity,
          rate: item.rate,
          discount_percent: item.discount_percent || 0,
          discount_amount: discountAmount,
          tax_rate: item.tax_rate || 0,
          total: taxableAmount + taxAmount,
          is_service: item.is_service || false
        };
      });
      
      // Calculate tax amounts based on supply type
      let cgstTotal = 0;
      let sgstTotal = 0;
      let igstTotal = 0;
      
      // Determine if IGST or CGST+SGST should be applied
      const isIGST = selectedBusinessProfile?.state !== selectedCustomer?.state;
      
      processedItems.forEach((item) => {
        const amount = item.quantity * item.rate;
        const discountAmount = amount * ((item.discount_percent || 0) / 100);
        const taxableAmount = amount - discountAmount;
        
        if (isIGST) {
          igstTotal += taxableAmount * (item.tax_rate / 100);
        } else {
          // Split tax into CGST and SGST
          const halfTaxRate = item.tax_rate / 2;
          const halfTaxAmount = taxableAmount * (halfTaxRate / 100);
          cgstTotal += halfTaxAmount;
          sgstTotal += halfTaxAmount;
        }
      });
      
      // Calculate subtotal and total
      const subtotal = processedItems.reduce((sum: number, item) => sum + (item.quantity * item.rate), 0);
      const discountTotal = processedItems.reduce((sum: number, item) => sum + (item.discount_amount || 0), 0);
      const taxableAmount = subtotal - discountTotal;
      const taxTotal = isIGST ? igstTotal : (cgstTotal + sgstTotal);
      
      // Calculate total including tax
      let total = taxableAmount + taxTotal;
      
      // Round off if enabled
      let roundOff = 0;
      if (data.round_off) {
        const roundedTotal = Math.round(total);
        roundOff = roundedTotal - total;
        total = roundedTotal;
      }
      
      // Create payload
      const payload = {
        invoice_date: data.invoice_date,
        due_date: data.due_date || '',
        customer_id: data.customer_id,
        business_profile_id: data.business_profile_id,
        taxable_amount: taxableAmount,
        cgst_amount: cgstTotal,
        sgst_amount: sgstTotal,
        igst_amount: igstTotal,
        total_tax: taxTotal,
        total_discount: discountTotal,
        grand_total: total,
        notes: data.notes || '',
        status: data.status || 'draft',
        payment_status: data.payment_status || 'unpaid',
        document_type: data.document_type || 'Invoice',
        supply_type: data.supply_type || 'B2B',
        reference_number: data.reference_number || '',
        place_of_supply: data.place_of_supply || selectedCustomer?.state || '',
        ship_to: data.ship_to || selectedCustomer?.address || '',
        dispatch_from: data.dispatch_from || selectedBusinessProfile?.address || '',
        port_of_export: data.port_of_export || '',
        discount_amount: discountTotal,
        round_off: roundOff,
        items: processedItems.map(item => ({
          ...item,
          hsn_sac: item.hsn_sac || '',
          description: item.description || '',
          discount_percent: item.discount_percent || 0,
          discount_amount: item.discount_amount || 0
        }))
      };
      
      if (isEditing && initialData?.id) {
        // Update existing invoice using the API utility
        await api.updateInvoice(initialData.id, payload);
        toast.success('Invoice updated successfully!');
      } else {
        // Create new invoice using the API utility
        await api.createInvoice(payload);
        toast.success('Invoice created successfully!');
      }
      
      // Redirect to invoice list
      router.push('/dashboard/invoices');
      router.refresh();
      
    } catch (err: unknown) {
      console.error('Error submitting invoice:', err);
      setError('Failed to create invoice');
      toast.error('Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
      </h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invoice Date
            </label>
            <input
              type="date"
              {...register('invoice_date')}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.invoice_date && (
              <p className="mt-1 text-sm text-red-600">
                {typeof errors.invoice_date.message === 'string' ? errors.invoice_date.message : 'Invoice date is required'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              {...register('due_date')}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.due_date && (
              <p className="mt-1 text-sm text-red-600">
                {typeof errors.due_date.message === 'string' ? errors.due_date.message : 'Due date is required'}
              </p>
            )}
          </div>
        </div>

        {/* Business Profile and Customer Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Profile
            </label>
            <select
              {...register('business_profile_id', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Business Profile</option>
              {businessProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} - {profile.gstin}
                </option>
              ))}
            </select>
            {errors.business_profile_id && (
              <p className="mt-1 text-sm text-red-600">
                {typeof errors.business_profile_id.message === 'string' ? errors.business_profile_id.message : 'Business profile is required'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer
            </label>
            <select
              {...register('customer_id', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.gstin || 'No GSTIN'}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600">
                {typeof errors.customer_id.message === 'string' ? errors.customer_id.message : 'Customer is required'}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Product
                    </label>
                    <select
                      {...register(`items.${index}.product_id` as const, { valueAsNumber: true })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.hsn_sac}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      HSN/SAC Code
                    </label>
                    <input
                      type="text"
                      {...register(`items.${index}.hsn_sac` as const)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="HSN/SAC Code"
                    />
                    {errors.items?.[index]?.hsn_sac && (
                      <p className="mt-1 text-sm text-red-600">{errors.items[index]?.hsn_sac?.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Quantity"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="mt-1 text-sm text-red-600">{errors.items[index]?.quantity?.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.rate` as const, { valueAsNumber: true })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Rate"
                    />
                    {errors.items?.[index]?.rate && (
                      <p className="mt-1 text-sm text-red-600">{errors.items[index]?.rate?.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.tax_rate` as const, { valueAsNumber: true })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tax Rate"
                    />
                    {errors.items?.[index]?.tax_rate && (
                      <p className="mt-1 text-sm text-red-600">{errors.items[index]?.tax_rate?.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.discount_percent` as const, { valueAsNumber: true })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Discount %"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Tax Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
              <span className="ml-2 font-medium">₹{taxSummary.subtotal.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">CGST:</span>
              <span className="ml-2 font-medium">₹{taxSummary.cgstTotal.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">SGST:</span>
              <span className="ml-2 font-medium">₹{taxSummary.sgstTotal.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">IGST:</span>
              <span className="ml-2 font-medium">₹{taxSummary.igstTotal.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Tax:</span>
              <span className="ml-2 font-medium">₹{taxSummary.taxAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <span className="ml-2 font-bold text-lg">₹{taxSummary.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : (isEditing ? 'Update Invoice' : 'Create Invoice')}
          </button>
        </div>
      </form>
    </div>
  );
} 