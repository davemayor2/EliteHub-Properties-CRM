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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let rand = '';
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(`Elite#${rand}26`);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Full name must be at least 2 characters long.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMsg('Email address is required.');
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 8) {
      setErrorMsg('Temporary password must be at least 8 characters long.');
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
          password: trimmedPassword || undefined,
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

          {/* Temporary Password */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="staff-password" className="form-label">
                <span>Temporary Password (Optional)</span>
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Auto-Generate Secure Password
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to auto-generate secure password"
                className="form-input"
                disabled={loading}
                style={{ paddingRight: '40px', fontFamily: password ? 'monospace' : 'inherit' }}
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              )}
            </div>
            <span className="form-hint">
              The login password will be included directly in the invitation email sent to this staff member.
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
