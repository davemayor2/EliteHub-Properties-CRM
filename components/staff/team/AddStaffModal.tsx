'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Loader2,
  AlertCircle,
  Shield,
  Mail,
  User,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { StaffMember, StaffRole } from '@/types/staff';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffAdded: (newStaff: StaffMember) => void;
}

function generateRandomStaffPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '!@#$%&*';

  let pw = '';
  pw += uppers.charAt(Math.floor(Math.random() * uppers.length));
  pw += letters.charAt(Math.floor(Math.random() * letters.length));
  pw += letters.charAt(Math.floor(Math.random() * letters.length));
  pw += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pw += symbols.charAt(Math.floor(Math.random() * symbols.length));
  pw += uppers.charAt(Math.floor(Math.random() * uppers.length));
  pw += letters.charAt(Math.floor(Math.random() * letters.length));
  pw += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return `Elite#${pw}`;
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
  const [showPassword, setShowPassword] = useState(true);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success state for displaying created credentials
  const [createdStaff, setCreatedStaff] = useState<{
    staff: StaffMember;
    temporaryPassword: string;
  } | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Auto-generate a password whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setRole('staff');
      setPassword(generateRandomStaffPassword());
      setShowPassword(true);
      setCopiedPassword(false);
      setErrorMsg(null);
      setCreatedStaff(null);
      setCopiedAll(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegeneratePassword = () => {
    setPassword(generateRandomStaffPassword());
    setCopiedPassword(false);
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyAllCredentials = async () => {
    if (!createdStaff) return;
    const credText = `EliteHub CRM Staff Credentials\n---------------------------\nName: ${createdStaff.staff.full_name}\nEmail: ${createdStaff.staff.email}\nTemporary Password: ${createdStaff.temporaryPassword}\nRole: ${createdStaff.staff.role.toUpperCase()}\nLogin Portal: ${window.location.origin}/staff/login`;
    try {
      await navigator.clipboard.writeText(credText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const finalPassword = (password.trim() || generateRandomStaffPassword()).trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Full name must be at least 2 characters long.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMsg('Email address is required.');
      return;
    }

    if (finalPassword.length < 8) {
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
          password: finalPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create staff member.');
      }

      onStaffAdded(data.staff);
      setCreatedStaff({
        staff: data.staff,
        temporaryPassword: data.temporary_password || finalPassword,
      });
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
              <h3 className="modal-title">
                {createdStaff ? 'Staff Invitation Sent' : 'Add Staff Member'}
              </h3>
              <p className="modal-subtitle">
                {createdStaff
                  ? 'Credentials created and invitation email dispatched'
                  : 'Create account and email sign-in credentials'}
              </p>
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
          <div className="modal-error-banner" role="alert">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success View */}
        {createdStaff ? (
          <div className="modal-body" style={{ padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  border: '1px solid #a7f3d0',
                }}
              >
                <CheckCircle2 size={30} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                Account Created Successfully!
              </h4>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                An invitation email with these login credentials has been sent to{' '}
                <strong style={{ color: '#0f172a' }}>{createdStaff.staff.email}</strong>.
              </p>
            </div>

            {/* Credentials Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Full Name:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{createdStaff.staff.full_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Login Email:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                  {createdStaff.staff.email}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Temporary Password:</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#0369a1',
                    backgroundColor: '#e0f2fe',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #bae6fd',
                  }}
                >
                  {createdStaff.temporaryPassword}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Role:</span>
                <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#0f172a' }}>
                  {createdStaff.staff.role}
                </span>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px', padding: 0, border: 'none' }}>
              <button
                type="button"
                onClick={handleCopyAllCredentials}
                className="btn-cancel"
                style={{ gap: '6px' }}
              >
                {copiedAll ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedAll ? 'Credentials Copied!' : 'Copy Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-submit-modal"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Modal Form */
          <form onSubmit={handleSubmit} className="modal-form">
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="staff-full-name" className="form-label">
                <User size={14} />
                <span>Full Name</span>
                <span className="text-red-500 font-bold">*</span>
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
                autoFocus
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="staff-email" className="form-label">
                <Mail size={14} />
                <span>Email Address</span>
                <span className="text-red-500 font-bold">*</span>
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
                <option value="staff">Staff Agent (Customer Care CRM Access)</option>
                <option value="admin">Administrator (Full Access & Team Management)</option>
              </select>
              <span className="form-hint">
                {role === 'admin'
                  ? 'Administrators can manage complaints, configure routing, and invite new staff members.'
                  : 'Staff agents can review, process, and reply to assigned customer complaints.'}
              </span>
            </div>

            {/* Auto-Generated Temporary Password Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="staff-password"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  <KeyRound size={14} className="text-amber-500" />
                  <span>Temporary Password</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  disabled={loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-green-primary, #145E3D)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title="Generate a different random password"
                >
                  <RefreshCw size={12} />
                  <span>Regenerate</span>
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Generating secure password..."
                  className="form-input"
                  disabled={loading}
                  style={{
                    paddingRight: '120px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                  }}
                  required
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      padding: '4px 8px',
                      color: '#475569',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    title="Copy password to clipboard"
                  >
                    {copiedPassword ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span>{copiedPassword ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <span
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🔒 This password is automatically attached to the invitation email sent to this staff member.
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
                    <span>Creating & Inviting...</span>
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
        )}
      </div>
    </div>
  );
}
