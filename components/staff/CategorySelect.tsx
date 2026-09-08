'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { ComplaintCategoryRecord } from '@/types/category';

interface CategorySelectProps {
  complaintId: string;
  currentCategoryId: string | null;
  currentCategoryName?: string | null;
  onCategoryChange: (newCategory: ComplaintCategoryRecord | null) => void;
  onDepartmentAutoSuggest?: (deptId: string | null) => void;
}

export default function CategorySelect({
  complaintId,
  currentCategoryId,
  currentCategoryName,
  onCategoryChange,
  onDepartmentAutoSuggest,
}: CategorySelectProps) {
  const [categories, setCategories] = useState<ComplaintCategoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>(currentCategoryId || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSelectedId(currentCategoryId || '');
  }, [currentCategoryId]);

  useEffect(() => {
    fetch('/api/staff/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch((err) => console.error('[CategorySelect] Fetch error:', err));
  }, []);

  const handleChange = async (newCatId: string) => {
    setSelectedId(newCatId);
    setIsUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const chosenCat = categories.find((c) => c.id === newCatId) || null;

      const body: Record<string, any> = {
        category_id: newCatId || null,
      };

      // Automatically update department if category is mapped to a department
      if (chosenCat?.department_id) {
        body.department_id = chosenCat.department_id;
      }

      const res = await fetch(`/api/staff/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to update category.');
        setSelectedId(currentCategoryId || '');
        return;
      }

      onCategoryChange(chosenCat);
      if (chosenCat?.department_id && onDepartmentAutoSuggest) {
        onDepartmentAutoSuggest(chosenCat.department_id);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('[CategorySelect Error]:', err);
      setError('Network error while updating category.');
      setSelectedId(currentCategoryId || '');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="management-control-item" role="group" aria-labelledby="category-control-label">
      <div className="control-label-row">
        <label id="category-control-label" className="control-label">
          <Tag size={14} className="control-icon text-muted" />
          <span>Category</span>
        </label>
        {isUpdating && <RefreshCw size={13} className="animate-spin text-muted" />}
        {success && <Check size={14} className="text-success" />}
      </div>

      <select
        className="form-input form-select"
        value={selectedId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isUpdating}
        aria-label="Change Complaint Category"
      >
        <option value="">Uncategorized</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name} {!cat.is_active ? '(Inactive)' : ''}
          </option>
        ))}
      </select>

      {error && (
        <div className="field-error-msg mt-1" role="alert">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
