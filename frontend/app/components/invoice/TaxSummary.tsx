'use client';

import React from 'react';
import { formatIndianCurrency } from '@/app/utils/taxCalculations';

interface TaxSummaryProps {
  taxBreakdown: {
    subTotal: number;
    discount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    cessAmount?: number;
    totalTax: number;
    grandTotal: number;
  };
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  paidAmount?: number;
}

export default function TaxSummary({ 
  taxBreakdown, 
  paymentStatus = 'unpaid',
  paidAmount = 0
}: TaxSummaryProps) {
  const {
    subTotal,
    discount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount = 0,
    totalTax,
    grandTotal
  } = taxBreakdown;

  // Calculate balance due
  const balanceDue = grandTotal - paidAmount;
  
  // Generate status badge color
  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unpaid':
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Invoice Summary</h3>
      
      <div className="space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
          <span>{formatIndianCurrency(subTotal)}</span>
        </div>
        
        {/* Discount if any */}
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Discount:</span>
            <span className="text-red-600 dark:text-red-400">-{formatIndianCurrency(discount)}</span>
          </div>
        )}
        
        {/* Taxable amount */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Taxable Amount:</span>
          <span>{formatIndianCurrency(taxableAmount)}</span>
        </div>
        
        {/* Tax breakdown - show only applicable taxes */}
        <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
          {cgstAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">CGST:</span>
              <span>{formatIndianCurrency(cgstAmount)}</span>
            </div>
          )}
          
          {sgstAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">SGST:</span>
              <span>{formatIndianCurrency(sgstAmount)}</span>
            </div>
          )}
          
          {igstAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">IGST:</span>
              <span>{formatIndianCurrency(igstAmount)}</span>
            </div>
          )}
          
          {cessAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Cess:</span>
              <span>{formatIndianCurrency(cessAmount)}</span>
            </div>
          )}
          
          {/* Total tax */}
          <div className="flex justify-between text-sm font-medium pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-700 dark:text-gray-300">Total Tax:</span>
            <span>{formatIndianCurrency(totalTax)}</span>
          </div>
        </div>
        
        {/* Grand total */}
        <div className="flex justify-between font-bold text-base pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Grand Total:</span>
          <span>{formatIndianCurrency(grandTotal)}</span>
        </div>
        
        {/* Payment status */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Payment Status:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
              {paymentStatus ? (paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)) : 'Unknown'}
            </span>
          </div>
          
          {/* Only show these fields for partial or paid status */}
          {paymentStatus !== 'unpaid' && (
            <>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600 dark:text-gray-400">Amount Paid:</span>
                <span className="text-green-600 dark:text-green-400">{formatIndianCurrency(paidAmount)}</span>
              </div>
              
              {paymentStatus === 'partial' && (
                <div className="flex justify-between text-sm mt-2 font-medium">
                  <span className="text-gray-700 dark:text-gray-300">Balance Due:</span>
                  <span className="text-red-600 dark:text-red-400">{formatIndianCurrency(balanceDue)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 