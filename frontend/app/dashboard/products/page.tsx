'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';

interface Product {
  id: number;
  name: string;
  hsn_sac: string;
  sku: string;
  is_service: boolean;
  tax_rate: number;
  unit: string;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch products
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts();
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [router]);

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    
    try {
      await api.deleteProduct(deleteProductId);
      toast.success('Product deleted successfully');
      // Refresh product list
      const updatedProducts = products.filter(p => p.id !== deleteProductId);
      setProducts(updatedProducts);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      
      // Display a more helpful error message
      let errorMessage = 'Failed to delete product';
      
      if (error.response) {
        // Extract the error message from the response if available
        const responseData = error.response.data;
        if (responseData && responseData.detail) {
          errorMessage = responseData.detail;
        } else if (error.response.status === 400) {
          errorMessage = 'This product is used in invoices. Cannot delete.';
        } else if (error.response.status === 404) {
          errorMessage = 'Product not found.';
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to delete this product.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteProductId(null);
    }
  };

  const openDeleteConfirm = (id: number) => {
    setDeleteProductId(id);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold">Products & Services</h1>
          <p className="text-gray-500">Manage your products and services for invoices</p>
        </div>
        <Link 
          href="/dashboard/products/new" 
          className="px-4 py-2 bg-blue-600 text-white rounded flex items-center hover:bg-blue-700 w-full md:w-auto justify-center md:justify-start"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don&apos;t have any products or services yet.</p>
          <Link 
            href="/dashboard/products/new" 
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center mx-auto hover:bg-blue-700 w-fit"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">HSN/SAC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">Tax Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">Unit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.hsn_sac || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.is_service 
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {product.is_service ? 'Service' : 'Product'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.tax_rate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.unit || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/dashboard/products/${product.id}`}>
                          <button className="p-1 border border-gray-300 rounded hover:bg-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </Link>
                        <Link href={`/dashboard/products/${product.id}/edit`}>
                          <button className="p-1 border border-gray-300 rounded hover:bg-gray-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          className="p-1 border border-gray-300 rounded hover:bg-gray-100 text-red-500 hover:text-red-700"
                          onClick={() => openDeleteConfirm(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && deleteProductId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Are you sure?</h3>
            <p className="text-gray-500 mb-6">
              This will permanently delete the product 
              "{products.find(p => p.id === deleteProductId)?.name}".
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteProductId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
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