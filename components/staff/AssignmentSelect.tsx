'use client';

import React, { useState } from 'react';
import { StaffProfileRecord } from '@/types/complaint';
import { UserCheck, Check, Loader2, AlertCircle, Shield } from 'lucide-react';

interface AssignmentSelectProps {
  complaintId: string;
  assignedStaff: StaffProfileRecord | null;
  staffList: StaffProfileRecord[];
  onAssignChange?: (staff: StaffProfileRecord | null) => void;
}

export default function AssignmentSelect({
  complaintId,
  assignedStaff,
  staffList,
  onAssignChange,
}: AssignmentSelectProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(assignedStaff?.id || '');
  const [currentAssigned, setCurrentAssigned] = useState<StaffProfileRecord | null>(assignedStaff);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStaffId = e.target.value;
    if (nextStaffId === selectedStaffId) return;

    try {
      setLoading(true);
      setFeedback(null);

      const targetStaff = staffList.find((s) => s.id === nextStaffId) || null;

      const res = await fetch(`/api/staff/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigned_to: nextStaffId ? nextStaffId : null }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update assignment');
      }

      setSelectedStaffId(nextStaffId);
      setCurrentAssigned(targetStaff);
      if (onAssignChange) {
        onAssignChange(targetStaff);
      }

      setFeedback({
        type: 'success',
        message: targetStaff ? `Assigned to ${targetStaff.full_name}` : 'Unassigned complaint',
      });

      setTimeout(() => {
        setFeedback(null);
      }, 3000);
    } catch (err) {
      console.error('[Assignment Update Error]:', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error updating assignment',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="management-control-box">
      <div className="control-box-header">
        <label htmlFor="complaint-assignment-select" className="control-label">
          <UserCheck size={15} className="control-label-icon" />
          <span>Staff Assignment</span>
        </label>
        {loading && <Loader2 size={14} className="animate-spin text-muted" />}
      </div>

      <div className="select-wrapper">
        <select
          id="complaint-assignment-select"
          value={selectedStaffId}
          onChange={handleSelectChange}
          disabled={loading}
          className="management-select assignment-select"
        >
          <option value="">Unassigned (Open for Queue)</option>
          {/* If currently assigned staff is inactive, show as disabled option for historical accuracy */}
          {currentAssigned && currentAssigned.is_active === false && (
            <option value={currentAssigned.id} disabled>
              {currentAssigned.full_name} (INACTIVE - Historical)
            </option>
          )}
          {staffList
            .filter((staff) => staff.is_active !== false)
            .map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.full_name} ({staff.role.toUpperCase()}) - {staff.email}
              </option>
            ))}
        </select>
      </div>

      {/* Currently assigned card or unassigned state */}
      <div className="assignment-status-banner">
        {currentAssigned ? (
          <div className={`assigned-staff-chip ${currentAssigned.is_active === false ? 'chip-inactive' : ''}`}>
            <div className={`assigned-avatar ${currentAssigned.is_active === false ? 'avatar-inactive' : ''}`}>
              {getInitials(currentAssigned.full_name)}
            </div>
            <div className="assigned-meta">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="assigned-name">{currentAssigned.full_name}</span>
                <span className={`assigned-role-tag ${currentAssigned.role}`}>
                  {currentAssigned.role}
                </span>
                {currentAssigned.is_active === false && (
                  <span className="assigned-inactive-tag">Inactive</span>
                )}
              </div>
              <span className="assigned-email">{currentAssigned.email}</span>
            </div>
          </div>
        ) : (
          <div className="unassigned-chip">
            <Shield size={14} className="unassigned-icon" />
            <span>Unassigned • Visible to all support agents</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`control-feedback-chip ${feedback.type}`}>
          {feedback.type === 'success' ? (
            <Check size={13} />
          ) : (
            <AlertCircle size={13} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
