import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardHeader from '@/components/staff/DashboardHeader';
import Link from 'next/link';
import { User, Mail, Shield, Key, Bell, Lock, Building2, Tags, ArrowRight } from 'lucide-react';
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
  const isAdmin = profile?.role === 'admin';

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

        {/* Admin Operational Routing Hub (Admins Only) */}
        {isAdmin && (
          <div className="staff-section-card settings-card admin-routing-card" style={{ gridColumn: '1 / -1' }}>
            <div className="settings-card-header">
              <Building2 size={20} className="settings-header-icon text-primary" />
              <div>
                <h2 className="settings-section-title">Operational Routing & Classifications</h2>
                <p className="settings-section-desc">Configure customer service departments, complaint taxonomy, and auto-assignment rules.</p>
              </div>
            </div>

            <div className="settings-links-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <Link href="/staff/settings/departments" className="settings-quick-link-card">
                <div className="quick-link-icon-box">
                  <Building2 size={22} />
                </div>
                <div className="quick-link-body">
                  <h3 className="quick-link-title">Departments & Team Allocation</h3>
                  <p className="quick-link-desc">Manage company departments, workload auto-assignment, and staff membership.</p>
                </div>
                <ArrowRight size={16} className="quick-link-arrow" />
              </Link>

              <Link href="/staff/settings/categories" className="settings-quick-link-card">
                <div className="quick-link-icon-box">
                  <Tags size={22} />
                </div>
                <div className="quick-link-body">
                  <h3 className="quick-link-title">Complaint Categories</h3>
                  <p className="quick-link-desc">Configure customer complaint topics and default department routing rules.</p>
                </div>
                <ArrowRight size={16} className="quick-link-arrow" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
