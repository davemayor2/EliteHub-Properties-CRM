'use client';

import React, { useState } from 'react';
import { ComplaintRecord } from '@/types/complaint';
import { checkSlaStatus } from '@/lib/sla/checkSlaStatus';
import EscalationDialog from './EscalationDialog';
import {
  Clock,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Hourglass,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface SlaSummaryProps {
  complaint: ComplaintRecord;
  onEscalationSuccess?: () => void;
}

export default function SlaSummary({ complaint, onEscalationSuccess }: SlaSummaryProps) {
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const sla = checkSlaStatus(complaint);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getTargetPill = (status: 'pending' | 'met' | 'breached' | 'not_applicable') => {
    switch (status) {
      case 'met':
        return <span className="sla-target-pill pill-met"><CheckCircle2 size={11} /> Met</span>;
      case 'breached':
        return <span className="sla-target-pill pill-breached"><AlertOctagon size={11} /> Breached</span>;
      case 'pending':
        return <span className="sla-target-pill pill-pending"><Hourglass size={11} /> Pending</span>;
      default:
        return <span className="sla-target-pill pill-none">N/A</span>;
    }
  };

  return (
    <div className="staff-section-card sla-summary-card">
      <div className="section-card-header">
        <div className="header-icon-pill" style={{ background: '#fef3c7', color: '#b45309' }}>
          <Clock size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="section-card-title">SLA & Workflows</h3>
          <p className="section-card-subtitle">{sla.policyName || 'Target Deadlines'}</p>
        </div>
        <span className={`badge-sla ${sla.badgeClass}`}>{sla.label}</span>
      </div>

      {/* Escalation Alert Banner */}
      {sla.isEscalated ? (
        <div className="sla-escalated-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} className="text-danger flex-shrink-0" />
            <div>
              <span className="escalated-title">Case Escalated</span>
              <p className="escalated-meta">
                {complaint.escalation_reason || 'Under priority administrative oversight'}
                {sla.escalatedAt && ` • ${formatDate(sla.escalatedAt)}`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="sla-escalate-action-strip">
          <button
            type="button"
            className="btn-escalate-trigger"
            onClick={() => setIsEscalateOpen(true)}
          >
            <ShieldAlert size={13} />
            <span>Escalate Complaint</span>
            <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.7 }} />
          </button>
        </div>
      )}

      {/* Deadlines Breakdown */}
      <div className="sla-targets-list">
        {/* First Response Target */}
        <div className="sla-target-row">
          <div className="target-icon-wrap">
            <Hourglass size={14} className="text-muted" />
          </div>
          <div className="target-info-wrap">
            <div className="target-label-line">
              <span className="target-name">First Staff Response</span>
              {getTargetPill(sla.firstResponseStatus)}
            </div>
            <div className="target-time-line">
              {sla.firstRespondedAt ? (
                <span className="target-value text-success">
                  Responded {formatDate(sla.firstRespondedAt)}
                </span>
              ) : sla.firstResponseDueAt ? (
                <span className={`target-value ${sla.firstResponseStatus === 'breached' ? 'text-danger' : 'text-muted'}`}>
                  Due by {formatDate(sla.firstResponseDueAt)}
                </span>
              ) : (
                <span className="target-value text-muted">No target assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Resolution Target */}
        <div className="sla-target-row">
          <div className="target-icon-wrap">
            <Calendar size={14} className="text-muted" />
          </div>
          <div className="target-info-wrap">
            <div className="target-label-line">
              <span className="target-name">Case Resolution</span>
              {getTargetPill(sla.resolutionStatus)}
            </div>
            <div className="target-time-line">
              {sla.resolvedAt ? (
                <span className="target-value text-success">
                  Resolved {formatDate(sla.resolvedAt)}
                </span>
              ) : sla.resolutionDueAt ? (
                <span className={`target-value ${sla.resolutionStatus === 'breached' ? 'text-danger' : 'text-muted'}`}>
                  Due by {formatDate(sla.resolutionDueAt)}
                </span>
              ) : (
                <span className="target-value text-muted">No target assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Complaint Aging */}
        <div className="sla-target-row">
          <div className="target-icon-wrap">
            <Layers size={14} className="text-muted" />
          </div>
          <div className="target-info-wrap">
            <div className="target-label-line">
              <span className="target-name">Complaint Age</span>
              <span className="age-duration-text">{sla.complaintAgeFormatted}</span>
            </div>
            <div className="target-time-line">
              <span className="target-value text-muted">
                {sla.timeRemainingFormatted}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Escalation Confirmation Dialog */}
      <EscalationDialog
        isOpen={isEscalateOpen}
        complaintId={complaint.id}
        referenceNumber={complaint.reference_number}
        onClose={() => setIsEscalateOpen(false)}
        onSuccess={() => {
          if (onEscalationSuccess) onEscalationSuccess();
        }}
      />
    </div>
  );
}
