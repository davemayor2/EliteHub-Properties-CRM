'use client';

import React from 'react';
import Link from 'next/link';
import { StaffDetailView } from '@/types/staff';
import StaffStatusBadge from './StaffStatusBadge';
import StaffRoleBadge from './StaffRoleBadge';
import {
  MoreHorizontal,
  Edit2,
  Power,
  ExternalLink,
  Users,
  SearchX,
  Briefcase,
} from 'lucide-react';

interface TeamTableProps {
  team: StaffDetailView[];
  onEditStaff: (staff: StaffDetailView) => void;
  onToggleStatus: (staff: StaffDetailView) => void;
  isFiltered?: boolean;
  onResetFilters?: () => void;
}

export default function TeamTable({
  team,
  onEditStaff,
  onToggleStatus,
  isFiltered = false,
  onResetFilters,
}: TeamTableProps) {
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  if (team.length === 0) {
    if (isFiltered) {
      return (
        <div className="empty-team-box">
          <div className="empty-team-icon-circle">
            <SearchX size={28} />
          </div>
          <h4 className="empty-team-title">No matching staff members found</h4>
          <p className="empty-team-desc">
            No team members matched your current search and filter settings.
          </p>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="btn-reset-filters mt-4"
            >
              Reset Filters
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="empty-team-box">
        <div className="empty-team-icon-circle">
          <Users size={28} />
        </div>
        <h4 className="empty-team-title">No staff members found</h4>
        <p className="empty-team-desc">
          Click &quot;Add Staff Member&quot; above to invite customer care agents to the CRM.
        </p>
      </div>
    );
  }

  return (
    <div className="team-table-wrapper">
      {/* Desktop Table View */}
      <table className="team-table">
        <thead>
          <tr>
            <th className="th-name">Staff Member</th>
            <th className="th-email">Email Address</th>
            <th className="th-role">Role</th>
            <th className="th-status">Status</th>
            <th className="th-assigned">Assigned Cases</th>
            <th className="th-date">Joined Date</th>
            <th className="th-actions text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {team.map((member) => (
            <tr key={member.id} className={!member.is_active ? 'row-inactive' : ''}>
              {/* Name & Avatar */}
              <td className="td-name">
                <div className="staff-profile-chip">
                  <div className={`staff-avatar ${!member.is_active ? 'avatar-inactive' : ''}`}>
                    {getInitials(member.full_name)}
                  </div>
                  <div className="staff-meta">
                    <Link
                      href={`/staff/team/${member.id}`}
                      className="staff-name-link font-semibold"
                    >
                      {member.full_name}
                    </Link>
                  </div>
                </div>
              </td>

              {/* Email */}
              <td className="td-email">
                <span className="staff-email-text">{member.email}</span>
              </td>

              {/* Role */}
              <td className="td-role">
                <StaffRoleBadge role={member.role} />
              </td>

              {/* Status */}
              <td className="td-status">
                <StaffStatusBadge isActive={member.is_active} />
              </td>

              {/* Assigned Complaints Metric */}
              <td className="td-assigned">
                <div className="workload-pill" title={`${member.open_complaints_count} open cases`}>
                  <Briefcase size={12} className="text-muted" />
                  <span>
                    <strong>{member.open_complaints_count}</strong> open / {member.assigned_complaints_count} total
                  </span>
                </div>
              </td>

              {/* Joined Date */}
              <td className="td-date">
                <span className="staff-date-text">{formatDate(member.created_at)}</span>
              </td>

              {/* Actions */}
              <td className="td-actions text-right">
                <div className="team-row-actions">
                  <Link
                    href={`/staff/team/${member.id}`}
                    className="btn-action-icon"
                    title="View staff profile & details"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEditStaff(member)}
                    className="btn-action-icon"
                    title="Edit profile and role"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(member)}
                    className={`btn-action-icon ${member.is_active ? 'text-danger' : 'text-success'}`}
                    title={member.is_active ? 'Deactivate staff member' : 'Reactivate staff member'}
                  >
                    <Power size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Responsive Cards View */}
      <div className="team-cards-mobile">
        {team.map((member) => (
          <div
            key={member.id}
            className={`team-mobile-card ${!member.is_active ? 'card-inactive' : ''}`}
          >
            <div className="mobile-card-top">
              <div className="staff-profile-chip">
                <div className={`staff-avatar ${!member.is_active ? 'avatar-inactive' : ''}`}>
                  {getInitials(member.full_name)}
                </div>
                <div>
                  <Link
                    href={`/staff/team/${member.id}`}
                    className="staff-name-link font-semibold"
                  >
                    {member.full_name}
                  </Link>
                  <p className="mobile-email-text">{member.email}</p>
                </div>
              </div>
              <StaffStatusBadge isActive={member.is_active} />
            </div>

            <div className="mobile-card-badges">
              <StaffRoleBadge role={member.role} />
              <span className="mobile-workload-text">
                {member.open_complaints_count} open cases
              </span>
            </div>

            <div className="mobile-card-footer">
              <span className="mobile-joined-text">Joined {formatDate(member.created_at)}</span>
              <div className="mobile-card-actions">
                <Link
                  href={`/staff/team/${member.id}`}
                  className="btn-mobile-action"
                >
                  <ExternalLink size={13} />
                  <span>View</span>
                </Link>
                <button
                  type="button"
                  onClick={() => onEditStaff(member)}
                  className="btn-mobile-action"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStatus(member)}
                  className={`btn-mobile-action ${member.is_active ? 'btn-danger-text' : 'btn-success-text'}`}
                >
                  <Power size={13} />
                  <span>{member.is_active ? 'Deactivate' : 'Reactivate'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
