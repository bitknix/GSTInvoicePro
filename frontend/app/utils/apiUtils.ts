'use client';

import { toast } from 'react-toastify';

/**
 * Check if a JWT token is expired
 * @param token The JWT token to check
 * @returns true if the token is expired or invalid, false otherwise
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    // Get the payload part of the JWT (second part)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString()
    );
    
    // Check if the expiration time has passed
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (e) {
    // If there's any error parsing the token, consider it expired for safety
    return true;
  }
};

/**
 * Handle user logout by clearing storage and redirecting
 * @param message Optional message to display on logout
 */
export const handleLogout = (message?: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (message) {
      toast.error(message);
    }
    
    window.location.href = '/auth/login';
  }
};

/**
 * Check token and handle expired tokens
 * @returns true if token is valid, false otherwise
 */
export const checkTokenValidity = (): boolean => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  if (!token) {
    return false;
  }
  
  if (isTokenExpired(token)) {
    handleLogout('Your session has expired. Please log in again.');
    return false;
  }
  
  return true;
};

/**
 * Start a periodic token check
 * @param intervalMs Interval in milliseconds (default: 60000 = 1 minute)
 * @returns Interval ID that can be used with clearInterval
 */
export const startTokenExpiryCheck = (intervalMs: number = 60000): NodeJS.Timeout => {
  const checkToken = () => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      handleLogout('Your session has expired. Please log in again.');
    }
  };
  
  // Run initial check
  checkToken();
  
  // Return interval ID so it can be cleared if needed
  return setInterval(checkToken, intervalMs);
};

/**
 * Decode a JWT token to access its payload
 * @param token The JWT token to decode
 * @returns The decoded token payload or null if invalid
 */
export const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(
      typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString()
    );
  } catch (e) {
    return null;
  }
}; 