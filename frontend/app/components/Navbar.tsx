'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';
import { isTokenExpired, handleLogout, checkTokenValidity } from '../utils/apiUtils';

type NavLink = {
  href: string;
  label: string;
  children?: NavLink[];
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in and token is valid
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      
      // Only consider logged in if token exists and is not expired
      if (token && !isTokenExpired(token)) {
        setIsLoggedIn(true);
      } else {
        // If token is expired, clean up
        if (token && isTokenExpired(token)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        setIsLoggedIn(false);
      }
    };
    
    // Check initially
    checkLoginStatus();
    
    // Set up interval to periodically check login status
    const intervalId = setInterval(checkLoginStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onLogout = () => {
    handleLogout();
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/invoices', label: 'Invoices' },
    { href: '/dashboard/business-profiles', label: 'Business Profiles' },
    { href: '/dashboard/customers', label: 'Customers' },
    { href: '/dashboard/products', label: 'Products' },
    { 
      href: '#', 
      label: 'Tools',
      children: [
        { href: '/dashboard/import-json', label: 'Import JSON' },
        { href: '/dashboard/export-json', label: 'Export JSON' },
      ]
    },
  ];

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const toggleDropdown = (label: string) => {
    if (openDropdown === label) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(label);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                GSTInvoicePro
              </div>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {isLoggedIn && navLinks.map((link) => {
              if (link.children) {
                return (
                  <div key={link.label} className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => toggleDropdown(link.label)}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        openDropdown === link.label
                          ? 'bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      } flex items-center`}
                    >
                      {link.label}
                      <svg 
                        className={`ml-1 h-4 w-4 transition-transform ${
                          openDropdown === link.label ? 'transform rotate-180' : ''
                        }`} 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {openDropdown === link.label && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1" role="menu" aria-orientation="vertical">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`block px-4 py-2 text-sm ${
                                isActive(child.href)
                                  ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400'
                                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                              }`}
                              onClick={() => setOpenDropdown(null)}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(link.href)
                      ? 'bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {isLoggedIn && (
              <button
                onClick={onLogout}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Logout
              </button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-expanded={isOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {isLoggedIn && navLinks.map((link) => {
            if (link.children) {
              return (
                <div key={link.label} className="py-2">
                  <button
                    onClick={() => toggleDropdown(link.label)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-base font-medium ${
                      openDropdown === link.label
                        ? 'bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    {link.label}
                    <svg 
                      className={`ml-1 h-4 w-4 transition-transform ${
                        openDropdown === link.label ? 'transform rotate-180' : ''
                      }`} 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {openDropdown === link.label && (
                    <div className="mt-2 space-y-1 pl-4">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-3 py-2 rounded-md text-base font-medium ${
                            isActive(child.href)
                              ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => {
                            setOpenDropdown(null);
                            setIsOpen(false);
                          }}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 