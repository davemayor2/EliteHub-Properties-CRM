'use client';

import React, { useState } from 'react';
import { X, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { StaffDetailView } from '@/types/staff';

interface DeleteStaffDialogProps {
  isOpen: boolean;
  staff: StaffDetailView | null;
  onClose: () => void;
  onStaffDeleted: (deletedStaffId: string) => void;
}

export default function DeleteStaffDialog({
  isOpen,
  staff,
  onClose,
  onStaffDeleted,
}: DeleteStaffDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !staff) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/staff/team/${staff.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete staff member account.');
      }

      onStaffDeleted(staff.id);
      onClose();
    } catch (err) {
      console.error('[Delete Staff Member Error]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred while deleting staff account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-card-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-pill icon-pill-danger">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="modal-title">Delete Staff Member</h3>
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
          <p className="dialog-text">
            Are you sure you want to permanently delete <strong>{staff.full_name}</strong>?
          </p>
          <div className="modal-info-box mt-3">
            <p className="text-xs text-slate-600">
              • Any active complaints currently assigned to this member will automatically be safely returned to the open queue (unassigned).
            </p>
            <p className="text-xs text-slate-600 mt-1">
              • The staff record and credentials will be purged, allowing you to re-invite this email address again at any point in the future.
            </p>
          </div>
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
            onClick={handleDelete}
            className="btn-danger-confirm"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Deleting Account...</span>
              </>
            ) : (
              <>
                <Trash2 size={15} />
                <span>Permanently Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
