'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { StaffDetailView } from '@/types/staff';

interface DeactivateStaffDialogProps {
  isOpen: boolean;
  staff: StaffDetailView | null;
  onClose: () => void;
  onStatusToggled: (updatedStaff: StaffDetailView) => void;
}

export default function DeactivateStaffDialog({
  isOpen,
  staff,
  onClose,
  onStatusToggled,
}: DeactivateStaffDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !staff) return null;

  const isCurrentlyActive = staff.is_active;
  const targetAction = isCurrentlyActive ? 'deactivate' : 'reactivate';

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/staff/team/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !isCurrentlyActive,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to ${targetAction} staff member.`);
      }

      onStatusToggled({
        ...staff,
        is_active: !isCurrentlyActive,
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error(`[${targetAction} Error]:`, err);
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-card-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className={`modal-icon-pill ${isCurrentlyActive ? 'icon-pill-danger' : 'icon-pill-success'}`}>
              {isCurrentlyActive ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div>
              <h3 className="modal-title">
                {isCurrentlyActive ? 'Deactivate Staff Member' : 'Reactivate Staff Member'}
              </h3>
              <p className="modal-subtitle">{staff.full_name} ({staff.email})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            disabled={loading}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="modal-error-banner">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="dialog-body">
          {isCurrentlyActive ? (
            <p className="dialog-text">
              Are you sure you want to deactivate <strong>{staff.full_name}</strong>?
              <br /><br />
              This will immediately revoke their access to the internal CRM. Their historical complaint
              assignments, notes, and activity records will be safely preserved.
            </p>
          ) : (
            <p className="dialog-text">
              Reactivate <strong>{staff.full_name}</strong>?
              <br /><br />
              This staff member will immediately regain access to log in, review complaints, and participate in customer care workflows.
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={isCurrentlyActive ? 'btn-danger-confirm' : 'btn-success-confirm'}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : isCurrentlyActive ? (
              <span>Deactivate Account</span>
            ) : (
              <span>Reactivate Account</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
