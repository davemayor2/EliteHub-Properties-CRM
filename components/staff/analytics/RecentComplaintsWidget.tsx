'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Inbox, Eye, Clock } from 'lucide-react';
import { ComplaintRecord } from '@/types/complaint';
import StatusBadge from '@/components/staff/StatusBadge';
import PriorityBadge from '@/components/staff/PriorityBadge';

interface RecentComplaintsWidgetProps {
  complaints: ComplaintRecord[];
}

export default function RecentComplaintsWidget({ complaints }: RecentComplaintsWidgetProps) {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="staff-section-card recent-complaints-card" role="region" aria-label="Recent Complaints">
      <div className="section-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-emerald">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="section-card-title">Recent Submissions</h3>
            <p className="section-card-subtitle">
              Most recent incoming customer inquiries and complaints
            </p>
          </div>
        </div>

        <Link href="/staff/complaints" className="btn-view-all-link">
          <span>View All Complaints</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {complaints.length === 0 ? (
        <div className="table-empty-state">
          <div className="empty-icon-circle">
            <Inbox size={28} />
          </div>
          <h4 className="empty-title">No Recent Complaints</h4>
          <p className="empty-description">
            Submissions received through the portal will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="staff-data-table recent-table" aria-label="Recent complaints summary table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Customer</th>
                <th scope="col">Subject</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
                <th scope="col">Assigned Staff</th>
                <th scope="col">Submitted</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((complaint) => {
                const assignedName =
                  complaint.assigned_profile?.full_name ||
                  (complaint.assigned_to ? 'Assigned' : 'Unassigned');

                return (
                  <tr key={complaint.id} className="data-table-row">
                    {/* Reference Number */}
                    <td className="cell-reference">
                      <span className="reference-code">{complaint.reference_number}</span>
                    </td>

                    {/* Customer */}
                    <td className="cell-customer">
                      <div className="customer-info-box">
                        <span className="customer-name">{complaint.full_name}</span>
                        <span className="customer-contact">
                          {complaint.email || complaint.phone}
                        </span>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="cell-subject" title={complaint.subject}>
                      <span className="subject-truncate max-w-[200px] inline-block truncate">
                        {complaint.subject}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="cell-status">
                      <StatusBadge status={complaint.status} />
                    </td>

                    {/* Priority */}
                    <td className="cell-priority">
                      <PriorityBadge priority={complaint.priority} />
                    </td>

                    {/* Assigned Staff */}
                    <td className="cell-assigned">
                      <span
                        className={`assigned-pill ${
                          complaint.assigned_profile ? 'has-assignee' : 'unassigned'
                        }`}
                      >
                        {assignedName}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="cell-date">
                      <span className="date-text">{formatDate(complaint.created_at)}</span>
                    </td>

                    {/* Action */}
                    <td className="cell-action text-right">
                      <Link
                        href={`/staff/complaints/${complaint.id}`}
                        className="btn-table-action"
                        aria-label={`View details for complaint ${complaint.reference_number}`}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </Link>
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
