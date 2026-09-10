'use client';

import React, { useState } from 'react';
import { X, Edit2, Loader2, AlertCircle, Shield, Mail, User, CheckCircle2 } from 'lucide-react';
import { StaffDetailView, StaffRole } from '@/types/staff';

interface EditStaffModalProps {
  isOpen: boolean;
  staff: StaffDetailView | null;
  onClose: () => void;
  onStaffUpdated: (updatedStaff: StaffDetailView) => void;
}

export default function EditStaffModal({
  isOpen,
  staff,
  onClose,
  onStaffUpdated,
}: EditStaffModalProps) {
  const [fullName, setFullName] = useState(staff?.full_name || '');
  const [role, setRole] = useState<StaffRole>(staff?.role || 'staff');
  const [isActive, setIsActive] = useState<boolean>(staff?.is_active ?? true);
  const [confirmRoleChange, setConfirmRoleChange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial values when modal opens
  React.useEffect(() => {
    if (staff) {
      setFullName(staff.full_name);
      setRole(staff.role);
      setIsActive(staff.is_active);
      setConfirmRoleChange(false);
      setErrorMsg(null);
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const roleChanged = role !== staff.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // If role changed and not confirmed, prompt confirmation
    if (roleChanged && !confirmRoleChange) {
      setConfirmRoleChange(true);
      return;
    }

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Full name must be at least 2 characters long.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/staff/team/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: trimmedName,
          role,
          is_active: isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update staff member.');
      }

      onStaffUpdated({
        ...staff,
        full_name: trimmedName,
        role,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error('[EditStaffModal Error]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-pill">
              <Edit2 size={18} />
            </div>
            <div>
              <h3 className="modal-title">Edit Staff Member</h3>
              <p className="modal-subtitle">Modify account details and role permissions</p>
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

        {/* Error Banner */}
        {errorMsg && (
          <div className="modal-error-banner">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Role Change Confirmation Alert */}
        {roleChanged && confirmRoleChange && (
          <div className="modal-warning-banner">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="warning-title">Confirm Role Change</p>
              <p className="warning-desc">
                Are you sure you want to change {staff.full_name}&apos;s role from{' '}
                <strong>{staff.role.toUpperCase()}</strong> to{' '}
                <strong>{role.toUpperCase()}</strong>?
              </p>
            </div>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="edit-staff-full-name" className="form-label">
              <User size={14} />
              <span>Full Name</span>
            </label>
            <input
              id="edit-staff-full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
              disabled={loading}
            />
          </div>

          {/* Email Address (Read-only) */}
          <div className="form-group">
            <label htmlFor="edit-staff-email" className="form-label">
              <Mail size={14} />
              <span>Email Address</span>
              <span className="form-tag-readonly">Read-only</span>
            </label>
            <input
              id="edit-staff-email"
              type="email"
              readOnly
              value={staff.email}
              className="form-input form-input-readonly"
              disabled
            />
            <span className="form-hint">
              Email addresses cannot be changed directly in the CRM for security.
            </span>
          </div>

          {/* Role Selection */}
          <div className="form-group">
            <label htmlFor="edit-staff-role" className="form-label">
              <Shield size={14} />
              <span>Role</span>
            </label>
            <select
              id="edit-staff-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value as StaffRole);
                setConfirmRoleChange(false);
              }}
              className="form-select"
              disabled={loading}
            >
              <option value="staff">Staff Agent</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Account Status Toggle */}
          <div className="form-group">
            <label htmlFor="edit-staff-status" className="form-label">
              <CheckCircle2 size={14} />
              <span>Account Status</span>
            </label>
            <select
              id="edit-staff-status"
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
              className="form-select"
              disabled={loading}
            >
              <option value="active">Active (Permitted to log in)</option>
              <option value="inactive">Inactive (Deactivated - No CRM Access)</option>
            </select>
            <span className="form-hint">
              Deactivating will block this staff member from accessing the CRM without deleting their historical notes or complaint assignments.
            </span>
          </div>

          {/* Modal Actions */}
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
              type="submit"
              className="btn-submit-modal"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : roleChanged && !confirmRoleChange ? (
                <span>Review & Confirm</span>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
