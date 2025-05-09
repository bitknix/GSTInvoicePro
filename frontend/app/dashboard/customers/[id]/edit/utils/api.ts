'use client';

import axios from 'axios';
import { toast } from 'react-toastify';

// Define type interfaces for API data
interface UserData {
  email: string;
  password: string;
  confirmPassword?: string;
  gstin?: string;
}

interface BusinessProfile {
  id: number;
  name: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  state_code?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
}

interface Customer {
  id?: number;
  name: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  state_code?: string;
  phone?: string;
  email?: string;
}

interface Product {
  id?: number;
  name: string;
  description?: string;
  hsn_sac?: string;
  is_service: boolean;
  tax_rate: number;
  unit?: string;
  price?: number;
}

interface InvoiceItem {
  id?: number;
  product_id?: number;
  product_name: string;
  description?: string;
  hsn_sac?: string;
  quantity: number;
  rate: number;
  discount?: number;
  tax_rate: number;
  total: number;
  is_service: boolean;
}

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
  items: InvoiceItem[];
}

// Get the API URL from environment or fallback to default
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1'; // API version prefix from backend config

// Create an axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token in every request
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from local storage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // If token exists, add it to request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const errorMessage = error.response?.data?.detail || 'An error occurred';
    
    // Handle session expiration
    if (status === 401) {
      toast.error('Your session has expired. Please log in again.');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/auth/login?session=expired';
      }
    } 
    // Handle validation errors
    else if (status === 422) {
      toast.error('Validation error: ' + errorMessage);
    }
    // Handle not found errors
    else if (status === 404) {
      toast.error('Not found: ' + errorMessage);
    }
    // Handle server errors
    else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// API utility functions
