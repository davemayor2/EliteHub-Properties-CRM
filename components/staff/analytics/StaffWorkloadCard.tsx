'use client';

import React from 'react';
import Link from 'next/link';
import { Users, UserCheck, Shield, ArrowRight, FolderOpen, Clock, CheckCircle2 } from 'lucide-react';
import { StaffWorkloadItem, MyWorkloadMetrics } from '@/lib/analytics/types';

interface StaffWorkloadCardProps {
  isAdmin: boolean;
  teamWorkload: StaffWorkloadItem[];
  myWorkload?: MyWorkloadMetrics;
  currentUserId?: string;
}

export default function StaffWorkloadCard({
  isAdmin,
  teamWorkload,
  myWorkload,
  currentUserId,
}: StaffWorkloadCardProps) {
  // If user is regular staff, render the focused "My Workload" view
  if (!isAdmin) {
    const metrics = myWorkload || {
      assignedTotal: 0,
      openCount: 0,
      pendingCount: 0,
      resolvedCount: 0,
      closedCount: 0,
      activeWorkload: 0,
    };

    return (
      <div className="staff-section-card workload-card" role="region" aria-label="My Operational Workload">
        <div className="section-card-header">
          <div className="flex items-center gap-3">
            <div className="header-icon-pill icon-pill-emerald">
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="section-card-title">My Workload Queue</h3>
              <p className="section-card-subtitle">
                Complaints assigned directly to your active care queue
              </p>
            </div>
          </div>

          <Link href="/staff/complaints" className="btn-view-all-link">
            <span>Open Assigned</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="my-workload-grid">
          <div className="my-workload-stat-box">
            <div className="stat-box-icon text-blue-600 bg-blue-50">
              <FolderOpen size={18} />
            </div>
            <div className="stat-box-content">
              <span className="stat-box-num text-blue-700">{metrics.openCount}</span>
              <span className="stat-box-lbl">Open Tasks</span>
            </div>
          </div>

          <div className="my-workload-stat-box">
            <div className="stat-box-icon text-amber-600 bg-amber-50">
              <Clock size={18} />
            </div>
            <div className="stat-box-content">
              <span className="stat-box-num text-amber-700">{metrics.pendingCount}</span>
              <span className="stat-box-lbl">Pending Feedback</span>
            </div>
          </div>

          <div className="my-workload-stat-box">
            <div className="stat-box-icon text-emerald-600 bg-emerald-50">
              <CheckCircle2 size={18} />
            </div>
            <div className="stat-box-content">
              <span className="stat-box-num text-emerald-700">{metrics.resolvedCount}</span>
              <span className="stat-box-lbl">Resolved</span>
            </div>
          </div>

          <div className="my-workload-stat-box total-box">
            <div className="stat-box-icon text-gray-600 bg-gray-100">
              <UserCheck size={18} />
            </div>
            <div className="stat-box-content">
              <span className="stat-box-num text-gray-900">{metrics.assignedTotal}</span>
              <span className="stat-box-lbl">Total Assigned</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin View: Team Workload Leaderboard Table
  const maxActive = Math.max(...teamWorkload.map((t) => t.activeWorkload), 1);

  return (
    <div className="staff-section-card workload-card" role="region" aria-label="Team Workload Distribution">
      <div className="section-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-emerald">
            <Users size={18} />
          </div>
          <div>
            <h3 className="section-card-title">Staff Workload Distribution</h3>
            <p className="section-card-subtitle">
              Active assigned complaints across care team members
            </p>
          </div>
        </div>

        <Link href="/staff/team" className="btn-view-all-link">
          <span>Manage Team</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {teamWorkload.length === 0 ? (
        <div className="workload-empty-state">
          <p className="text-muted text-sm">No active staff members found.</p>
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="staff-data-table workload-table" aria-label="Staff workload table">
            <thead>
              <tr>
                <th scope="col">Staff Member</th>
                <th scope="col">Role</th>
                <th scope="col" className="text-center">Assigned</th>
                <th scope="col" className="text-center">Open</th>
                <th scope="col" className="text-center">Pending</th>
                <th scope="col" className="text-center">Resolved</th>
                <th scope="col">Active Load</th>
              </tr>
            </thead>
            <tbody>
              {teamWorkload.map((staff) => {
                const isCurrentUser = currentUserId === staff.staffId;
                const loadPercent = Math.round((staff.activeWorkload / maxActive) * 100);

                return (
                  <tr
                    key={staff.staffId}
                    className={`data-table-row ${isCurrentUser ? 'row-current-user' : ''}`}
                  >
                    {/* Staff Name & Email */}
                    <td className="cell-staff-name">
                      <div className="staff-identity-group">
                        <div className="staff-avatar-initials">
                          {staff.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="staff-text-group">
                          <span className="staff-full-name">
                            {staff.fullName}
                            {isCurrentUser && <span className="current-user-tag">You</span>}
                          </span>
                          <span className="staff-email-muted">{staff.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="cell-role">
                      <span className={`staff-role-badge badge-${staff.role}`}>
                        {staff.role === 'admin' ? (
                          <Shield size={11} className="inline mr-1" />
                        ) : null}
                        {staff.role}
                      </span>
                    </td>

                    {/* Assigned Total */}
                    <td className="cell-count text-center font-semibold">
                      {staff.assignedTotal}
                    </td>

                    {/* Open */}
                    <td className="cell-count text-center text-blue-600 font-medium">
                      {staff.openCount}
                    </td>

                    {/* Pending */}
                    <td className="cell-count text-center text-amber-600 font-medium">
                      {staff.pendingCount}
                    </td>

                    {/* Resolved */}
                    <td className="cell-count text-center text-emerald-600 font-medium">
                      {staff.resolvedCount}
                    </td>

                    {/* Active Load Bar */}
                    <td className="cell-workload-bar">
                      <div className="workload-bar-wrap">
                        <div className="workload-bar-track">
                          <div
                            className={`workload-bar-fill ${
                              staff.activeWorkload > 5
                                ? 'fill-high'
                                : staff.activeWorkload > 2
                                ? 'fill-medium'
                                : 'fill-low'
                            }`}
                            style={{ width: `${Math.max(6, loadPercent)}%` }}
                          />
                        </div>
                        <span className="workload-num-text">{staff.activeWorkload} active</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
