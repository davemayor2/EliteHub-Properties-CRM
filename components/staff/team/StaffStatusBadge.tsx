import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface StaffStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export default function StaffStatusBadge({ isActive, className = '' }: StaffStatusBadgeProps) {
  if (isActive) {
    return (
      <span className={`staff-status-badge status-active ${className}`}>
        <CheckCircle2 size={12} className="badge-icon" />
        <span>Active</span>
      </span>
    );
  }

  return (
    <span className={`staff-status-badge status-inactive ${className}`}>
      <XCircle size={12} className="badge-icon" />
      <span>Inactive</span>
    </span>
  );
}
