'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import api from '@/app/utils/api';

// Invoice interface definition for API calls
interface Invoice {
  id?: number;
  invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  customer_id: number;
  business_profile_id: number;
  taxable_amount: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  total_tax: number;
  total_discount?: number;
  grand_total: number;
  notes?: string;
  terms?: string;
  status: 'draft' | 'published' | 'approved';
  payment_status: 'unpaid' | 'partial' | 'paid';
  paid_amount?: number;
  document_type: 'Invoice' | 'Credit Note' | 'Debit Note';
  supply_type: 'B2B' | 'B2C' | 'Export with Tax' | 'Export without Tax' | 'SEZ with Tax' | 'SEZ without Tax';
  reference_number?: string;
  place_of_supply?: string;
  dispatch_from?: string;
  ship_to?: string;
  currency?: string;
  port_of_export?: string;
  discount_amount?: number;
  round_off?: number;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id?: number;
  product_id: number;
  product_name: string;
  description?: string;
  hsn_sac?: string;
  quantity: number;
  rate: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_rate: number;
  total: number;
  is_service: boolean;
}

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
  initialData?: any;
  isEditing?: boolean;
}

export default function InvoiceForm({ initialData, isEditing = false }: InvoiceFormProps) {
  const router = useRouter();
  const [businessProfiles, setBusinessProfiles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedBusinessProfile, setSelectedBusinessProfile] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
  const watchedSupplyType = watch('supply_type');
  const watchedRoundOff = watch('round_off');

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
          setValue('invoice_date', initialData.invoice_date);
          setValue('due_date', initialData.due_date);
          setValue('business_profile_id', initialData.business_profile_id);
          setValue('customer_id', initialData.customer_id);
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
          setValue('round_off', initialData.round_off !== undefined ? initialData.round_off : true);
          
          // Set items - Clear all existing items first
          remove();
          
          // Add each item from initialData, ensuring no duplicates
          // Create a Set to track unique item IDs we've already added
          const addedItemIds = new Set();
          
          if (initialData.items && initialData.items.length > 0) {
            initialData.items.forEach((item: any) => {
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
                product_name: item.product_name || (item.product && item.product.name) || '',
                description: item.description || '',
                hsn_sac: item.hsn_sac || (item.product && item.product.hsn_sac) || '',
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
      setSelectedBusinessProfile(profile);
    }
    
    if (watchedCustomerId) {
      const customer = customers.find(c => c.id === watchedCustomerId);
      setSelectedCustomer(customer);
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
      const processedItems: InvoiceItem[] = currentItems.map((item) => {
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
      
      let response;
      
      if (isEditing && initialData?.id) {
        // Update existing invoice using the API utility
        response = await api.updateInvoice(initialData.id, payload);
        toast.success('Invoice updated successfully!');
      } else {
        // Create new invoice using the API utility
        response = await api.createInvoice(payload);
        toast.success('Invoice created successfully!');
      }
      
      // Redirect to invoice list
      router.push('/dashboard/invoices');
      router.refresh();
      
    } catch (err: any) {
      console.error('Error submitting invoice:', err);
      setError('Failed to create invoice');
      toast.error(err.message || 'An error occurred while saving the invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
      </h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Document Type */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <select
              {...register('document_type')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            >
              <option value="Invoice">Invoice</option>
              <option value="Credit Note">Credit Note</option>
              <option value="Debit Note">Debit Note</option>
            </select>
            {errors.document_type && (
              <p className="mt-1 text-sm text-red-600">{errors.document_type.message}</p>
            )}
          </div>

          {/* Supply Type */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Supply Type</label>
            <select
              {...register('supply_type')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            >
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
              <option value="Export with Tax">Export with Tax</option>
              <option value="Export without Tax">Export without Tax</option>
              <option value="SEZ with Tax">SEZ with Tax</option>
              <option value="SEZ without Tax">SEZ without Tax</option>
            </select>
            {errors.supply_type && (
              <p className="mt-1 text-sm text-red-600">{errors.supply_type.message}</p>
            )}
          </div>

          {/* Reference Number */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Reference Number</label>
            <input
              type="text"
              {...register('reference_number')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              placeholder="PO-12345"
            />
          </div>

          {/* Invoice Date */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1 required">Invoice Date</label>
            <input
              type="date"
              {...register('invoice_date')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            />
            {errors.invoice_date && (
              <p className="mt-1 text-sm text-red-600">{errors.invoice_date.message}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1 required">Due Date</label>
            <input
              type="date"
              {...register('due_date')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            />
            {errors.due_date && (
              <p className="mt-1 text-sm text-red-600">{errors.due_date.message}</p>
            )}
          </div>

          {/* Currency */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Currency</label>
            <input
              type="text"
              {...register('currency')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              placeholder="INR"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Profile */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1 required">Business Profile</label>
            <select
              {...register('business_profile_id', { valueAsNumber: true })}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            >
              <option value="">Select Business Profile</option>
              {businessProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            {errors.business_profile_id && (
              <p className="mt-1 text-sm text-red-600">{errors.business_profile_id.message}</p>
            )}
            
            {selectedBusinessProfile && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 border rounded-md text-sm">
                <p><strong>GSTIN:</strong> {selectedBusinessProfile.gstin}</p>
                <p><strong>State:</strong> {selectedBusinessProfile.state}</p>
                <p><strong>Address:</strong> {selectedBusinessProfile.address}</p>
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1 required">Customer</label>
            <select
              {...register('customer_id', { valueAsNumber: true })}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
            )}
            
            {selectedCustomer && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 border rounded-md text-sm">
                <p><strong>GSTIN:</strong> {
                  selectedCustomer.gstin 
                    ? selectedCustomer.gstin 
                    : (selectedCustomer.country && selectedCustomer.country !== 'India') 
                      ? 'URP' 
                      : 'N/A'
                }</p>
                <p><strong>State:</strong> {selectedCustomer.state}</p>
                <p><strong>Address:</strong> {selectedCustomer.address}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Place of Supply */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Place of Supply</label>
            <input
              type="text"
              {...register('place_of_supply')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              placeholder={selectedCustomer?.state || "Customer State"}
            />
          </div>

          {/* Port of Export (for international) */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Port of Export</label>
            <input
              type="text"
              {...register('port_of_export')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              placeholder="Optional, for exports"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dispatch From */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Dispatch From</label>
            <textarea
              {...register('dispatch_from')}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              placeholder={selectedBusinessProfile?.address || "Business Address"}
            />
          </div>

          {/* Ship To */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Ship To</label>
            <textarea
              {...register('ship_to')}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
              placeholder={selectedCustomer?.address || "Customer Address"}
            />
          </div>
        </div>

        {/* Invoice Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Invoice Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">HSN/SAC</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Disc %</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tax %</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {fields.map((field, index) => {
                  const productAmount = watchedItems[index]?.quantity * watchedItems[index]?.rate || 0;
                  const discountAmount = productAmount * (watchedItems[index]?.discount_percent || 0) / 100;
                  const taxableAmount = productAmount - discountAmount;
                  const totalAmount = taxableAmount * (1 + (watchedItems[index]?.tax_rate || 0) / 100);
                    
                  return (
                    <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-3 py-2">
                        <select
                          {...register(`items.${index}.product_id` as const, { valueAsNumber: true })}
                          className="w-full border border-gray-300 dark:border-gray-700 rounded p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                          onChange={(e) => {
                            const productId = parseInt(e.target.value, 10);
                            const product = products.find(p => p.id === productId);
                            if (product) {
                              setValue(`items.${index}.product_name`, product.name || '');
                              setValue(`items.${index}.description`, product.description || '');
                              setValue(`items.${index}.hsn_sac`, product.hsn_sac || '');
                              setValue(`items.${index}.rate`, product.price || 0);
                              setValue(`items.${index}.tax_rate`, product.tax_rate || 0);
                              setValue(`items.${index}.is_service`, product.is_service || false);
                            }
                          }}
                        >
                          <option value="0">Select Product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          {...register(`items.${index}.description` as const)}
                          className="w-full border border-gray-300 dark:border-gray-700 rounded p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          {...register(`items.${index}.hsn_sac` as const)}
                          className="w-32 border border-gray-300 dark:border-gray-700 rounded p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          {...register(`items.${index}.quantity` as const, {
                            valueAsNumber: true,
                          })}
                          step="0.001"
                          min="0"
                          className="w-20 border border-gray-300 dark:border-gray-700 rounded p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          {...register(`items.${index}.rate` as const, {
                            valueAsNumber: true,
                          })}
                          step="0.001"
                          min="0"
                          className="w-24 border border-gray-300 dark:border-gray-700 rounded p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          {...register(`items.${index}.discount_percent` as const, {
                            valueAsNumber: true,
                          })}
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-16 border border-gray-300 dark:border-gray-700 rounded p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          {...register(`items.${index}.tax_rate` as const, {
                            valueAsNumber: true,
                          })}
                          step="0.01"
                          min="0"
                          className="w-16 border border-gray-300 dark:border-gray-700 rounded p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        ₹{totalAmount.toFixed(3)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(index)}
                          className="inline-flex items-center justify-center p-1 text-white bg-red-500 hover:bg-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          title="Remove item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tax and Totals Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-medium mb-3">Notes</h3>
              <textarea
                {...register('notes')}
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
                placeholder="Payment terms, delivery instructions, etc."
              />
              <div className="mt-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    {...register('round_off')}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm">Round off to nearest rupee</span>
                </label>
              </div>
            </div>
              </div>
              
          <div className="col-span-1">
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-medium mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{taxSummary.subtotal.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>₹{taxSummary.discountTotal.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable Amount:</span>
                  <span>₹{(taxSummary.subtotal - taxSummary.discountTotal).toFixed(3)}</span>
                </div>
                
                {selectedBusinessProfile?.state === selectedCustomer?.state ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span>₹{taxSummary.cgstTotal.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span>₹{taxSummary.sgstTotal.toFixed(3)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>₹{taxSummary.igstTotal.toFixed(3)}</span>
                </div>
              )}
              
                {watch('round_off') && (
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span>₹{taxSummary.roundOff.toFixed(3)}</span>
              </div>
                )}
                
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 font-bold">
                  <span>Total:</span>
                  <span>₹{taxSummary.total.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Invoice' : 'Create Invoice'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 