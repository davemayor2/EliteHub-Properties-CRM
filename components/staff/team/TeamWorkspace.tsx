'use client';

import React, { useState, useMemo } from 'react';
import { StaffDetailView, TeamFiltersState, StaffMember } from '@/types/staff';
import TeamFilters from './TeamFilters';
import TeamTable from './TeamTable';
import AddStaffModal from './AddStaffModal';
import EditStaffModal from './EditStaffModal';
import DeactivateStaffDialog from './DeactivateStaffDialog';
import DeleteStaffDialog from './DeleteStaffDialog';
import { UserPlus, Users, ShieldCheck, UserX, Clock, Shield } from 'lucide-react';

interface TeamWorkspaceProps {
  initialTeam: StaffDetailView[];
}

export default function TeamWorkspace({ initialTeam }: TeamWorkspaceProps) {
  const [team, setTeam] = useState<StaffDetailView[]>(initialTeam);
  const [filters, setFilters] = useState<TeamFiltersState>({
    search: '',
    role: 'all',
    status: 'all',
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffDetailView | null>(null);
  const [statusToggleStaff, setStatusToggleStaff] = useState<StaffDetailView | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<StaffDetailView | null>(null);

  // Compute metric stats
  const metrics = useMemo(() => {
    const total = team.length;
    const active = team.filter((s) => s.is_active && (s.status === 'active' || s.has_logged_in)).length;
    const awaiting = team.filter((s) => s.is_active && (s.status === 'awaiting_login' || !s.has_logged_in)).length;
    const admins = team.filter((s) => s.role === 'admin' && s.is_active).length;
    const inactive = team.filter((s) => !s.is_active || s.status === 'inactive').length;
    return { total, active, awaiting, admins, inactive };
  }, [team]);

  // Filter team based on search, role, and status
  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      // Role filter
      if (filters.role !== 'all' && member.role !== filters.role) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        if (filters.status === 'active') {
          if (!member.is_active || (member.status !== 'active' && !member.has_logged_in)) return false;
        } else if (filters.status === 'awaiting_login') {
          if (!member.is_active || (member.status !== 'awaiting_login' && member.has_logged_in)) return false;
        } else if (filters.status === 'inactive') {
          if (member.is_active && member.status !== 'inactive') return false;
        }
      }

      // Search filter (full name or email)
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const matchesName = member.full_name.toLowerCase().includes(q);
        const matchesEmail = member.email.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [team, filters]);

  const handleStaffAdded = (newStaff: StaffMember) => {
    setTeam((prev) => [
      {
        ...newStaff,
        has_logged_in: false,
        status: 'awaiting_login',
        assigned_complaints_count: 0,
        open_complaints_count: 0,
      },
      ...prev,
    ]);
  };

  const handleStaffUpdated = (updatedStaff: StaffDetailView) => {
    setTeam((prev) =>
      prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s))
    );
  };

  const handleStaffDeleted = (deletedId: string) => {
    setTeam((prev) => prev.filter((s) => s.id !== deletedId));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
    });
  };

  const isFiltered =
    filters.search.trim() !== '' || filters.role !== 'all' || filters.status !== 'all';

  return (
    <div className="team-workspace">
      {/* Metrics Summary Strip */}
      <div className="team-metrics-grid">
        <div className="team-metric-card">
          <div className="team-metric-icon total">
            <Users size={20} />
          </div>
          <div className="team-metric-text-col">
            <span className="team-metric-value">{metrics.total}</span>
            <span className="team-metric-label">Total Staff</span>
          </div>
        </div>

        <div className="team-metric-card">
          <div className="team-metric-icon active">
            <ShieldCheck size={20} />
          </div>
          <div className="team-metric-text-col">
            <span className="team-metric-value">{metrics.active}</span>
            <span className="team-metric-label">Active Members</span>
          </div>
        </div>

        <div className="team-metric-card">
          <div className="team-metric-icon awaiting">
            <Clock size={20} />
          </div>
          <div className="team-metric-text-col">
            <span className="team-metric-value">{metrics.awaiting}</span>
            <span className="team-metric-label">Awaiting First Login</span>
          </div>
        </div>

        <div className="team-metric-card">
          <div className="team-metric-icon admins">
            <Shield size={20} />
          </div>
          <div className="team-metric-text-col">
            <span className="team-metric-value">{metrics.admins}</span>
            <span className="team-metric-label">Administrators</span>
          </div>
        </div>

        <div className="team-metric-card">
          <div className="team-metric-icon workload">
            <UserX size={20} />
          </div>
          <div className="team-metric-text-col">
            <span className="team-metric-value">{metrics.inactive}</span>
            <span className="team-metric-label">Inactive Accounts</span>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="staff-section-card team-main-card">
        {/* Top Action Bar */}
        <div className="team-card-header">
          <div>
            <h3 className="section-card-title">Staff Directory</h3>
            <p className="section-card-subtitle">
              Manage accounts, administrative permissions, and role assignments
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary btn-add-staff"
          >
            <UserPlus size={16} />
            <span>Add Staff Member</span>
          </button>
        </div>

        {/* Filters */}
        <TeamFilters
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
        />

        {/* Staff Table / Cards */}
        <TeamTable
          team={filteredTeam}
          onEditStaff={(s) => setEditingStaff(s)}
          onToggleStatus={(s) => setStatusToggleStaff(s)}
          onDeleteStaff={(s) => setDeleteStaff(s)}
          isFiltered={isFiltered}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Modals */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStaffAdded={handleStaffAdded}
      />

      <EditStaffModal
        isOpen={editingStaff !== null}
        staff={editingStaff}
        onClose={() => setEditingStaff(null)}
        onStaffUpdated={handleStaffUpdated}
      />

      <DeactivateStaffDialog
        isOpen={statusToggleStaff !== null}
        staff={statusToggleStaff}
        onClose={() => setStatusToggleStaff(null)}
        onStatusToggled={handleStaffUpdated}
      />

      <DeleteStaffDialog
        isOpen={deleteStaff !== null}
        staff={deleteStaff}
        onClose={() => setDeleteStaff(null)}
        onStaffDeleted={handleStaffDeleted}
      />
    </div>
  );
}
