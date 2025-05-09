'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

interface InvoiceStatusProps {
  invoiceId: number;
  currentStatus: 'draft' | 'published' | 'approved';
  onStatusChange?: (newStatus: 'draft' | 'published' | 'approved') => void;
  disableActions?: boolean;
}

export default function InvoiceStatus({ 
  invoiceId, 
  currentStatus, 
  onStatusChange,
  disableActions = false 
}: InvoiceStatusProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Status colors and labels
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: (
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
            </svg>
          ),
          label: 'Draft'
        };
      case 'published':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: (
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
            </svg>
          ),
          label: 'Published'
        };
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: (
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
            </svg>
          ),
          label: 'Approved'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null,
          label: 'Unknown'
        };
    }
  };
  
  const statusDetails = getStatusDetails(currentStatus);
  
  // Determine the next possible status transitions
  const canPublish = currentStatus === 'draft' && !disableActions;
  const canApprove = currentStatus === 'published' && !disableActions;
  const canRevertToDraft = currentStatus === 'published' && !disableActions;
  
  // Update invoice status
  const updateStatus = async (newStatus: 'draft' | 'published' | 'approved') => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await api.updateInvoiceStatus(invoiceId, newStatus);
      
      // Update status in parent component if callback is provided
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
      toast.success(`Invoice ${newStatus === 'draft' ? 'reverted to draft' : `${newStatus}`}`);
    } catch (error: unknown) {
      console.error('Error updating invoice status:', error);
      // Check if error is an object with response property
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
        const errorDetail = error.response.data.detail;
        toast.error(typeof errorDetail === 'string' ? errorDetail : `Failed to update invoice status to ${newStatus}`);
      } else {
        toast.error(`Failed to update invoice status to ${newStatus}`);
      }
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
      {/* Current Status Badge */}
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusDetails.color} border`}>
        {statusDetails.icon}
        {statusDetails.label}
      </div>
      
      {/* Status Actions */}
      {(canPublish || canApprove || canRevertToDraft) && (
        <div className="flex space-x-2">
          {canPublish && (
            <button
              onClick={() => updateStatus('published')}
              disabled={isUpdating}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isUpdating ? 'Publishing...' : 'Publish Invoice'}
            </button>
          )}
          
          {canApprove && (
            <button
              onClick={() => updateStatus('approved')}
              disabled={isUpdating}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isUpdating ? 'Approving...' : 'Approve Invoice'}
            </button>
          )}
          
          {canRevertToDraft && (
            <button
              onClick={() => updateStatus('draft')}
              disabled={isUpdating}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isUpdating ? 'Reverting...' : 'Revert to Draft'}
            </button>
          )}
        </div>
      )}
      
      {/* Status Explanation */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {currentStatus === 'draft' && (
          <span>Draft invoices can be edited and are not visible to customers</span>
        )}
        {currentStatus === 'published' && (
          <span>Published invoices are ready for customer review</span>
        )}
        {currentStatus === 'approved' && (
          <span>Approved invoices are final and cannot be modified</span>
        )}
      </div>
    </div>
  );
} 