const api = {
  // Auth endpoints
  login: async (email: string, password: string) => {
    try {
      // Use form data format for FastAPI OAuth2 authentication
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await axiosInstance.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  register: async (userData: UserData) => {
    try {
      const response = await axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },
  
  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get('/users/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Business Profile endpoints
  getBusinessProfiles: async () => {
    try {
      const response = await axiosInstance.get('/business-profiles');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getBusinessProfile: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/business-profiles/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  createBusinessProfile: async (profileData: Omit<BusinessProfile, 'id'>) => {
    try {
      const response = await axiosInstance.post('/business-profiles', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateBusinessProfile: async (id: number, profileData: Partial<BusinessProfile>) => {
    try {
      const response = await axiosInstance.put(`/business-profiles/${id}`, profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  deleteBusinessProfile: async (id: number) => {
    try {
      const response = await axiosInstance.delete(`/business-profiles/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Customer endpoints
  getCustomers: async () => {
    try {
      const response = await axiosInstance.get('/customers');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getCustomer: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  createCustomer: async (customerData: Omit<Customer, 'id'>) => {
    try {
      const response = await axiosInstance.post('/customers', customerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateCustomer: async (id: number, customerData: Partial<Customer>) => {
    try {
      const response = await axiosInstance.put(`/customers/${id}`, customerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  deleteCustomer: async (id: number) => {
    try {
      const response = await axiosInstance.delete(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Product endpoints
  getProducts: async () => {
    try {
      const response = await axiosInstance.get('/products');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getProduct: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  createProduct: async (productData: Omit<Product, 'id'>) => {
    try {
      const response = await axiosInstance.post('/products', productData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateProduct: async (id: number, productData: Partial<Product>) => {
    try {
      const response = await axiosInstance.put(`/products/${id}`, productData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  deleteProduct: async (id: number) => {
    try {
      const response = await axiosInstance.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Invoice endpoints
  getInvoices: async (params?: { status?: string, month?: number, year?: number }) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.status) queryParams.append('status', params.status);
      if (params?.month) queryParams.append('month', params.month.toString());
      if (params?.year) queryParams.append('year', params.year.toString());
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await axiosInstance.get(`/invoices${queryString}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getInvoice: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  createInvoice: async (invoiceData: Omit<Invoice, 'id'>) => {
    try {
      const response = await axiosInstance.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateInvoice: async (id: number, invoiceData: Partial<Invoice>) => {
    try {
      const response = await axiosInstance.put(`/invoices/${id}`, invoiceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateInvoiceStatus: async (id: number, status: 'draft' | 'published' | 'approved') => {
    try {
      const response = await axiosInstance.patch(`/invoices/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  deleteInvoice: async (id: number) => {
    try {
      const response = await axiosInstance.delete(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  generateInvoicePdf: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Export endpoints
  exportInvoiceJson: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/exports/invoice/${id}/json`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  importInvoiceJson: async (jsonData: Record<string, unknown>) => {
    try {
      // Format the data for the API
      // First try to extract invoice data according to our expected structure
      const formattedData: Record<string, unknown> = {};
      
      // Format the business profile data
      if (jsonData.business_profile_details) {
        const businessProfileData = jsonData.business_profile_details as Record<string, unknown>;
        // Try to find a matching business profile
        const businessProfiles = await axiosInstance.get('/business-profiles');
        const profiles = businessProfiles.data || [];
        
        let matchedProfile = null;
        if (businessProfileData.gstin) {
          // Try to match by GSTIN
          matchedProfile = profiles.find((p: any) => 
            p.gstin === businessProfileData.gstin
          );
        }
        
        if (!matchedProfile && businessProfileData.name) {
          // Try to match by name
          matchedProfile = profiles.find((p: any) => 
            p.name === businessProfileData.name
          );
        }
        
        if (!matchedProfile && profiles.length > 0) {
          // Fallback to default profile or first one
          matchedProfile = profiles.find((p: any) => p.is_default) || profiles[0];
        }
        
        if (matchedProfile) {
          formattedData.business_profile_id = matchedProfile.id;
        } else {
          // No matching profile found
          throw new Error("No matching business profile found. Please create a business profile first.");
        }
      }
      
      // Format the customer data
      if (jsonData.customer_details) {
        const customerData = jsonData.customer_details as Record<string, unknown>;
        // Try to find a matching customer
        const customers = await axiosInstance.get('/customers');
        const customerList = customers.data || [];
        
        let matchedCustomer = null;
        if (customerData.gstin) {
          // Try to match by GSTIN
          matchedCustomer = customerList.find((c: any) => 
            c.gstin === customerData.gstin
          );
        }
        
        if (!matchedCustomer && customerData.name) {
          // Try to match by name
          matchedCustomer = customerList.find((c: any) => 
            c.name === customerData.name
          );
        }
        
        if (matchedCustomer) {
          formattedData.customer_id = matchedCustomer.id;
        } else if (customerData.name) {
          // Create a new customer
          try {
            const newCustomer = await axiosInstance.post('/customers', {
              name: customerData.name,
              gstin: customerData.gstin || '',
              address: customerData.address || '',
              city: customerData.city || '',
              state: customerData.state || '',
              state_code: customerData.state_code || '',
            });
            
            formattedData.customer_id = newCustomer.data.id;
          } catch (err) {
            console.error('Failed to create customer:', err);
            throw new Error("Failed to create a new customer from the JSON data.");
          }
        } else {
          throw new Error("No customer information found in the JSON data.");
        }
      }
      
      // Format other invoice data
      formattedData.invoice_number = jsonData.invoice_number || '';
      formattedData.invoice_date = jsonData.invoice_date || new Date().toISOString().split('T')[0];
      
      // Format the line items
      if (jsonData.items && Array.isArray(jsonData.items)) {
        const items = jsonData.items as Array<Record<string, unknown>>;
        
        formattedData.items = items.map(item => ({
          product_name: item.product_name || 'Product',
          description: item.description || '',
          hsn_sac: item.hsn_sac || '',
          is_service: item.is_service || false,
          quantity: item.quantity || 1,
          rate: item.rate || 0,
          discount: item.discount || 0,
          tax_rate: item.tax_rate || 18,
        }));
      }
      
      // Format tax amounts
      formattedData.taxable_amount = jsonData.taxable_amount || 0;
      formattedData.cgst_amount = jsonData.cgst_amount || 0;
      formattedData.sgst_amount = jsonData.sgst_amount || 0;
      formattedData.igst_amount = jsonData.igst_amount || 0;
      formattedData.total_tax = (Number(jsonData.cgst_amount || 0) + 
                                Number(jsonData.sgst_amount || 0) + 
                                Number(jsonData.igst_amount || 0));
      formattedData.grand_total = jsonData.grand_total || 0;
      
      // Set default status
      formattedData.status = 'draft';
      formattedData.payment_status = jsonData.payment_status || 'unpaid';
      
      // Call API to create invoice
      const response = await axiosInstance.post('/invoices', formattedData);
      return response.data;
    } catch (error) {
      console.error('Error importing invoice from JSON:', error);
      throw error;
    }
  },
  
  exportInvoicesToCsv: async (year: number, month: number, businessProfileId?: number) => {
    try {
      let url = `/exports/invoice/csv?year=${year}&month=${month}`;
      if (businessProfileId) {
        url += `&business_profile_id=${businessProfileId}`;
      }
      
      const response = await axiosInstance.get(url, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  exportInvoicesToExcel: async (year: number, month: number, businessProfileId?: number) => {
    try {
      let url = `/exports/invoice/excel?year=${year}&month=${month}`;
      if (businessProfileId) {
        url += `&business_profile_id=${businessProfileId}`;
      }
      
      const response = await axiosInstance.get(url, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Summary endpoints
  getMonthlySummary: async (query: string) => {
    try {
      const response = await axiosInstance.get(`/summary/monthly${query}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Dashboard data
  getDashboardData: async (query: string) => {
    try {
      // Temporary implementation until the backend supports this endpoint
      // First try to get some real data for invoices to show in the dashboard
      const invoicesResponse = await axiosInstance.get(`/invoices${query}`);
      const invoices = invoicesResponse.data || [];
      
      // Calculate some basic metrics from the invoices
      let totalInvoices = invoices.length;
      let taxableAmount = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      let pendingPayments = 0;
      
      // Process invoice data
      invoices.forEach((invoice: any) => {
        taxableAmount += invoice.taxable_amount || 0;
        cgstAmount += invoice.cgst_amount || 0;
        sgstAmount += invoice.sgst_amount || 0;
        igstAmount += invoice.igst_amount || 0;
        
        // Calculate pending payments
        if (invoice.payment_status === 'unpaid') {
          pendingPayments += invoice.grand_total || 0;
        } else if (invoice.payment_status === 'partial') {
          pendingPayments += (invoice.grand_total || 0) - (invoice.paid_amount || 0);
        }
      });
      
      // Generate monthly data based on available months
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      const monthlyData = monthNames.map((month, index) => {
        // Filter invoices for this month
        const monthInvoices = invoices.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.invoice_date);
          return invoiceDate.getMonth() === index;
        });
        
        // Calculate totals
        let monthlyCgst = 0;
        let monthlySgst = 0;
        let monthlyIgst = 0;
        
        monthInvoices.forEach((invoice: any) => {
          monthlyCgst += invoice.cgst_amount || 0;
          monthlySgst += invoice.sgst_amount || 0;
          monthlyIgst += invoice.igst_amount || 0;
        });
        
        return {
          month,
          cgst: monthlyCgst,
          sgst: monthlySgst,
          igst: monthlyIgst
        };
      });
      
      // Calculate top customers
      const customers: Record<string, { id: number, name: string, totalAmount: number }> = {};
      
      invoices.forEach((invoice: any) => {
        const customerId = invoice.customer_id;
        const customerName = invoice.customer_name || 'Unknown';
        const amount = invoice.grand_total || 0;
        
        if (!customers[customerId]) {
          customers[customerId] = { id: customerId, name: customerName, totalAmount: 0 };
        }
        
        customers[customerId].totalAmount += amount;
      });
      
      const topCustomers = Object.values(customers)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);
      
      // Sort recent invoices by date
      const recentInvoices = [...invoices]
        .sort((a: any, b: any) => {
          return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
        })
        .slice(0, 5)
        .map((invoice: any) => ({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          invoice_date: invoice.invoice_date,
          grand_total: invoice.grand_total,
          payment_status: invoice.payment_status
        }));
      
      // Return the assembled dashboard data
      return {
        totalInvoices,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        pendingPayments,
        topCustomers,
        recentInvoices,
        monthlyData
      };
    } catch (error) {
      console.error('Error generating dashboard data:', error);
      // Return empty data structure if all fails
      return {
        totalInvoices: 0,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        pendingPayments: 0,
        topCustomers: [],
        recentInvoices: [],
        monthlyData: []
      };
    }
  },
  
  // HSN/SAC code validation
  validateHsnCode: async (hsnCode: string) => {
    try {
      const response = await axiosInstance.post('/exports/validate-hsn', { hsn_code: hsnCode });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // GSTIN validation
  validateGstin: async (gstin: string) => {
    try {
      const response = await axiosInstance.post('/exports/validate-gstin', { gstin });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api; 