'use client';

import axios from 'axios';
import { toast } from 'react-toastify';

// Define type interfaces for API data
export interface BusinessProfile {
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
  logo_url?: string;
}

export type BusinessProfileFormData = Omit<BusinessProfile, 'id'>;

// Function to check if token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString()
    );
    
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (e) {
    return true;
  }
};

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
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Only redirect if not already on auth page
          const path = window.location.pathname;
          if (!path.includes('/auth/')) {
            toast.error('Your session has expired. Please log in again.');
            window.location.href = '/auth/login?session=expired';
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
      toast.error('Your session has expired. Please log in again.');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
  // Business Profile endpoints
  createBusinessProfile: async (profileData: Omit<BusinessProfile, 'id'>) => {
    try {
      // Remove debugging logs
      const response = await axiosInstance.post('/business-profiles/', profileData);
      return response.data;
    } catch (error: any) {
      // Keep error handling but remove excessive console logs
      throw error;
    }
  }
};

export default api; 