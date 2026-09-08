'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Trash2, AlertCircle, Shield } from 'lucide-react';
import { DepartmentRecord, StaffDepartmentRecord } from '@/types/department';
import { StaffProfileRecord } from '@/types/complaint';

interface DepartmentMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentRecord | null;
  allStaff: StaffProfileRecord[];
  onMemberCountChange: (deptId: string, count: number) => void;
}

export default function DepartmentMembersModal({
  isOpen,
  onClose,
  department,
  allStaff,
  onMemberCountChange,
}: DepartmentMembersModalProps) {
  const [members, setMembers] = useState<StaffDepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!department) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/departments/${department.id}/members`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMembers(data.members || []);
        onMemberCountChange(department.id, (data.members || []).length);
      } else {
        setError(data.message || 'Failed to load department members.');
      }
    } catch (err) {
      console.error('[Fetch Members Error]:', err);
      setError('Network error loading department members.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && department) {
      fetchMembers();
      setSelectedStaffId('');
      setError(null);
    }
  }, [isOpen, department?.id]);

  if (!isOpen || !department) return null;

  // Filter available staff to active accounts not already in this department
  const existingStaffIds = new Set(members.map((m) => m.staff_id));
  const availableStaff = allStaff.filter(
    (s) => s.is_active !== false && !existingStaffIds.has(s.id)
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    setIsAdding(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/departments/${department.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: selectedStaffId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to add staff member.');
        return;
      }

      setSelectedStaffId('');
      await fetchMembers();
    } catch (err) {
      console.error('[Add Member Error]:', err);
      setError('Failed to add staff member.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (staffId: string) => {
    if (!confirm('Remove this staff member from the department?')) return;

    setError(null);
    try {
      const res = await fetch(
        `/api/staff/departments/${department.id}/members?staffId=${encodeURIComponent(staffId)}`,
        { method: 'DELETE' }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to remove staff member.');
        return;
      }

      await fetchMembers();
    } catch (err) {
      console.error('[Remove Member Error]:', err);
      setError('Failed to remove staff member.');
    }
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="header-icon-pill icon-pill-emerald">
              <Users size={18} />
            </div>
            <div>
              <h3 className="modal-title">{department.name} Members</h3>
              <p className="modal-subtitle">
                Staff members authorized to resolve complaints in this department
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

        <div className="modal-form-body">
          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="add-member-control-row">
            <select
              className="form-input form-select"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={isAdding || availableStaff.length === 0}
            >
              <option value="">
                {availableStaff.length === 0
                  ? 'All active staff are already in this department'
                  : 'Select active staff member to add...'}
              </option>
              {availableStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name} ({staff.role}) - {staff.email}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={isAdding || !selectedStaffId}
              className="btn-modal-submit shrink-0"
            >
              <UserPlus size={15} />
              <span>{isAdding ? 'Adding...' : 'Add Member'}</span>
            </button>
          </form>

          {/* Members List */}
          <div className="department-members-list-wrapper">
            <div className="members-section-header">
              <span className="members-count-badge">
                {members.length} {members.length === 1 ? 'Member' : 'Members'}
              </span>
            </div>

            {isLoading ? (
              <div className="members-loading-state">
                <span>Loading department members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="members-empty-state">
                <Users size={28} className="text-muted opacity-40 mb-2" />
                <p className="empty-title">No staff members in this department yet.</p>
                <p className="empty-desc">
                  Add active staff accounts above to enable complaint allocation.
                </p>
              </div>
            ) : (
              <div className="members-items-list">
                {members.map((m) => {
                  const staff = m.profile;
                  const fullName = staff?.full_name || staff?.email || 'Staff Member';
                  const initials = fullName.slice(0, 2).toUpperCase();

                  return (
                    <div key={m.id} className="member-list-item">
                      <div className="member-info-group">
                        <div className="staff-avatar-initials">{initials}</div>
                        <div className="member-text-group">
                          <span className="member-name">{fullName}</span>
                          <div className="member-sub-row">
                            <span className="member-email">{staff?.email}</span>
                            <span className={`staff-role-badge badge-${staff?.role || 'staff'}`}>
                              {staff?.role === 'admin' && <Shield size={10} className="inline mr-1" />}
                              {staff?.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.staff_id)}
                        className="btn-remove-member"
                        title="Remove member from department"
                        aria-label={`Remove ${fullName}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions-footer">
          <button type="button" onClick={onClose} className="btn-modal-cancel">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
