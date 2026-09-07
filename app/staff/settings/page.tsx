import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardHeader from '@/components/staff/DashboardHeader';
import { User, Mail, Shield, Key, Bell, Lock } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | EliteHub Properties Staff Portal',
  description: 'Manage staff portal preferences and security settings.',
};

export default async function StaffSettingsPage() {
  const supabase = await createClient();

  // 1. Verify authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/staff/login?redirect=/staff/settings');
  }

  // 2. Fetch staff profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const fullName = profile?.full_name || 'Staff Member';
  const role = (profile?.role || 'staff').toUpperCase();
  const email = user.email || profile?.email || '';

  return (
    <div className="settings-page-container">
      {/* Top Header */}
      <DashboardHeader
        title="Settings"
        subtitle="Manage your staff profile and view portal access credentials."
        profile={profile}
      />

      <div className="settings-grid">
        {/* Account Profile Card */}
        <div className="staff-section-card settings-card">
          <div className="settings-card-header">
            <User size={20} className="settings-header-icon" />
            <div>
              <h2 className="settings-section-title">Staff Account Profile</h2>
              <p className="settings-section-desc">Personal details associated with your portal identity.</p>
            </div>
          </div>

          <div className="settings-fields-list">
            <div className="settings-field-row">
              <span className="field-row-label">Full Name</span>
              <span className="field-row-value">{fullName}</span>
            </div>

            <div className="settings-field-row">
              <span className="field-row-label">Email Address</span>
              <span className="field-row-value">{email}</span>
            </div>

            <div className="settings-field-row">
              <span className="field-row-label">Assigned Role</span>
              <span className={`sidebar-role-pill role-${role.toLowerCase()}`}>{role}</span>
            </div>
          </div>
        </div>

        {/* Security & Access Info Card */}
        <div className="staff-section-card settings-card">
          <div className="settings-card-header">
            <Shield size={20} className="settings-header-icon" />
            <div>
              <h2 className="settings-section-title">Security & Permissions</h2>
              <p className="settings-section-desc">Access controls governed by Supabase Row Level Security (RLS).</p>
            </div>
          </div>

          <div className="settings-fields-list">
            <div className="settings-field-row">
              <span className="field-row-label">Authentication Method</span>
              <span className="field-row-value">Email & Password (Supabase Auth)</span>
            </div>

            <div className="settings-field-row">
              <span className="field-row-label">Session Status</span>
              <span className="field-row-value" style={{ color: '#16a34a', fontWeight: 600 }}>
                Active & Verified
              </span>
            </div>

            <div className="settings-field-row">
              <span className="field-row-label">Complaints Read Access</span>
              <span className="field-row-value">Enabled (Staff Level)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
