'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, ShieldCheck } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { ComplaintStatus, ComplaintPriority } from '@/types/complaint';
import { Tag, Building2 } from 'lucide-react';

interface ComplaintDetailsHeaderProps {
  referenceNumber: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  createdAt: string;
  categoryName?: string | null;
  departmentName?: string | null;
}

export default function ComplaintDetailsHeader({
  referenceNumber,
  status,
  priority,
  createdAt,
  categoryName,
  departmentName,
}: ComplaintDetailsHeaderProps) {
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(createdAt);
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return createdAt;
    }
  }, [createdAt]);

  return (
    <div className="complaint-header-panel">
      {/* Breadcrumbs & Back Navigation */}
      <div className="complaint-breadcrumb-row">
        <Link href="/staff/complaints" className="btn-back-link">
          <ArrowLeft size={15} />
          <span>Back to Complaints</span>
        </Link>

        <div className="breadcrumb-trail">
          <Link href="/staff/dashboard" className="breadcrumb-segment">Dashboard</Link>
          <span className="breadcrumb-separator">/</span>
          <Link href="/staff/complaints" className="breadcrumb-segment">Complaints</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{referenceNumber}</span>
        </div>
      </div>

      {/* Main Title Row */}
      <div className="complaint-title-row">
        <div className="title-left">
          <div className="ref-number-wrapper">
            <span className="ref-number-tag">{referenceNumber}</span>
            <span className="portal-verified-chip">
              <ShieldCheck size={13} />
              Portal Verified
            </span>
          </div>
          <div className="complaint-meta-strip">
            <span className="meta-strip-item">
              <Calendar size={14} className="meta-icon" />
              Submitted {formattedDate}
            </span>
          </div>
        </div>

        <div className="title-right-badges">
          {departmentName && (
            <span className="badge-department" title={`Department: ${departmentName}`}>
              <Building2 size={12} className="inline mr-1" />
              {departmentName}
            </span>
          )}
          {categoryName && (
            <span className="badge-category" title={`Category: ${categoryName}`}>
              <Tag size={12} className="inline mr-1" />
              {categoryName}
            </span>
          )}
          <StatusBadge status={status} />
          <PriorityBadge priority={priority} />
        </div>
      </div>
    </div>
  );
}
