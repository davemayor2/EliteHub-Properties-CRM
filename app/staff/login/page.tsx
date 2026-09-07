import React, { Suspense } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import LoginForm from '@/components/staff/LoginForm';
import { Shield, ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Portal Login | EliteHub Properties Customer Care',
  description: 'Secure staff login for EliteHub Properties Customer Care officers and administrators.',
};

export default function StaffLoginPage() {
  return (
    <div className="staff-login-wrapper">
      <div className="staff-login-card">
        {/* Top Header & Branding */}
        <div className="staff-login-header">
          <div className="staff-logo-wrapper">
            <Logo height={42} />
          </div>

          <div className="staff-badge">
            <Shield size={14} className="staff-badge-icon" />
            <span>Staff & Administration Portal</span>
          </div>

          <h1 className="staff-login-title">Sign In</h1>
          <p className="staff-login-subtitle">
            Enter your credentials to access customer complaint management and resolution tools.
          </p>
        </div>

        {/* Login Form with Suspense for SearchParams */}
        <Suspense fallback={<div className="staff-loading-placeholder">Loading login portal...</div>}>
          <LoginForm />
        </Suspense>

        {/* Footer / Navigation Link */}
        <div className="staff-login-footer">
          <Link href="/" className="staff-back-link">
            <ArrowLeft size={14} />
            <span>Return to Public Complaint Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
