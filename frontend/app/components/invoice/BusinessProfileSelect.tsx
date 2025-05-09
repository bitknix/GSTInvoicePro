'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin } from 'lucide-react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { validateGSTIN } from '@/app/utils/taxCalculations';

interface BusinessProfile {
  id: number;
  name: string;
  gstin: string;
  pan?: string;
  email?: string;
  phone?: string;
  address?: string;
  state: string;
  is_default?: boolean;
}

interface InvoiceFormData {
  business_profile_id: number;
  // Add other invoice form fields as needed
}

interface BusinessProfileSelectProps {
  businessProfiles: BusinessProfile[];
  control: Control<InvoiceFormData>;
  errors: FieldErrors<InvoiceFormData>;
  defaultValue?: number;
  onProfileChange?: (profile: BusinessProfile | null) => void;
}

export default function BusinessProfileSelect({
  businessProfiles,
  control,
  errors,
  defaultValue,
  onProfileChange
}: BusinessProfileSelectProps) {
  const [selectedProfile, setSelectedProfile] = useState<BusinessProfile | null>(null);

  // Set default value or first business profile as selected
  useEffect(() => {
    if (businessProfiles.length > 0) {
      let profileToSelect: BusinessProfile | undefined;
      
      if (defaultValue) {
        profileToSelect = businessProfiles.find(p => p.id === defaultValue);
      } 
      
      // If no default or default not found, try to find the default profile
      if (!profileToSelect) {
        profileToSelect = businessProfiles.find(p => p.is_default) || businessProfiles[0];
      }
      
      if (profileToSelect) {
        setSelectedProfile(profileToSelect);
        if (onProfileChange) {
          onProfileChange(profileToSelect);
        }
      }
    }
  }, [businessProfiles, defaultValue, onProfileChange]);

  // Handle profile selection
  const handleProfileChange = (profileId: number) => {
    const profile = businessProfiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfile(profile);
      if (onProfileChange) {
        onProfileChange(profile);
      }
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Business Profile <span className="text-red-500">*</span>
      </label>
      
      <Controller
        control={control}
        name="business_profile_id"
        render={({ field }) => (
          <>
            <select
              {...field}
              onChange={(e) => {
                const profileId = parseInt(e.target.value);
                field.onChange(profileId);
                handleProfileChange(profileId);
              }}
              className={`w-full rounded-md border ${errors.business_profile_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select a business profile</option>
              {businessProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} {profile.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
            
            {errors.business_profile_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.business_profile_id.message}</p>
            )}
            
            {/* Selected profile details */}
            {selectedProfile && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-sm flex items-center">
                  <Briefcase className="w-4 h-4 mr-1" />
                  Business Details
                </h4>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Business:</span> {selectedProfile.name}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">GSTIN:</span> {selectedProfile.gstin}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400">State:</span>
                    <span className="ml-1">{selectedProfile.state}</span>
                  </div>
                  {selectedProfile.pan && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">PAN:</span> {selectedProfile.pan}
                    </div>
                  )}
                  {selectedProfile.phone && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Phone:</span> {selectedProfile.phone}
                    </div>
                  )}
                  {selectedProfile.email && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Email:</span> {selectedProfile.email}
                    </div>
                  )}
                  {selectedProfile.address && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Address:</span> {selectedProfile.address}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      />
    </div>
  );
} 