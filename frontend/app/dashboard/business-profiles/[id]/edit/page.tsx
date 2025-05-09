'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building, Home, Pencil } from 'lucide-react';
import BusinessProfileForm from '@/app/components/BusinessProfileForm';
import api from '@/app/utils/api';
import { toast } from 'react-toastify';

interface BusinessProfile {
  id: number;
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pin: string;
  phone: string;
  email: string;
  is_default: boolean;
}

export default function EditBusinessProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = typeof params.id === 'string' ? parseInt(params.id, 10) : 0;
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Edit Business Profile - GSTInvoicePro';
  }, []);

  // Fetch business profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await api.getBusinessProfile(profileId);
        setProfile(data);
      } catch (error) {
        toast.error('Failed to load business profile');
        console.error('Error fetching business profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  const handleSuccess = () => {
    router.push('/dashboard/business-profiles');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <nav className="flex items-center text-sm mb-4">
        <Link href="/dashboard" className="flex items-center text-blue-500 hover:text-blue-700">
          <Home className="h-4 w-4 mr-1" />
          <span>Dashboard</span>
        </Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/business-profiles" className="flex items-center text-blue-500 hover:text-blue-700">
          <Building className="h-4 w-4 mr-1" />
          <span>Business Profiles</span>
        </Link>
        <span className="mx-2">/</span>
        <span className="flex items-center">
          <Pencil className="h-4 w-4 mr-1" />
          <span>Edit Profile</span>
        </span>
      </nav>

      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Business Profile</h1>
        <p className="text-gray-500">
          Update your business details. This information will appear on your invoices.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        {loading ? (
          <div className="space-y-4">
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
          </div>
        ) : profile ? (
          <BusinessProfileForm initialData={profile} onSuccess={handleSuccess} />
        ) : (
          <p className="text-center py-6 text-gray-500">
            Business profile not found or has been deleted.
          </p>
        )}
      </div>
    </div>
  );
} 