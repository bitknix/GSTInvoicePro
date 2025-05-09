'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Check, Building } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/app/utils/api';

interface BusinessProfile {
  id: number;
  name: string;
  gstin: string;
  state: string;
  city: string;
  is_default: boolean;
}

export default function BusinessProfilesPage() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteProfileId, setDeleteProfileId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    document.title = 'Business Profiles - GSTInvoicePro';
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    try {
      const data = await api.getBusinessProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to fetch business profiles:', error);
      toast.error('Failed to load business profiles');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProfile() {
    if (!deleteProfileId) return;
    
    try {
      await api.deleteBusinessProfile(deleteProfileId);
      toast.success('Business profile deleted successfully');
      fetchProfiles();
    } catch (error) {
      console.error('Failed to delete business profile:', error);
      toast.error('Failed to delete business profile');
    } finally {
      setDeleteProfileId(null);
      setShowDeleteConfirm(false);
    }
  }

  async function handleSetDefault(id: number) {
    try {
      await api.setDefaultBusinessProfile(id);
      toast.success('Default business profile updated');
      fetchProfiles();
    } catch (error) {
      console.error('Failed to set default business profile:', error);
      toast.error('Failed to update default business profile');
    }
  }

  function openDeleteConfirm(id: number) {
    setDeleteProfileId(id);
    setShowDeleteConfirm(true);
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Profiles</h1>
          <p className="text-gray-500">
            Manage your business information for invoices
          </p>
        </div>
        <Link href="/dashboard/business-profiles/new">
          <button className="px-4 py-2 bg-blue-600 text-white rounded flex items-center hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </button>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Your Business Profiles</h2>
          <p className="text-gray-500">
            View and manage your business profiles for generating invoices
          </p>
        </div>
        
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-24 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-24 w-full bg-gray-200 animate-pulse rounded"></div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-10">
            <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No business profiles found</h3>
            <p className="text-gray-500 mb-6">
              You haven&apos;t added any business profiles yet. Create your first profile to get started.
            </p>
            <Link href="/dashboard/business-profiles/new">
              <button className="px-4 py-2 bg-blue-600 text-white rounded flex items-center mx-auto hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Business Profile
              </button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Business Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">GSTIN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Default</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{profile.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{profile.gstin}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{profile.city}, {profile.state}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {profile.is_default ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="mr-1 h-3 w-3" />
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(profile.id)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Set as default
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/dashboard/business-profiles/${profile.id}/edit`}>
                          <button className="p-1 border border-gray-300 rounded hover:bg-gray-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          className="p-1 border border-gray-300 rounded hover:bg-gray-100 text-red-500 hover:text-red-700"
                          onClick={() => openDeleteConfirm(profile.id)}
                          disabled={profile.is_default}
                          title={profile.is_default ? "Cannot delete default profile" : "Delete profile"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && deleteProfileId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Are you sure?</h3>
            <p className="text-gray-500 mb-6">
              This will permanently delete the business profile 
              "{profiles.find(p => p.id === deleteProfileId)?.name}".
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteProfileId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 