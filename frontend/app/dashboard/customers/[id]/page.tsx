'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import api from './utils/api';

interface Customer {
  id: number;
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email: string;
  notes: string;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch customer data
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const data = await api.getCustomer(parseInt(customerId));
        if (data) {
          setCustomer(data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError(true);
        toast.error('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId, router]);

  const handleDelete = async () => {
    if (!customer) return;
    
    try {
      await api.deleteCustomer(customer.id);
      toast.success('Customer deleted successfully');
      router.push('/dashboard/customers');
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('Failed to delete customer');
    }
  };

  const openDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Customer Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The customer you are looking for doesn&apos;t exist or was deleted.
          </p>
          <Link
            href="/dashboard/customers"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Customer Details
        </h1>
        <div className="mt-4 md:mt-0 space-x-3 flex">
          <Link
            href="/dashboard/customers"
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to List
          </Link>
          <Link
            href={`/dashboard/customers/${customer.id}/edit`}
            className="p-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={openDeleteConfirm}
            className="p-2 border border-gray-300 rounded hover:bg-gray-100 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Customer Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-base text-gray-900 dark:text-white">{customer.name}</p>
              </div>
              
              {customer.gstin && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">GSTIN</p>
                  <p className="text-base text-gray-900 dark:text-white">{customer.gstin}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {customer.address}<br />
                  {customer.city}, {customer.state} - {customer.pincode}<br />
                  {customer.country}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Contact Information</h2>
            <div className="space-y-4">
              {customer.email && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-base text-gray-900 dark:text-white">{customer.email}</p>
                </div>
              )}
              
              {customer.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-base text-gray-900 dark:text-white">{customer.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notes</h2>
            <p className="text-base text-gray-900 dark:text-white whitespace-pre-line">{customer.notes}</p>
          </div>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Are you sure?</h3>
            <p className="text-gray-500 mb-6">
              This will permanently delete the customer "{customer.name}".
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 