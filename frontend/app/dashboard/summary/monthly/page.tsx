'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileDown, 
  FileText, 
  Download, 
  Filter,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { formatIndianCurrency } from '@/app/utils/taxCalculations';
import api from '@/app/utils/api';
import { toast } from 'react-toastify';

// Add BusinessProfile interface
interface BusinessProfile {
  id: number;
  name: string;
  is_default: boolean;
}

interface InvoiceData {
  id: number;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  grand_total: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
}

export default function MonthlySummary() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    businessId: 0,
    showFilters: false,
  });
  
  // Sort state
  const [sort, setSort] = useState({
    field: 'invoice_date',
    direction: 'desc' as 'asc' | 'desc',
  });
  
  // Data state
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [summaryData, setSummaryData] = useState<{
    totalInvoices: number;
    totalTaxableAmount: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalAmount: number;
    invoices: InvoiceData[];
  }>({
    totalInvoices: 0,
    totalTaxableAmount: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalAmount: 0,
    invoices: [],
  });
  
  // Fetch data on mount and when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch business profiles
        const profiles = await api.getBusinessProfiles();
        setBusinessProfiles(profiles || []);
        
        // Set initial business profile if not set
        if (filters.businessId === 0 && profiles.length > 0) {
          const defaultProfile = profiles.find((profile: BusinessProfile) => profile.is_default) || profiles[0];
          setFilters(prev => ({ ...prev, businessId: defaultProfile.id }));
        }
        
        // Fetch monthly summary data
        if (filters.businessId) {
          const params = new URLSearchParams({
            year: filters.year.toString(),
            month: filters.month.toString(),
            business_id: filters.businessId.toString(),
            sort_by: sort.field,
            sort_order: sort.direction,
          });
          
          const data = await api.getMonthlySummary(`?${params.toString()}`);
          setSummaryData(data);
        }
      } catch (error) {
        console.error('Error fetching summary data:', error);
        toast.error('Failed to load summary data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [filters.year, filters.month, filters.businessId, sort]);
  
  // Handle sort change
  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  
  // Handle filter change
  const handleFilterChange = (field: string, value: string | number | boolean) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  // Toggle filter panel
  const toggleFilters = () => {
    setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }));
  };
  
  // Export functions
  const exportCSV = async () => {
    if (!filters.businessId) {
      toast.error('Please select a business profile');
      return;
    }
    
    setExporting(true);
    try {
      const params = new URLSearchParams({
        year: filters.year.toString(),
        month: filters.month.toString(),
        business_id: filters.businessId.toString(),
      });
      
      const response = await fetch(`/api/v1/summary/export-csv?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }
      
      // Get the CSV as blob
      const blob = await response.blob();
      
      // Create URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Format: GST_Summary_Jan_2024.csv
      const monthName = new Date(filters.year, filters.month - 1).toLocaleString('default', { month: 'short' });
      a.download = `GST_Summary_${monthName}_${filters.year}.csv`;
      
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };
  
  const exportExcel = async () => {
    if (!filters.businessId) {
      toast.error('Please select a business profile');
      return;
    }
    
    setExporting(true);
    try {
      const params = new URLSearchParams({
        year: filters.year.toString(),
        month: filters.month.toString(),
        business_id: filters.businessId.toString(),
      });
      
      const response = await fetch(`/api/v1/summary/export-excel?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }
      
      // Get the Excel as blob
      const blob = await response.blob();
      
      // Create URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Format: GST_Summary_Jan_2024.xlsx
      const monthName = new Date(filters.year, filters.month - 1).toLocaleString('default', { month: 'short' });
      a.download = `GST_Summary_${monthName}_${filters.year}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };
  
  const exportPDF = async () => {
    if (!filters.businessId) {
      toast.error('Please select a business profile');
      return;
    }
    
    setExporting(true);
    try {
      const params = new URLSearchParams({
        year: filters.year.toString(),
        month: filters.month.toString(),
        business_id: filters.businessId.toString(),
      });
      
      const response = await fetch(`/api/v1/summary/export-pdf?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }
      
      // Get the PDF as blob
      const blob = await response.blob();
      
      // Create URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Format: GST_Summary_Jan_2024.pdf
      const monthName = new Date(filters.year, filters.month - 1).toLocaleString('default', { month: 'short' });
      a.download = `GST_Summary_${monthName}_${filters.year}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };
  
  if (loading && !summaryData.invoices.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Monthly GST Summary</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and export your monthly GST tax breakdown
        </p>
      </div>
      
      {/* Filter and Export Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <button
            onClick={toggleFilters}
            className="flex items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
            {filters.showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </button>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <button
              onClick={exportPDF}
              disabled={exporting || !summaryData.invoices.length}
              className="inline-flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/30 dark:hover:bg-blue-900/40 disabled:opacity-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </button>
            
            <button
              onClick={exportExcel}
              disabled={exporting || !summaryData.invoices.length}
              className="inline-flex items-center rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-700/10 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-400/30 dark:hover:bg-green-900/40 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Excel
            </button>
            
            <button
              onClick={exportCSV}
              disabled={exporting || !summaryData.invoices.length}
              className="inline-flex items-center rounded-md bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-400/30 dark:hover:bg-purple-900/40 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </button>
          </div>
        </div>
        
        {/* Filter Panel */}
        {filters.showFilters && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Business Profile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Profile
              </label>
              <select
                value={filters.businessId}
                onChange={(e) => handleFilterChange('businessId', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Select Business</option>
                {businessProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} {profile.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Month
              </label>
              <select
                value={filters.month}
                onChange={(e) => handleFilterChange('month', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Invoices</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{summaryData.totalInvoices}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Taxable Amount</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(summaryData.totalTaxableAmount)}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">CGST</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(summaryData.totalCgst)}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">SGST</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(summaryData.totalSgst)}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">IGST</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(summaryData.totalIgst)}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Amount</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(summaryData.totalAmount)}</p>
        </div>
      </div>
      
      {/* Invoice Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Invoice List</h2>
        </div>
        
        {summaryData.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('invoice_number')}
                  >
                    <div className="flex items-center">
                      Invoice #
                      {sort.field === 'invoice_number' && (
                        sort.direction === 'asc' ? 
                          <ChevronUp className="h-4 w-4 ml-1" /> : 
                          <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('invoice_date')}
                  >
                    <div className="flex items-center">
                      Date
                      {sort.field === 'invoice_date' && (
                        sort.direction === 'asc' ? 
                          <ChevronUp className="h-4 w-4 ml-1" /> : 
                          <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('customer_name')}
                  >
                    <div className="flex items-center">
                      Customer
                      {sort.field === 'customer_name' && (
                        sort.direction === 'asc' ? 
                          <ChevronUp className="h-4 w-4 ml-1" /> : 
                          <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('taxable_amount')}
                  >
                    <div className="flex items-center">
                      Taxable Amount
                      {sort.field === 'taxable_amount' && (
                        sort.direction === 'asc' ? 
                          <ChevronUp className="h-4 w-4 ml-1" /> : 
                          <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    CGST
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    SGST
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    IGST
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('grand_total')}
                  >
                    <div className="flex items-center">
                      Total
                      {sort.field === 'grand_total' && (
                        sort.direction === 'asc' ? 
                          <ChevronUp className="h-4 w-4 ml-1" /> : 
                          <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('payment_status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sort.field === 'payment_status' && (
                        sort.direction === 'asc' ? 
                          <ChevronUp className="h-4 w-4 ml-1" /> : 
                          <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {summaryData.invoices.map((invoice: InvoiceData) => (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{invoice.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatIndianCurrency(invoice.taxable_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatIndianCurrency(invoice.cgst_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatIndianCurrency(invoice.sgst_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatIndianCurrency(invoice.igst_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatIndianCurrency(invoice.grand_total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.payment_status ? 
                          (invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)) 
                          : 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center">
            <Search className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No invoices found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filters.businessId ? 'Try changing your filters or select a different month.' : 'Please select a business profile to view invoices.'}
            </p>
          </div>
        )}
      </div>
      
      {/* Export loading indicator */}
      {exporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700 dark:text-gray-300">Generating export file...</p>
          </div>
        </div>
      )}
    </div>
  );
} 