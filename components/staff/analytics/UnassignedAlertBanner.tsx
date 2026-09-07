'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, UserPlus } from 'lucide-react';

interface UnassignedAlertBannerProps {
  unassignedCount: number;
}

export default function UnassignedAlertBanner({ unassignedCount }: UnassignedAlertBannerProps) {
  if (unassignedCount <= 0) {
    return null;
  }

  return (
    <div
      className="unassigned-alert-banner"
      role="alert"
      aria-label="Unassigned complaints operational alert"
    >
      <div className="unassigned-alert-content">
        <div className="alert-icon-wrap">
          <AlertTriangle size={18} />
        </div>
        <div className="alert-text-block">
          <span className="alert-title">
            {unassignedCount} {unassignedCount === 1 ? 'Complaint' : 'Complaints'} Unassigned
          </span>
          <span className="alert-desc">
            Incoming complaints currently have no assigned care agent. Assign them to ensure timely resolution.
          </span>
        </div>
      </div>

      <Link href="/staff/complaints" className="btn-unassigned-action">
        <UserPlus size={15} />
        <span>View Unassigned Complaints</span>
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}
