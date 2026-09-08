'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert, RefreshCw } from 'lucide-react';

interface EscalationDialogProps {
  isOpen: boolean;
  complaintId: string;
  referenceNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EscalationDialog({
  isOpen,
  complaintId,
  referenceNumber,
  onClose,
  onSuccess,
}: EscalationDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/complaints/${complaintId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to escalate complaint.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('[EscalationDialog Error]:', err);
      setError('A network error occurred while submitting escalation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-overlay" role="dialog" aria-modal="true" aria-labelledby="escalate-modal-title">
      <div className="modal-container-card" style={{ maxWidth: '480px' }}>
        <div className="modal-header" style={{ borderBottomColor: '#fee2e2', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
            <ShieldAlert size={20} />
            <h3 id="escalate-modal-title" className="modal-title" style={{ color: '#b91c1c' }}>
              Escalate Complaint
            </h3>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleEscalate}>
          <div className="modal-body">
            <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '14px', lineHeight: 1.5 }}>
              Are you sure you want to escalate complaint <strong>{referenceNumber}</strong>?
              This will mark the ticket as <strong>Escalated</strong>, trigger immediate email alerts to system administrators, and log a permanent audit record.
            </p>

            <div className="form-group mb-3">
              <label className="form-label" htmlFor="escalate-reason">
                Reason for Escalation <span className="text-muted">(Optional)</span>
              </label>
              <textarea
                id="escalate-reason"
                className="form-input"
                rows={3}
                placeholder="E.g., Customer requesting executive callback; repeated payment issue unresolved."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ fontSize: '0.85rem', padding: '10px 12px' }}>
                <AlertTriangle size={14} className="inline mr-1" />
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ background: '#dc2626', color: '#ffffff', borderColor: '#b91c1c' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin mr-1 inline" />
                  Escalating...
                </>
              ) : (
                'Confirm Escalation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
