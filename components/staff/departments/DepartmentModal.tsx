'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Check, Loader2, AlignLeft, Zap, ShieldCheck } from 'lucide-react';
import { DepartmentRecord } from '@/types/department';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dept: DepartmentRecord) => void;
  department?: DepartmentRecord | null;
}

export default function DepartmentModal({
  isOpen,
  onClose,
  onSuccess,
  department,
}: DepartmentModalProps) {
  const isEditing = !!department;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (department) {
      setName(department.name);
      setDescription(department.description || '');
      setAutoAssignEnabled(department.auto_assign_enabled);
      setIsActive(department.is_active);
    } else {
      setName('');
      setDescription('');
      setAutoAssignEnabled(false);
      setIsActive(true);
    }
    setError(null);
  }, [department, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Department name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/staff/departments/${department.id}`
        : '/api/staff/departments';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          auto_assign_enabled: autoAssignEnabled,
          is_active: isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to save department.');
        return;
      }

      onSuccess(data.department);
      onClose();
    } catch (err) {
      console.error('[DepartmentModal Submit Error]:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-pill">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="modal-title">
                {isEditing ? 'Edit Department' : 'Create New Department'}
              </h3>
              <p className="modal-subtitle">
                {isEditing
                  ? 'Update department configuration and routing rules'
                  : 'Add a new organizational unit to receive complaints'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="modal-error-banner" role="alert">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Department Name */}
          <div className="form-group">
            <label htmlFor="dept-name" className="form-label">
              <Building2 size={14} />
              <span>Department Name</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id="dept-name"
              type="text"
              className="form-input"
              placeholder="e.g. Technical Support, Billing & Finance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="dept-desc" className="form-label">
              <AlignLeft size={14} />
              <span>Description (Optional)</span>
            </label>
            <textarea
              id="dept-desc"
              className="form-textarea"
              placeholder="Brief description of department scope and responsibilities"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Intelligent Auto-Assignment Toggle Card */}
          <div className="department-toggle-card">
            <div className="toggle-info-col">
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" />
                <span className="toggle-info-title">Intelligent Auto-Assignment</span>
              </div>
              <span className="toggle-info-desc">
                Automatically allocate incoming complaints to the least-busy active staff member in this department.
              </span>
            </div>
            <label className="switch-wrapper" aria-label="Toggle Auto-Assignment">
              <input
                type="checkbox"
                checked={autoAssignEnabled}
                onChange={(e) => setAutoAssignEnabled(e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="switch-slider-round" />
            </label>
          </div>

          {/* Active Status Toggle (Editing only) */}
          {isEditing && (
            <div className="department-toggle-card">
              <div className="toggle-info-col">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span className="toggle-info-title">Department Active</span>
                </div>
                <span className="toggle-info-desc">
                  Inactive departments cannot receive new category mappings or automated ticket routing.
                </span>
              </div>
              <label className="switch-wrapper" aria-label="Toggle Department Active Status">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="switch-slider-round" />
              </label>
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-submit-modal"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>{isEditing ? 'Save Changes' : 'Create Department'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
