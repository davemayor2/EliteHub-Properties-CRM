'use client';

import React, { useState } from 'react';
import { ComplaintPriority } from '@/types/complaint';
import { Flame, Check, Loader2, AlertCircle } from 'lucide-react';

interface PrioritySelectProps {
  complaintId: string;
  currentPriority: ComplaintPriority;
  onPriorityChange?: (newPriority: ComplaintPriority) => void;
}

const PRIORITY_CONFIG: Record<
  ComplaintPriority,
  { label: string; description: string; dotColor: string }
> = {
  low: {
    label: 'Low',
    description: 'Minor non-blocking question or feedback',
    dotColor: '#64748b',
  },
  normal: {
    label: 'Normal',
    description: 'Standard priority customer concern',
    dotColor: '#0284c7',
  },
  high: {
    label: 'High',
    description: 'Significant issue requiring expedited handling',
    dotColor: '#ea580c',
  },
  urgent: {
    label: 'Urgent',
    description: 'Critical business or emergency concern',
    dotColor: '#dc2626',
  },
};

export default function PrioritySelect({
  complaintId,
  currentPriority,
  onPriorityChange,
}: PrioritySelectProps) {
  const [priority, setPriority] = useState<ComplaintPriority>(currentPriority);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPriority = e.target.value as ComplaintPriority;
    if (nextPriority === priority) return;

    try {
      setLoading(true);
      setFeedback(null);

      const res = await fetch(`/api/staff/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority: nextPriority }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update priority');
      }

      setPriority(nextPriority);
      if (onPriorityChange) {
        onPriorityChange(nextPriority);
      }
      setFeedback({ type: 'success', message: `Priority set to ${PRIORITY_CONFIG[nextPriority].label}` });

      setTimeout(() => {
        setFeedback(null);
      }, 3000);
    } catch (err) {
      console.error('[Priority Update Error]:', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error updating priority',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentCfg = PRIORITY_CONFIG[priority];

  return (
    <div className="management-control-box">
      <div className="control-box-header">
        <label htmlFor="complaint-priority-select" className="control-label">
          <Flame size={15} className="control-label-icon" />
          <span>Priority Level</span>
        </label>
        {loading && <Loader2 size={14} className="animate-spin text-muted" />}
      </div>

      <div className="select-wrapper">
        <select
          id="complaint-priority-select"
          value={priority}
          onChange={handleSelectChange}
          disabled={loading}
          className="management-select priority-select"
        >
          <option value="low">Low Priority</option>
          <option value="normal">Normal Priority</option>
          <option value="high">High Priority</option>
          <option value="urgent">Urgent Priority</option>
        </select>
      </div>

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
