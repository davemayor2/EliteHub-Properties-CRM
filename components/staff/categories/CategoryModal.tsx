'use client';

import React, { useState, useEffect } from 'react';
import { X, Tag, AlertCircle, Check } from 'lucide-react';
import { ComplaintCategoryRecord } from '@/types/category';
import { DepartmentRecord } from '@/types/department';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cat: ComplaintCategoryRecord) => void;
  category?: ComplaintCategoryRecord | null;
  departments: DepartmentRecord[];
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  category,
  departments,
}: CategoryModalProps) {
  const isEditing = !!category;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setDepartmentId(category.department_id || '');
      setDisplayOrder(category.display_order || 0);
      setIsActive(category.is_active);
    } else {
      setName('');
      setDescription('');
      setDepartmentId(departments[0]?.id || '');
      setDisplayOrder(0);
      setIsActive(true);
    }
    setError(null);
  }, [category, isOpen, departments]);

  if (!isOpen) return null;

  // Active departments only for category assignment
  const activeDepartments = departments.filter((d) => d.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/staff/categories/${category.id}`
        : '/api/staff/categories';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          department_id: departmentId || null,
          display_order: Number(displayOrder) || 0,
          is_active: isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to save category.');
        return;
      }

      onSuccess(data.category);
      onClose();
    } catch (err) {
      console.error('[CategoryModal Submit Error]:', err);
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
            <div className="header-icon-pill icon-pill-gold">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="modal-title">
                {isEditing ? 'Edit Category' : 'Create Complaint Category'}
              </h3>
              <p className="modal-subtitle">
                {isEditing
                  ? 'Update classification and responsible department'
                  : 'Add a new category selectable on the customer complaint form'}
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
          {/* Category Name */}
          <div className="form-field">
            <label className="form-label">
              Category Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Property Issues, Refund Requests"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Department Association */}
          <div className="form-field">
            <label className="form-label">
              Responsible Department <span className="required-asterisk">*</span>
            </label>
            <select
              className="form-input form-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={isSubmitting}
              required
            >
              <option value="">Select a department...</option>
              {activeDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} {dept.auto_assign_enabled ? '(Auto-Assign)' : ''}
                </option>
              ))}
            </select>
            <p className="form-helper-text">
              Complaints submitted under this category will be routed to this department.
            </p>
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label">Customer Helper Description</label>
            <textarea
              className="form-textarea"
              placeholder="Guidance displayed to customers on the submission form"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          {/* Display Order */}
          <div className="form-field">
            <label className="form-label">Display Order</label>
            <input
              type="number"
              className="form-input"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
              disabled={isSubmitting}
              min={0}
            />
            <p className="form-helper-text">Lower numbers appear first in the customer dropdown list.</p>
          </div>

          {/* Active Status Toggle (Editing only) */}
          {isEditing && (
            <div className="modal-toggle-row">
              <div className="toggle-text-block">
                <span className="toggle-title">Active Status</span>
                <span className="toggle-desc">
                  Inactive categories are hidden from the public submission form but preserved on historical records.
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
                  <span>{isEditing ? 'Save Changes' : 'Create Category'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
