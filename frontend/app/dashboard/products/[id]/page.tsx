'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await api.getProduct(parseInt(productId));
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product details');
        router.push('/dashboard/products');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Product not found.</p>
          <Link
            href="/dashboard/products"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Link href="/dashboard/products" className="mr-4">
            <button className="p-2 border border-gray-300 rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {product.name}
          </h1>
        </div>
        <Link href={`/dashboard/products/${productId}/edit`}>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </button>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.is_service 
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {product.is_service ? 'Service' : 'Product'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">HSN/SAC Code</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{product.hsn_sac || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SKU</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{product.sku || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unit</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{product.unit || '-'}</p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-medium mb-4">Pricing & Tax</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  ₹{product.price?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tax Rate</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{product.tax_rate}%</p>
              </div>
            </div>
          </div>
          {!product.is_service && (
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium mb-4 mt-4">Inventory Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Stock</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {product.stock_quantity !== null ? product.stock_quantity : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Low Stock Alert</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {product.low_stock_threshold !== null ? product.low_stock_threshold : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
          {product.description && (
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium mb-4">Description</h2>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 