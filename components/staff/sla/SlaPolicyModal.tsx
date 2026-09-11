'use client';

import React, { useState, useEffect } from 'react';
import { SlaPolicyRecord, SlaPolicyPayload } from '@/types/sla';
import { ComplaintPriority } from '@/types/complaint';
import { X, RefreshCw, AlertTriangle, Clock } from 'lucide-react';

interface SlaPolicyModalProps {
  isOpen: boolean;
  policy: SlaPolicyRecord | null;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: (policy: SlaPolicyRecord) => void;
}

const PRIORITIES: { value: ComplaintPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

export default function SlaPolicyModal({
  isOpen,
  policy,
  departments,
  onClose,
  onSuccess,
}: SlaPolicyModalProps) {
  const isEditing = Boolean(policy);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [firstResponseHours, setFirstResponseHours] = useState<number>(24);
  const [resolutionHours, setResolutionHours] = useState<number>(120);
  const [warningPercentage, setWarningPercentage] = useState<number>(75);
  const [autoEscalate, setAutoEscalate] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      setName(policy.name || '');
      setDescription(policy.description || '');
      setPriority(policy.priority || '');
      setDepartmentId(policy.department_id || '');
      setFirstResponseHours(policy.first_response_hours || 24);
      setResolutionHours(policy.resolution_hours || 120);
      setWarningPercentage(policy.warning_percentage || 75);
      setAutoEscalate(policy.auto_escalate ?? true);
      setIsActive(policy.is_active ?? true);
    } else {
      setName('');
      setDescription('');
      setPriority('');
      setDepartmentId('');
      setFirstResponseHours(24);
      setResolutionHours(120);
      setWarningPercentage(75);
      setAutoEscalate(true);
      setIsActive(true);
    }
    setError(null);
  }, [policy, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Client-side validations
    if (!name.trim()) {
      setError('Policy name is required.');
      setIsSubmitting(false);
      return;
    }

    if (firstResponseHours <= 0) {
      setError('First response target must be at least 1 hour.');
      setIsSubmitting(false);
      return;
    }

    if (resolutionHours <= 0) {
      setError('Resolution target must be at least 1 hour.');
      setIsSubmitting(false);
      return;
    }

    if (resolutionHours < firstResponseHours) {
      setError('Resolution target cannot be shorter than first response target.');
      setIsSubmitting(false);
      return;
    }

    if (warningPercentage <= 0 || warningPercentage > 100) {
      setError('Warning percentage must be between 1% and 100%.');
      setIsSubmitting(false);
      return;
    }

    const payload: SlaPolicyPayload = {
      name: name.trim(),
      description: description.trim() || null,
      priority: (priority as ComplaintPriority) || null,
      department_id: departmentId || null,
      first_response_hours: firstResponseHours,
      resolution_hours: resolutionHours,
      warning_percentage: warningPercentage,
      auto_escalate: autoEscalate,
      is_active: isActive,
    };

    try {
      const url = isEditing ? `/api/staff/sla-policies/${policy!.id}` : '/api/staff/sla-policies';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to save SLA policy.');
        return;
      }

      onSuccess(data.policy);
      onClose();
    } catch (err) {
      console.error('[SlaPolicyModal Error]:', err);
      setError('A network error occurred while saving policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-overlay" role="dialog" aria-modal="true" aria-labelledby="sla-modal-title">
      <div className="modal-container-card" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} className="text-primary" />
            <h3 id="sla-modal-title" className="modal-title">
              {isEditing ? 'Edit SLA Policy' : 'Create SLA Policy'}
            </h3>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error mb-3" style={{ fontSize: '0.85rem', padding: '10px 12px' }}>
                <AlertTriangle size={14} className="inline mr-1" />
                {error}
              </div>
            )}

            <div className="form-group mb-3">
              <label className="form-label" htmlFor="sla-name">
                Policy Name <span className="text-danger">*</span>
              </label>
              <input
                id="sla-name"
                type="text"
                className="form-input"
                placeholder="E.g., Urgent Finance SLA"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label" htmlFor="sla-desc">
                Description <span className="text-muted">(Optional)</span>
              </label>
              <input
                id="sla-desc"
                type="text"
                className="form-input"
                placeholder="E.g., Applies to billing disputes and refund requests"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Scope Grid: Department & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="sla-dept">
                  Department Scope
                </label>
                <select
                  id="sla-dept"
                  className="form-input form-select"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Any Department (Global)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sla-prio">
                  Priority Scope
                </label>
                <select
                  id="sla-prio"
                  className="form-input form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Any Priority</option>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Hours Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="sla-first-resp">
                  First Response (Hrs) <span className="text-danger">*</span>
                </label>
                <input
                  id="sla-first-resp"
                  type="number"
                  min={1}
                  className="form-input"
                  value={firstResponseHours}
                  onChange={(e) => setFirstResponseHours(parseInt(e.target.value, 10) || 0)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sla-resolution">
                  Resolution (Hrs) <span className="text-danger">*</span>
                </label>
                <input
                  id="sla-resolution"
                  type="number"
                  min={1}
                  className="form-input"
                  value={resolutionHours}
                  onChange={(e) => setResolutionHours(parseInt(e.target.value, 10) || 0)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sla-warn-pct">
                  Warning (%) <span className="text-danger">*</span>
                </label>
                <input
                  id="sla-warn-pct"
                  type="number"
                  min={1}
                  max={100}
                  className="form-input"
                  value={warningPercentage}
                  onChange={(e) => setWarningPercentage(parseInt(e.target.value, 10) || 75)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label className="switch-control-label">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={autoEscalate}
                  onChange={(e) => setAutoEscalate(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="switch-slider" />
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                    Auto-Escalate on Breach
                  </span>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Automatically mark ticket as escalated and notify administrators if SLA target is missed.
                  </p>
                </div>
              </label>

              <label className="switch-control-label">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="switch-slider" />
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                    Active Policy
                  </span>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Only active policies are eligible to match new incoming complaints.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit-modal"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin mr-1 inline" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Create Policy'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
