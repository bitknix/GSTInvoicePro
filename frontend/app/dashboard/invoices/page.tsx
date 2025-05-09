'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Eye, Pencil, Trash2, Send, FileCheck, CheckCircle, Archive } from 'lucide-react';
import api from '@/app/utils/api';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch invoices
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await api.getInvoices();
        setInvoices(data || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast.error('Failed to load invoices. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [router]);

  // Handle status change
  const handleStatusChange = async (invoiceId: number, newStatus: string) => {
    try {
      // Map UI statuses to API statuses
      let apiStatus: 'draft' | 'published' | 'approved';
      
      switch(newStatus) {
        case 'Draft':
          apiStatus = 'draft';
          break;
        case 'Finalized':
        case 'Sent':
        case 'E-Invoice':
          apiStatus = 'published';
          break;
        case 'GST-Filed':
        case 'Archived':
          apiStatus = 'approved';
          break;
        default:
          apiStatus = 'draft';
      }
      
      await api.updateInvoiceStatus(invoiceId, apiStatus);
      toast.success(`Invoice status updated to ${newStatus}`);
      
      // Refresh the invoice list
      const data = await api.getInvoices();
      setInvoices(data || []);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  // Handle invoice deletion
  const handleDelete = async (invoiceId: number) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.deleteInvoice(invoiceId);
      toast.success('Invoice deleted successfully');
      
      // Refresh the invoice list
      const data = await api.getInvoices();
      setInvoices(data || []);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  // Map API status to UI status
  const mapApiStatusToUiStatus = (apiStatus: string | undefined): string => {
    if (!apiStatus) return 'Draft'; // Default to Draft if status is undefined
    
    switch(apiStatus.toLowerCase()) {
      case 'draft':
        return 'Draft';
      case 'published':
        // Could be Finalized, Sent, or E-Invoice based on other factors
        // For simplicity, we'll return Finalized
        return 'Finalized';
      case 'approved':
        // Could be GST-Filed or Archived
        // For simplicity, we'll return GST-Filed
        return 'GST-Filed';
      default:
        return 'Draft';
    }
  };

  // Get status badge style
  const getStatusBadgeClass = (status: string | undefined) => {
    // Map API status to UI status first
    const uiStatus = mapApiStatusToUiStatus(status);
    
    switch(uiStatus) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Finalized':
        return 'bg-blue-100 text-blue-800';
      case 'Sent':
        return 'bg-indigo-100 text-indigo-800';
      case 'E-Invoice':
        return 'bg-purple-100 text-purple-800';
      case 'GST-Filed':
        return 'bg-green-100 text-green-800';
      case 'Archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment status badge style
  const getPaymentStatusBadgeClass = (status: string | undefined) => {
    if (!status) return 'bg-red-100 text-red-800'; // Default to Unpaid style
    
    // Map API status to UI status
    const uiStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    
    switch(uiStatus) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Partial':
        return 'bg-orange-100 text-orange-800';
      case 'Unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get action buttons based on status
  const getActionButtons = (invoice: any) => {
    if (!invoice) return null;
    
    const uiStatus = mapApiStatusToUiStatus(invoice.status);
    
    const viewButton = (
      <Link 
        href={`/dashboard/invoices/${invoice.id}`} 
        className="p-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
        title="View Invoice"
      >
        <Eye size={16} />
      </Link>
    );
    
    const editButton = uiStatus === 'Draft' ? (
      <Link 
        href={`/dashboard/invoices/${invoice.id}/edit`} 
        className="p-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
        title="Edit Invoice"
      >
        <Pencil size={16} />
      </Link>
    ) : null;
    
    const deleteButton = uiStatus === 'Draft' ? (
      <button 
        onClick={() => handleDelete(invoice.id)} 
        className="p-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-red-500 hover:text-red-700"
        title="Delete Invoice"
      >
        <Trash2 size={16} />
      </button>
    ) : null;
    
    // Status transition buttons
    let statusActionButton = null;
    
    switch(uiStatus) {
      case 'Draft':
        statusActionButton = (
          <button 
            onClick={() => handleStatusChange(invoice.id, 'Finalized')} 
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-blue-600 hover:text-blue-900"
            title="Finalize Invoice"
          >
            <FileCheck size={16} />
          </button>
        );
        break;
      case 'Finalized':
        statusActionButton = (
          <button 
            onClick={() => handleStatusChange(invoice.id, 'Sent')} 
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-indigo-600 hover:text-indigo-900"
            title="Mark as Sent"
          >
            <Send size={16} />
          </button>
        );
        break;
      case 'Sent':
        const isPaid = invoice.payment_status === 'paid';
        statusActionButton = (
          <button 
            onClick={() => handleStatusChange(invoice.id, isPaid ? 'Archived' : 'E-Invoice')} 
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-purple-600 hover:text-purple-900"
            title={isPaid ? "Archive Invoice" : "Mark as E-Invoice"}
          >
            {isPaid ? <Archive size={16} /> : <CheckCircle size={16} />}
          </button>
        );
        break;
      case 'E-Invoice':
        statusActionButton = (
          <button 
            onClick={() => handleStatusChange(invoice.id, 'GST-Filed')} 
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-green-600 hover:text-green-900"
            title="Mark as GST Filed"
          >
            <CheckCircle size={16} />
          </button>
        );
        break;
      case 'GST-Filed':
        statusActionButton = (
          <button 
            onClick={() => handleStatusChange(invoice.id, 'Archived')} 
            className="p-1 border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-yellow-600 hover:text-yellow-900"
            title="Archive Invoice"
          >
            <Archive size={16} />
          </button>
        );
        break;
    }
    
    return (
      <div className="flex justify-end space-x-2">
        {viewButton}
        {editButton}
        {statusActionButton}
        {deleteButton}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link 
          href="/dashboard/invoices/new" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create New Invoice
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don&apos;t have any invoices yet.</p>
          <Link 
            href="/dashboard/invoices/new" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{invoice.invoice_number || 'No Number'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'No Date'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {invoice.customer?.name || invoice.customer_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      ₹{invoice.grand_total || invoice.total ? (invoice.grand_total || invoice.total).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(invoice.status)}`}>
                        {mapApiStatusToUiStatus(invoice.status) || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusBadgeClass(invoice.payment_status)}`}>
                        {invoice.payment_status ? (invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)) : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {getActionButtons(invoice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 