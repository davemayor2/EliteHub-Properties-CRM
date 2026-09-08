'use client';

import React, { useState } from 'react';
import {
  Building2,
  Users,
  Edit2,
  CheckCircle2,
  XCircle,
  Plus,
  Bot,
  Zap,
} from 'lucide-react';
import { DepartmentRecord } from '@/types/department';
import { StaffProfileRecord } from '@/types/complaint';
import DepartmentModal from './DepartmentModal';
import DepartmentMembersModal from './DepartmentMembersModal';

interface DepartmentTableProps {
  initialDepartments: DepartmentRecord[];
  allStaff: StaffProfileRecord[];
}

export default function DepartmentTable({
  initialDepartments,
  allStaff,
}: DepartmentTableProps) {
  const [departments, setDepartments] = useState<DepartmentRecord[]>(initialDepartments);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [managingDept, setManagingDept] = useState<DepartmentRecord | null>(null);

  const handleOpenCreate = () => {
    setEditingDept(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    setModalOpen(true);
  };

  const handleOpenMembers = (dept: DepartmentRecord) => {
    setManagingDept(dept);
    setMembersModalOpen(true);
  };

  const handleSaveSuccess = (savedDept: DepartmentRecord) => {
    setDepartments((prev) => {
      const idx = prev.findIndex((d) => d.id === savedDept.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...savedDept, member_count: prev[idx].member_count };
        return next;
      }
      return [...prev, { ...savedDept, member_count: 0 }].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    });
  };

  const handleMemberCountChange = (deptId: string, count: number) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId ? { ...d, member_count: count } : d))
    );
  };

  const handleToggleStatus = async (dept: DepartmentRecord) => {
    const nextStatus = !dept.is_active;
    const confirmMsg = nextStatus
      ? `Activate department "${dept.name}"?`
      : `Deactivate department "${dept.name}"? Inactive departments will no longer receive routing.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/staff/departments/${dept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.department) {
        handleSaveSuccess(data.department);
      } else {
        alert(data.message || 'Failed to update department status.');
      }
    } catch (err) {
      console.error('[Toggle Status Error]:', err);
      alert('Network error while updating department status.');
    }
  };

  return (
    <div className="departments-management-container">
      {/* Top Action Bar */}
      <div className="table-controls-bar flex items-center justify-between gap-4">
        <div>
          <h3 className="section-card-title">Configured Departments</h3>
          <p className="section-card-subtitle">
            {departments.length} {departments.length === 1 ? 'department' : 'departments'} configured
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn-primary-action"
        >
          <Plus size={15} />
          <span>Create Department</span>
        </button>
      </div>

      {/* Departments Table */}
      <div className="staff-section-card mt-4">
        {departments.length === 0 ? (
          <div className="table-empty-state">
            <div className="empty-icon-circle">
              <Building2 size={28} />
            </div>
            <h4 className="empty-title">No Departments Created</h4>
            <p className="empty-description">
              Create your first department to begin routing customer complaints.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-primary-action mt-3"
            >
              <Plus size={15} />
              <span>Create Department</span>
            </button>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="staff-data-table" aria-label="Departments table">
              <thead>
                <tr>
                  <th scope="col">Department</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="text-center">Members</th>
                  <th scope="col" className="text-center">Auto-Assignment</th>
                  <th scope="col" className="text-center">Status</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id} className="data-table-row">
                    {/* Name */}
                    <td className="cell-dept-name">
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <Building2 size={16} className="text-muted shrink-0" />
                        <span>{dept.name}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="cell-dept-desc text-muted text-sm max-w-[280px] truncate">
                      {dept.description || <span className="italic text-xs">No description</span>}
                    </td>

                    {/* Members Count with Button */}
                    <td className="cell-members text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenMembers(dept)}
                        className="btn-members-badge"
                        title="View and manage department staff"
                      >
                        <Users size={13} />
                        <span>{dept.member_count ?? 0} staff</span>
                      </button>
                    </td>

                    {/* Auto-Assignment Flag */}
                    <td className="cell-auto-assign text-center">
                      {dept.auto_assign_enabled ? (
                        <span className="auto-assign-pill enabled" title="Least-busy staff routing active">
                          <Zap size={11} className="inline mr-1" />
                          Enabled
                        </span>
                      ) : (
                        <span className="auto-assign-pill disabled" title="Complaints remain unassigned">
                          Manual Only
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="cell-status text-center">
                      {dept.is_active ? (
                        <span className="status-badge-active">
                          <CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="status-badge-inactive">
                          <XCircle size={12} className="inline mr-1 text-gray-500" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="cell-actions text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenMembers(dept)}
                          className="btn-table-action"
                          title="Manage staff members"
                        >
                          <Users size={13} />
                          <span>Staff</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(dept)}
                          className="btn-table-action"
                          title="Edit department"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(dept)}
                          className={`btn-table-action-toggle ${
                            dept.is_active ? 'btn-deactivate' : 'btn-activate'
                          }`}
                          title={dept.is_active ? 'Deactivate department' : 'Activate department'}
                        >
                          {dept.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <DepartmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSaveSuccess}
        department={editingDept}
      />

      {/* Members Management Modal */}
      <DepartmentMembersModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        department={managingDept}
        allStaff={allStaff}
        onMemberCountChange={handleMemberCountChange}
      />
    </div>
  );
}
