'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { isTokenExpired, handleLogout } from './apiUtils';

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
  country?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface Product {
  id?: number;
  name: string;
  description?: string;
  hsn_sac?: string;
  sku?: string;
  is_service: boolean;
  tax_rate: number;
  unit?: string;
  price?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
}

interface InvoiceItem {
  id?: number;
  product_id?: number;
  product_name: string;
  description?: string;
  hsn_sac: string;
  quantity: number;
  rate: number;
  discount_percent?: number;
  discount_amount?: number;
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
  
  // New fields
  document_type: 'Invoice' | 'Credit Note' | 'Debit Note';
  supply_type: 'B2B' | 'B2C' | 'Export with Tax' | 'Export without Tax' | 'SEZ with Tax' | 'SEZ without Tax';
  reference_number?: string;
  place_of_supply?: string;
  dispatch_from?: string;
  ship_to?: string;
  currency?: string;
  port_of_export?: string;
  discount_amount?: number;
  round_off?: number;
  
  // E-Invoice fields
  irn?: string;
  ack_no?: string;
  ack_date?: string;
  signed_invoice?: string;
  qr_code?: string;
  
  // E-way bill fields
  ewb_no?: string;
  ewb_date?: string;
  ewb_valid_till?: string;
  
  // Import flag
  is_imported?: boolean;
  
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
    
    // If token exists, check if it's expired
    if (token) {
      // If token is expired, clean up and don't add it to request
      if (isTokenExpired(token)) {
        if (typeof window !== 'undefined') {
          // Only redirect if not already on auth page
          const path = window.location.pathname;
          if (!path.includes('/auth/')) {
            handleLogout('Your session has expired. Please log in again.');
          }
        }
        // Don't continue with the request as it would fail with 401
        throw new axios.Cancel('Token expired');
      }
      
      // If token is valid, add it to request headers
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
    // Don't process if request was cancelled due to token expiration
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    
    const status = error.response?.status;
    const errorMessage = error.response?.data?.detail || 'An error occurred';
    
    // Handle session expiration
    if (status === 401) {
      if (typeof window !== 'undefined') {
        handleLogout('Your session has expired. Please log in again.');
      }
    } 
    // Handle validation errors
    else if (status === 422) {
      const errorDetails = error.response?.data?.detail || [];
      if (Array.isArray(errorDetails)) {
        const errorsFormatted = errorDetails.map((err: any) => `${err.loc?.join('.')} - ${err.msg}`).join(', ');
        toast.error(`Validation error: ${errorsFormatted || errorMessage}`);
      } else {
        toast.error('Validation error: ' + errorMessage);
      }
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
    handleLogout();
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
      const response = await axiosInstance.get('/business-profiles/');
      return response.data;
    } catch (error) {
      console.error('Error fetching business profiles:', error);
      throw error;
    }
  },
  
  getBusinessProfile: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/business-profiles/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching business profile with id ${id}:`, error);
      throw error;
    }
  },
  
  createBusinessProfile: async (profileData: any) => {
    try {
      const response = await axiosInstance.post('/business-profiles/', profileData);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
  
  updateBusinessProfile: async (id: number, profileData: any) => {
    try {
      const response = await axiosInstance.put(`/business-profiles/${id}/`, profileData);
      return response.data;
    } catch (error) {
      console.error(`Error updating business profile with id ${id}:`, error);
      throw error;
    }
  },
  
  deleteBusinessProfile: async (id: number) => {
    try {
      const response = await axiosInstance.delete(`/business-profiles/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting business profile with id ${id}:`, error);
      throw error;
    }
  },
  
  setDefaultBusinessProfile: async (id: number) => {
    try {
      const response = await axiosInstance.put(`/business-profiles/${id}/default/`);
      return response.data;
    } catch (error) {
      console.error(`Error setting business profile with id ${id} as default:`, error);
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      console.log('Generating PDF for invoice ID:', id);
      
      // Increase timeout for PDF generation
      const response = await axiosInstance.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Accept': 'application/pdf',
        }
      });
      
      // Validate that we received a PDF blob
      if (response.data.type !== 'application/pdf') {
        console.error('Invalid response type:', response.data.type);
        throw new Error('Server did not return a valid PDF file');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error in generateInvoicePdf:', error);
      // Re-throw with better error message
      if (error.message === 'Network Error') {
        throw new Error('Network error while generating PDF. The server might be busy or unavailable.');
      }
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
      
      // Set due date to 30 days after invoice date if not provided
      if (jsonData.due_date) {
        formattedData.due_date = jsonData.due_date;
      } else {
        // Calculate due date as 30 days after invoice date
        const invoiceDate = new Date(formattedData.invoice_date as string);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        formattedData.due_date = dueDate.toISOString().split('T')[0];
      }
      
      // Set default document and supply types if not provided
      formattedData.document_type = jsonData.document_type || 'Invoice';
      formattedData.supply_type = jsonData.supply_type || 'B2B';
      
      // Format the line items
      if (jsonData.items && Array.isArray(jsonData.items)) {
        const items = jsonData.items as Array<Record<string, unknown>>;
        
        // First, try to match products by name or HSN code
        const products = await axiosInstance.get('/products');
        const productList = products.data || [];
        
        formattedData.items = await Promise.all(items.map(async (item) => {
          const productName = item.product_name || 'Product';
          const hsnSac = item.hsn_sac || '';
          
          // Try to find a matching product
          let matchedProduct = null;
          
          // Try to match by name
          if (productName) {
            matchedProduct = productList.find((p: any) => 
              p.name.toLowerCase() === String(productName).toLowerCase()
            );
          }
          
          // If no match by name, try by HSN/SAC code
          if (!matchedProduct && hsnSac) {
            matchedProduct = productList.find((p: any) => 
              p.hsn_sac === hsnSac
            );
          }
          
          // If still no match, create a new product
          if (!matchedProduct) {
            try {
              const newProduct = await axiosInstance.post('/products', {
                name: productName,
                description: item.description || productName,
                hsn_sac: hsnSac,
                is_service: item.is_service || false,
                tax_rate: item.tax_rate || 18,
                price: item.rate || 0,
                unit: item.unit || 'PCS',
              });
              
              matchedProduct = newProduct.data;
            } catch (err) {
              console.error('Failed to create product:', err);
              // If we can't create a product, use a default one
              if (productList.length > 0) {
                matchedProduct = productList[0];
              } else {
                throw new Error("No products found and couldn't create a new one. Please create at least one product first.");
              }
            }
          }
          
          return {
            product_id: matchedProduct.id,
            product_name: productName,
            description: item.description || productName,
            hsn_sac: hsnSac,
            is_service: item.is_service || false,
            quantity: item.quantity || 1,
            rate: item.rate || 0,
            discount_percent: item.discount_percent || 0,
            tax_rate: item.tax_rate || 18,
          };
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
  
  // Dashboard data
  getDashboardData: async (query: string) => {
    try {
      // First try to get data from the backend endpoint if it exists
      try {
        const response = await axiosInstance.get(`/dashboard${query}`);
        return response.data;
      } catch (error) {
        console.log('Backend dashboard endpoint not available, generating dashboard data from invoices');
      }
      
      // Fallback: Generate dashboard data from invoices
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
          payment_status: invoice.payment_status,
          status: invoice.status
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
  
  // Summary endpoints
  getMonthlySummary: async (query: string) => {
    try {
      const response = await axiosInstance.get(`/summary/monthly${query}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;