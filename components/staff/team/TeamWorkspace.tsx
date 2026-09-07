'use client';

import React, { useState, useMemo } from 'react';
import { StaffDetailView, TeamFiltersState, StaffMember } from '@/types/staff';
import TeamFilters from './TeamFilters';
import TeamTable from './TeamTable';
import AddStaffModal from './AddStaffModal';
import EditStaffModal from './EditStaffModal';
import DeactivateStaffDialog from './DeactivateStaffDialog';
import { UserPlus, Users, ShieldCheck, UserX } from 'lucide-react';

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

  // Compute metric stats
  const metrics = useMemo(() => {
    const total = team.length;
    const active = team.filter((s) => s.is_active).length;
    const admins = team.filter((s) => s.role === 'admin' && s.is_active).length;
    const inactive = team.filter((s) => !s.is_active).length;
    return { total, active, admins, inactive };
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
        const isTargetActive = filters.status === 'active';
        if (member.is_active !== isTargetActive) {
          return false;
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
          <div className="metric-icon-box bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Users size={20} />
          </div>
          <div>
            <span className="metric-value">{metrics.total}</span>
            <span className="metric-label">Total Staff</span>
          </div>
        </div>

        <div className="team-metric-card">
          <div className="metric-icon-box bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="metric-value">{metrics.active}</span>
            <span className="metric-label">Active Members</span>
          </div>
        </div>

        <div className="team-metric-card">
          <div className="metric-icon-box bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="metric-value">{metrics.admins}</span>
            <span className="metric-label">Administrators</span>
          </div>
        </div>

        <div className="team-metric-card">
          <div className="metric-icon-box bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <UserX size={20} />
          </div>
          <div>
            <span className="metric-value">{metrics.inactive}</span>
            <span className="metric-label">Inactive Accounts</span>
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
            className="btn-add-staff"
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
    </div>
  );
}
