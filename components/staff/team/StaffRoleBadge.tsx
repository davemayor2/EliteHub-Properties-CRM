import React from 'react';
import { StaffRole } from '@/types/staff';
import { ShieldCheck, User } from 'lucide-react';

interface StaffRoleBadgeProps {
  role: StaffRole;
  className?: string;
}

export default function StaffRoleBadge({ role, className = '' }: StaffRoleBadgeProps) {
  if (role === 'admin') {
    return (
      <span className={`staff-role-badge role-admin ${className}`}>
        <ShieldCheck size={12} className="badge-icon" />
        <span>Administrator</span>
      </span>
    );
  }

  return (
    <span className={`staff-role-badge role-staff ${className}`}>
      <User size={12} className="badge-icon" />
      <span>Staff Agent</span>
    </span>
  );
}
