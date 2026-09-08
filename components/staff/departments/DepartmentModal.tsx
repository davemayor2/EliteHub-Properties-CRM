'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Check } from 'lucide-react';
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
    <div className="modal-backdrop-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="header-icon-pill icon-pill-emerald">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="modal-title">
                {isEditing ? 'Edit Department' : 'Create New Department'}
              </h3>
              <p className="modal-subtitle">
                {isEditing
                  ? 'Update department details and routing behavior'
                  : 'Add a new organizational unit to receive complaints'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-modal-close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="modal-error-banner" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form-body">
          {/* Department Name */}
          <div className="form-field">
            <label className="form-label">
              Department Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Technical Support, Billing & Finance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Brief description of department scope and responsibilities"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Auto Assign Toggle */}
          <div className="modal-toggle-row">
            <div className="toggle-text-block">
              <span className="toggle-title">Intelligent Auto-Assignment</span>
              <span className="toggle-desc">
                Automatically allocate new complaints to the least-busy active staff member in this department.
              </span>
            </div>
            <label className="switch-control">
              <input
                type="checkbox"
                checked={autoAssignEnabled}
                onChange={(e) => setAutoAssignEnabled(e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="switch-slider" />
            </label>
          </div>

          {/* Active Status Toggle (Editing only) */}
          {isEditing && (
            <div className="modal-toggle-row">
              <div className="toggle-text-block">
                <span className="toggle-title">Active Status</span>
                <span className="toggle-desc">
                  Inactive departments cannot receive new categories or automated routing.
                </span>
              </div>
              <label className="switch-control">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="switch-slider" />
              </label>
            </div>
          )}

          <div className="modal-actions-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-modal-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-modal-submit"
            >
              {isSubmitting ? (
                <span>Saving...</span>
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
