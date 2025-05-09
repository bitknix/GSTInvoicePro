'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  FileText, 
  CreditCard, 
  DollarSign
} from 'lucide-react';
import { formatIndianCurrency } from '../utils/taxCalculations';
import api from '../utils/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Define types for dashboard data
interface BusinessProfile {
  id: number;
  name: string;
  is_default: boolean;
}

interface MonthlyData {
  month: string;
  cgst: number;
  sgst: number;
  igst: number;
}

interface Customer {
  id: number;
  name: string;
  totalAmount: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  grand_total: number;
  status: 'approved' | 'published' | 'draft';
}

interface DashboardData {
  totalInvoices: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  pendingPayments: number;
  topCustomers: Customer[];
  recentInvoices: Invoice[];
  monthlyData: MonthlyData[];
}

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData>({
    totalInvoices: 0,
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    pendingPayments: 0,
    topCustomers: [],
    recentInvoices: [],
    monthlyData: [],
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Get business profiles
        const profiles = await api.getBusinessProfiles();
        setBusinessProfiles(profiles || []);
        
        // Set default business profile if not already set
        if (!selectedBusinessId && profiles.length > 0) {
          const defaultProfile = profiles.find((profile: BusinessProfile) => profile.is_default) || profiles[0];
          setSelectedBusinessId(defaultProfile.id);
        }
        
        // Get dashboard data
        const params = new URLSearchParams();
        if (selectedBusinessId) params.append('business_id', selectedBusinessId.toString());
        params.append('year', selectedYear.toString());
        params.append('month', selectedMonth.toString());
        
        try {
          const data = await api.getDashboardData(`?${params.toString()}`);
          setDashboard(data);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
          // Fallback to empty data structure if API fails
          setDashboard({
            totalInvoices: 0,
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            pendingPayments: 0,
            topCustomers: [],
            recentInvoices: [],
            monthlyData: []
          });
        }
      } catch (error) {
        console.error('Error fetching business profiles:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [selectedBusinessId, selectedYear, selectedMonth]);

  // Chart data for monthly tax breakdown
  const monthlyChartData = {
    labels: dashboard.monthlyData.map((item: MonthlyData) => item.month),
    datasets: [
      {
        label: 'CGST',
        data: dashboard.monthlyData.map((item: MonthlyData) => item.cgst),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'SGST',
        data: dashboard.monthlyData.map((item: MonthlyData) => item.sgst),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'IGST',
        data: dashboard.monthlyData.map((item: MonthlyData) => item.igst),
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Chart data for customer contribution
  const customerChartData = {
    labels: dashboard.topCustomers.map((customer: Customer) => customer.name),
    datasets: [
      {
        label: 'Revenue',
        data: dashboard.topCustomers.map((customer: Customer) => customer.totalAmount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Handle business profile change
  const handleBusinessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = parseInt(e.target.value);
    setSelectedBusinessId(profileId || null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 sm:mb-0">Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Business profile selector */}
          <select
            value={selectedBusinessId || ''}
            onChange={handleBusinessChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            <option value="">All Business Profiles</option>
            {businessProfiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name} {profile.is_default && '(Default)'}
              </option>
            ))}
          </select>
          
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            {[2020, 2021, 2022, 2023, 2024, 2025].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

          {/* Create Invoice Button */}
          <button
            onClick={() => router.push('/dashboard/invoices/new')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
          >
            Create Invoice
          </button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mr-4">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoices</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{dashboard.totalInvoices}</h3>
            </div>
          </div>
        </div>
        
        {/* Total Tax */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mr-4">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tax Collected</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {formatIndianCurrency(dashboard.cgstAmount + dashboard.sgstAmount + dashboard.igstAmount)}
              </h3>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">CGST:</span>
              <span className="ml-1 text-blue-600 dark:text-blue-400">{formatIndianCurrency(dashboard.cgstAmount)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">SGST:</span>
              <span className="ml-1 text-green-600 dark:text-green-400">{formatIndianCurrency(dashboard.sgstAmount)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">IGST:</span>
              <span className="ml-1 text-purple-600 dark:text-purple-400">{formatIndianCurrency(dashboard.igstAmount)}</span>
            </div>
          </div>
        </div>
        
        {/* Taxable Amount */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 mr-4">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Taxable Amount</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {formatIndianCurrency(dashboard.taxableAmount)}
              </h3>
            </div>
          </div>
        </div>
        
        {/* Pending Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mr-4">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Payments</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {formatIndianCurrency(dashboard.pendingPayments)}
              </h3>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Tax Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Monthly Tax Breakdown</h2>
          <div className="h-64">
            <Bar 
              data={monthlyChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(156, 163, 175, 0.2)',
                    },
                    ticks: {
                      color: '#9CA3AF',
                    }
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: '#9CA3AF',
                    }
                  }
                },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      color: '#9CA3AF',
                    }
                  }
                }
              }}
            />
          </div>
        </div>
        
        {/* Customer Contribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Top Customers</h2>
          <div className="h-64 flex justify-center items-center">
            {dashboard.topCustomers.length > 0 ? (
              <Pie 
                data={customerChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        color: '#9CA3AF',
                      }
                    }
                  }
                }}
              />
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No customer data available</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Invoices */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Recent Invoices</h2>
          <button 
            onClick={() => router.push('/dashboard/invoices')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All
          </button>
        </div>
        
        {dashboard.recentInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice #</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {dashboard.recentInvoices.map((invoice: Invoice) => (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{invoice.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {formatIndianCurrency(invoice.grand_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'approved' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'published' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status ? 
                          (invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)) 
                          : 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No recent invoices found</p>
            <button 
              onClick={() => router.push('/dashboard/invoices/new')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Create Invoice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}