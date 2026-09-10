import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { StaffStatus } from '@/types/staff';

interface StaffStatusBadgeProps {
  isActive: boolean;
  status?: StaffStatus;
  hasLoggedIn?: boolean;
  className?: string;
}

export default function StaffStatusBadge({
  isActive,
  status,
  hasLoggedIn,
  className = '',
}: StaffStatusBadgeProps) {
  // If explicitly inactive or is_active is false
  if (!isActive || status === 'inactive') {
    return (
      <span className={`staff-status-badge status-inactive inactive ${className}`}>
        <XCircle size={12} className="badge-icon" />
        <span>Inactive</span>
      </span>
    );
  }

  // If active but awaiting first login
  if (status === 'awaiting_login' || hasLoggedIn === false) {
    return (
      <span
        className={`staff-status-badge status-awaiting awaiting ${className}`}
        title="Invited / added to CRM, yet to log in for the first time"
      >
        <Clock size={12} className="badge-icon" />
        <span>Awaiting First Login</span>
      </span>
    );
  }

  // Active member
  return (
    <span className={`staff-status-badge status-active active ${className}`}>
      <CheckCircle2 size={12} className="badge-icon" />
      <span>Active</span>
    </span>
  );
}
