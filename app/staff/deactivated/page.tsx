import React from 'react';
import { Metadata } from 'next';
import LogoutButton from '@/components/staff/LogoutButton';
import Logo from '@/components/Logo';
import { UserX, ShieldAlert, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Account Deactivated | EliteHub Properties CRM',
  description: 'Your staff account is currently deactivated.',
};

export default function AccountDeactivatedPage() {
  return (
    <div className="deactivated-page-container">
      <div className="deactivated-card">
        {/* Brand Logo */}
        <div className="flex justify-center mb-6">
          <Logo height={42} />
        </div>

        {/* Warning Icon Circle */}
        <div className="deactivated-icon-circle">
          <UserX size={34} />
        </div>

        <h1 className="deactivated-title">Account Deactivated</h1>
        <p className="deactivated-subtitle">
          Your account has been deactivated. Please contact an administrator.
        </p>

        <div className="deactivated-info-box">
          <div className="flex items-start gap-3 text-left">
            <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Access to customer complaints, internal notes, and team collaboration has been temporarily suspended by an organization administrator.
            </div>
          </div>
        </div>

        <div className="deactivated-contact-box">
          <div className="flex items-center justify-center gap-2 text-xs text-muted font-medium">
            <Mail size={13} />
            <span>Need help? Reach out to: <strong>care@elitehubproperties.com</strong></span>
          </div>
        </div>

        <div className="deactivated-action-wrapper mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
