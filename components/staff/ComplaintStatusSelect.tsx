'use client';

import React, { useState } from 'react';
import { ComplaintStatus } from '@/types/complaint';
import { Activity, Check, Loader2, AlertCircle } from 'lucide-react';

interface ComplaintStatusSelectProps {
  complaintId: string;
  currentStatus: ComplaintStatus;
  onStatusChange?: (newStatus: ComplaintStatus) => void;
}

const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; description: string; dotColor: string; bgBadge: string }
> = {
  new: {
    label: 'New',
    description: 'Fresh complaint awaiting staff review',
    dotColor: '#2563eb',
    bgBadge: '#eff6ff',
  },
  open: {
    label: 'Open',
    description: 'Active investigation in progress',
    dotColor: '#d97706',
    bgBadge: '#fffbeb',
  },
  pending: {
    label: 'Pending',
    description: 'Waiting on customer response/action',
    dotColor: '#7c3aed',
    bgBadge: '#f5f3ff',
  },
  resolved: {
    label: 'Resolved',
    description: 'Issue successfully addressed and resolved',
    dotColor: '#059669',
    bgBadge: '#ecfdf5',
  },
  closed: {
    label: 'Closed',
    description: 'Case completed and officially concluded',
    dotColor: '#4b5563',
    bgBadge: '#f3f4f6',
  },
};

export default function ComplaintStatusSelect({
  complaintId,
  currentStatus,
  onStatusChange,
}: ComplaintStatusSelectProps) {
  const [status, setStatus] = useState<ComplaintStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as ComplaintStatus;
    if (nextStatus === status) return;

    try {
      setLoading(true);
      setFeedback(null);

      const res = await fetch(`/api/staff/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update status');
      }

      setStatus(nextStatus);
      if (onStatusChange) {
        onStatusChange(nextStatus);
      }
      setFeedback({ type: 'success', message: `Status updated to ${STATUS_CONFIG[nextStatus].label}` });

      // Auto-clear feedback after 3 seconds
      setTimeout(() => {
        setFeedback(null);
      }, 3000);
    } catch (err) {
      console.error('[Status Update Error]:', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error updating status',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentCfg = STATUS_CONFIG[status];

  return (
    <div className="management-control-box">
      <div className="control-box-header">
        <label htmlFor="complaint-status-select" className="control-label">
          <Activity size={15} className="control-label-icon" />
          <span>Complaint Status</span>
        </label>
        {loading && <Loader2 size={14} className="animate-spin text-muted" />}
      </div>

      <div className="select-wrapper">
        <select
          id="complaint-status-select"
          value={status}
          onChange={handleSelectChange}
          disabled={loading}
          className="management-select status-select"
        >
          <option value="new">New (Awaiting Review)</option>
          <option value="open">Open (In Investigation)</option>
          <option value="pending">Pending (Customer Info Required)</option>
          <option value="resolved">Resolved (Addressed)</option>
          <option value="closed">Closed (Completed)</option>
        </select>
      </div>

      {/* Status indicator summary */}
      <div className="status-current-description">
        <span
          className="status-color-dot"
          style={{ backgroundColor: currentCfg.dotColor }}
        />
        <span className="status-desc-text">{currentCfg.description}</span>
      </div>

      {feedback && (
        <div className={`control-feedback-chip ${feedback.type}`}>
          {feedback.type === 'success' ? (
            <Check size={13} />
          ) : (
            <AlertCircle size={13} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
