'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';

// Function to parse JWT token and display its contents
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

const decodeToken = (token: string): any => {
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

export default function TokenExpiryTestTool() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  
  const checkToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('No token found in localStorage');
      return;
    }
    
    const decoded = decodeToken(token);
    const isExpired = isTokenExpired(token);
    
    setTokenInfo({
      decoded,
      isExpired,
      expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toLocaleString() : 'Unknown',
      currentTime: new Date().toLocaleString()
    });
  };
  
  const simulateExpiredToken = () => {
    // Create a JWT with an expired timestamp (1 hour ago)
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    
    // This is a dummy token - it's not valid for authentication
    // It only serves to test our token expiration checking logic
    const payload = {
      sub: 'test-user',
      exp: oneHourAgo,
      iat: oneHourAgo - 3600
    };
    
    const base64Payload = btoa(JSON.stringify(payload));
    const dummyExpiredToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.dummysignature`;
    
    localStorage.setItem('token', dummyExpiredToken);
    toast.info('Set expired token in localStorage');
    checkToken();
  };
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Token Expiry Test Tool</h2>
      <div className="space-x-4 mb-4">
        <button 
          onClick={checkToken}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check Current Token
        </button>
        <button 
          onClick={simulateExpiredToken}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Simulate Expired Token
        </button>
      </div>
      
      {tokenInfo && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded overflow-auto">
          <p className="text-red-500 font-bold mb-2">
            Token expired: {tokenInfo.isExpired ? 'Yes' : 'No'}
          </p>
          <p>Expires at: {tokenInfo.expiresAt}</p>
          <p>Current time: {tokenInfo.currentTime}</p>
          <div className="mt-2">
            <p className="font-semibold">Token payload:</p>
            <pre className="mt-1 bg-gray-200 dark:bg-gray-800 p-2 rounded overflow-auto">
              {JSON.stringify(tokenInfo.decoded, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Note: This tool is for testing purposes only.</p>
        <p>The 'Simulate Expired Token' button creates a dummy expired token to test the expiration handling logic.</p>
      </div>
    </div>
  );
} 