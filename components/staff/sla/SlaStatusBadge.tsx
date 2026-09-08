'use client';

import React from 'react';
import { ComplaintRecord } from '@/types/complaint';
import { checkSlaStatus } from '@/lib/sla/checkSlaStatus';
import { AlertOctagon, Clock, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface SlaStatusBadgeProps {
  complaint: ComplaintRecord;
  showEscalationIcon?: boolean;
}

export default function SlaStatusBadge({ complaint, showEscalationIcon = true }: SlaStatusBadgeProps) {
  const evalResult = checkSlaStatus(complaint);

  const getStatusIcon = () => {
    switch (evalResult.status) {
      case 'on_track':
        return <Clock size={12} />;
      case 'approaching_deadline':
        return <AlertTriangle size={12} />;
      case 'first_response_breached':
      case 'resolution_breached':
        return <AlertOctagon size={12} />;
      case 'resolved_within_sla':
        return <CheckCircle2 size={12} />;
      case 'resolved_after_sla':
        return <AlertOctagon size={12} />;
      default:
        return null;
    }
  };

  return (
    <div className="sla-badge-group">
      <span
        className={`badge-sla ${evalResult.badgeClass}`}
        title={`SLA: ${evalResult.label} (${evalResult.timeRemainingFormatted})`}
      >
        {getStatusIcon()}
        <span>{evalResult.label}</span>
      </span>

      {showEscalationIcon && evalResult.isEscalated && (
        <span
          className="badge-sla-escalated"
          title={`Escalated${evalResult.escalatedAt ? ` on ${new Date(evalResult.escalatedAt).toLocaleDateString()}` : ''}`}
        >
          <ShieldAlert size={12} />
          <span>Escalated</span>
        </span>
      )}
    </div>
  );
}
