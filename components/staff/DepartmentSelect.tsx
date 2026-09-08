'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { DepartmentRecord } from '@/types/department';

interface DepartmentSelectProps {
  complaintId: string;
  currentDepartmentId: string | null;
  currentDepartmentName?: string | null;
  onDepartmentChange: (newDepartment: DepartmentRecord | null) => void;
}

export default function DepartmentSelect({
  complaintId,
  currentDepartmentId,
  currentDepartmentName,
  onDepartmentChange,
}: DepartmentSelectProps) {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>(currentDepartmentId || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSelectedId(currentDepartmentId || '');
  }, [currentDepartmentId]);

  useEffect(() => {
    fetch('/api/staff/departments')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.departments)) {
          setDepartments(data.departments);
        }
      })
      .catch((err) => console.error('[DepartmentSelect] Fetch error:', err));
  }, []);

  const handleChange = async (newDeptId: string) => {
    setSelectedId(newDeptId);
    setIsUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const chosenDept = departments.find((d) => d.id === newDeptId) || null;

      const res = await fetch(`/api/staff/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: newDeptId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to update department.');
        setSelectedId(currentDepartmentId || '');
        return;
      }

      onDepartmentChange(chosenDept);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('[DepartmentSelect Error]:', err);
      setError('Network error while updating department.');
      setSelectedId(currentDepartmentId || '');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="management-control-item" role="group" aria-labelledby="department-control-label">
      <div className="control-label-row">
        <label id="department-control-label" className="control-label">
          <Building2 size={14} className="control-icon text-muted" />
          <span>Department</span>
        </label>
        {isUpdating && <RefreshCw size={13} className="animate-spin text-muted" />}
        {success && <Check size={14} className="text-success" />}
      </div>

      <select
        className="form-input form-select"
        value={selectedId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isUpdating}
        aria-label="Change Complaint Department"
      >
        <option value="">Unassigned</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name} {!dept.is_active ? '(Inactive)' : ''}
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
