'use client';

import React, { useState } from 'react';
import { X, UserPlus, Loader2, AlertCircle, Shield, Mail, User } from 'lucide-react';
import { StaffMember, StaffRole } from '@/types/staff';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffAdded: (newStaff: StaffMember) => void;
}

export default function AddStaffModal({
  isOpen,
  onClose,
  onStaffAdded,
}: AddStaffModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Full name must be at least 2 characters long.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMsg('Email address is required.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/staff/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create staff member.');
      }

      onStaffAdded(data.staff);
      onClose();
    } catch (err) {
      console.error('[AddStaffModal Error]:', err);
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
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="modal-title">Add Staff Member</h3>
              <p className="modal-subtitle">Create and invite a new team member</p>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="staff-full-name" className="form-label">
              <User size={14} />
              <span>Full Name</span>
            </label>
            <input
              id="staff-full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="form-input"
              disabled={loading}
            />
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label htmlFor="staff-email" className="form-label">
              <Mail size={14} />
              <span>Email Address</span>
            </label>
            <input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane.doe@elitehubproperties.com"
              className="form-input"
              disabled={loading}
            />
          </div>

          {/* Role Selection */}
          <div className="form-group">
            <label htmlFor="staff-role" className="form-label">
              <Shield size={14} />
              <span>Role & Permissions</span>
            </label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="form-select"
              disabled={loading}
            >
              <option value="staff">Staff Agent (Standard CRM Access)</option>
              <option value="admin">Administrator (Full Access & Team Management)</option>
            </select>
            <span className="form-hint">
              {role === 'admin'
                ? 'Administrators can manage complaints, team members, and role assignments.'
                : 'Staff agents can review, process, and reply to assigned customer complaints.'}
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Create & Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
