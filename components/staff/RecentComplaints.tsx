import React from 'react';
import Link from 'next/link';
import { ComplaintRecord } from '@/types/complaint';
import StatusBadge from '@/components/staff/StatusBadge';
import PriorityBadge from '@/components/staff/PriorityBadge';
import { ArrowRight, Inbox, Eye } from 'lucide-react';

interface RecentComplaintsProps {
  complaints: ComplaintRecord[];
  isLoading?: boolean;
}

export default function RecentComplaints({ complaints, isLoading = false }: RecentComplaintsProps) {
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
    <section className="staff-section-card recent-complaints-section" aria-labelledby="recent-complaints-title">
      <div className="section-card-header">
        <div>
          <h2 id="recent-complaints-title" className="section-card-title">
            Recent Complaints
          </h2>
          <p className="section-card-subtitle">
            Latest customer inquiries and issues submitted through the portal.
          </p>
        </div>

        <Link href="/staff/complaints" className="btn-view-all-link">
          <span>View All Complaints</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Complaints Table */}
      <div className="table-responsive-container">
        {isLoading ? (
          <div className="table-loading-skeleton">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="table-empty-state">
            <div className="empty-icon-circle">
              <Inbox size={32} />
            </div>
            <h3 className="empty-title">No Complaints Yet</h3>
            <p className="empty-description">
              Customer complaints submitted through the public portal will appear here in real-time.
            </p>
          </div>
        ) : (
          <table className="staff-data-table" aria-label="Recent complaints table">
            <thead>
              <tr>
                <th scope="col">Reference Number</th>
                <th scope="col">Customer</th>
                <th scope="col">Subject</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
                <th scope="col">Date Submitted</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((complaint) => (
                <tr key={complaint.id} className="data-table-row">
                  {/* Reference Number */}
                  <td className="cell-reference">
                    <span className="reference-code">{complaint.reference_number}</span>
                  </td>

                  {/* Customer Information */}
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
                    <span className="subject-truncate">{complaint.subject}</span>
                  </td>

                  {/* Status Badge */}
                  <td className="cell-status">
                    <StatusBadge status={complaint.status} />
                  </td>

                  {/* Priority Badge */}
                  <td className="cell-priority">
                    <PriorityBadge priority={complaint.priority} />
                  </td>

                  {/* Date Created */}
                  <td className="cell-date">
                    <span className="date-text">{formatDate(complaint.created_at)}</span>
                  </td>

                  {/* Action Link */}
                  <td className="cell-action text-right">
                    <Link
                      href={`/staff/complaints/${complaint.id}`}
                      className="btn-table-action"
                      aria-label={`View details for complaint ${complaint.reference_number}`}
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
