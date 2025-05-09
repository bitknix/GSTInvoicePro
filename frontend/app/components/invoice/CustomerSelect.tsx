'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, Phone, MapPin } from 'lucide-react';
import { Control, Controller } from 'react-hook-form';
import { validateGSTIN } from '@/app/utils/taxCalculations';

interface Customer {
  id: number;
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
  address?: string;
  state: string;
}

interface CustomerSelectProps {
  customers: Customer[];
  control: Control<any>;
  errors: any;
  defaultValue?: number;
  onCustomerChange?: (customer: Customer | null) => void;
}

export default function CustomerSelect({
  customers,
  control,
  errors,
  defaultValue,
  onCustomerChange
}: CustomerSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(customers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }
    
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(lowercasedSearch) ||
      (customer.gstin && customer.gstin.toLowerCase().includes(lowercasedSearch)) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.email && customer.email.toLowerCase().includes(lowercasedSearch))
    );
    
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  // Set initial selection if default value is provided
  useEffect(() => {
    if (defaultValue) {
      const initialCustomer = customers.find(c => c.id === defaultValue);
      if (initialCustomer) {
        setSelectedCustomer(initialCustomer);
        if (onCustomerChange) {
          onCustomerChange(initialCustomer);
        }
      }
    }
  }, [defaultValue, customers, onCustomerChange]);

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsOpen(false);
    setSearchTerm('');
    
    if (onCustomerChange) {
      onCustomerChange(customer);
    }
  };

  // Get GSTIN validation details
  const getGstinInfo = (gstin?: string) => {
    if (!gstin) return null;
    
    const validation = validateGSTIN(gstin);
    if (validation.valid && validation.state) {
      return `GSTIN: ${gstin} (${validation.state})`;
    }
    
    return `GSTIN: ${gstin}`;
  };

  return (
    <div className="relative mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Customer <span className="text-red-500">*</span>
      </label>
      
      <Controller
        control={control}
        name="customer_id"
        render={({ field }) => (
          <>
            {/* Hidden field to store the customer ID */}
            <input 
              type="hidden" 
              value={field.value || ''} 
            />
            
            {/* Customer selector UI */}
            <div className="relative">
              {/* Search input */}
              <div 
                className={`flex items-center border ${errors.customer_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md px-3 py-2 bg-white dark:bg-gray-700 cursor-pointer`}
                onClick={() => setIsOpen(true)}
              >
                <Search className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                
                {selectedCustomer ? (
                  <div className="flex-grow truncate">
                    <div className="font-medium">{selectedCustomer.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {getGstinInfo(selectedCustomer.gstin) || selectedCustomer.state}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Select a customer</span>
                )}
              </div>
              
              {/* Error message */}
              {errors.customer_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.customer_id.message}</p>
              )}
              
              {/* Dropdown panel */}
              {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                  {/* Search box */}
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search customers..."
                        className="w-full px-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                  </div>
                  
                  {/* Customer list */}
                  <div>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(customer => (
                        <div
                          key={customer.id}
                          className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                          onClick={() => {
                            handleCustomerSelect(customer);
                            field.onChange(customer.id);
                          }}
                        >
                          <div className="font-medium">{customer.name}</div>
                          {customer.gstin && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center mt-1">
                              {getGstinInfo(customer.gstin)}
                            </div>
                          )}
                          <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>{customer.state}</span>
                            {customer.phone && (
                              <>
                                <span className="mx-2">•</span>
                                <Phone className="w-3 h-3 mr-1" />
                                <span>{customer.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                        No customers found. Try a different search.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Selected customer details */}
            {selectedCustomer && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-sm flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  Customer Details
                </h4>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Name:</span> {selectedCustomer.name}
                  </div>
                  {selectedCustomer.gstin && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">GSTIN:</span> {selectedCustomer.gstin}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">State:</span> {selectedCustomer.state}
                  </div>
                  {selectedCustomer.phone && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Phone:</span> {selectedCustomer.phone}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Email:</span> {selectedCustomer.email}
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Address:</span> {selectedCustomer.address}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      />
    </div>
  );
} 