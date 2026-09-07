'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ComplaintRecord, ComplaintStatus } from '@/types/complaint';
import StatusBadge from '@/components/staff/StatusBadge';
import PriorityBadge from '@/components/staff/PriorityBadge';
import { Search, X, Inbox, Eye, Filter, RefreshCw } from 'lucide-react';

interface ComplaintTableProps {
  initialComplaints: ComplaintRecord[];
  initialStatus?: string;
  initialAssigned?: string;
}

export default function ComplaintTable({
  initialComplaints,
  initialStatus,
  initialAssigned,
}: ComplaintTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const defaultTab =
    initialAssigned === 'unassigned'
      ? 'unassigned'
      : initialStatus && ['new', 'open', 'pending', 'resolved', 'closed'].includes(initialStatus)
      ? initialStatus
      : 'all';
  const [selectedStatus, setSelectedStatus] = useState<string>(defaultTab);

  const filterTabs: { id: string; label: string; count: number }[] = useMemo(() => {
    const counts = {
      all: initialComplaints.length,
      new: initialComplaints.filter((c) => c.status === 'new').length,
      open: initialComplaints.filter((c) => c.status === 'open').length,
      pending: initialComplaints.filter((c) => c.status === 'pending').length,
      resolved: initialComplaints.filter((c) => c.status === 'resolved').length,
      closed: initialComplaints.filter((c) => c.status === 'closed').length,
      unassigned: initialComplaints.filter((c) => !c.assigned_to).length,
    };

    return [
      { id: 'all', label: 'All', count: counts.all },
      { id: 'new', label: 'New', count: counts.new },
      { id: 'open', label: 'Open', count: counts.open },
      { id: 'pending', label: 'Pending', count: counts.pending },
      { id: 'resolved', label: 'Resolved', count: counts.resolved },
      { id: 'closed', label: 'Closed', count: counts.closed },
      { id: 'unassigned', label: 'Unassigned', count: counts.unassigned },
    ];
  }, [initialComplaints]);

  // Filter complaints based on search query and selected status tab
  const filteredComplaints = useMemo(() => {
    return initialComplaints.filter((complaint) => {
      // 1. Status or Assignment Filter
      if (selectedStatus === 'unassigned') {
        if (complaint.assigned_to) {
          return false;
        }
      } else if (selectedStatus !== 'all' && complaint.status !== selectedStatus) {
        return false;
      }

      // 2. Text Search Query
      if (!searchQuery.trim()) {
        return true;
      }

      const query = searchQuery.toLowerCase().trim();
      const refMatch = complaint.reference_number?.toLowerCase().includes(query);
      const nameMatch = complaint.full_name?.toLowerCase().includes(query);
      const emailMatch = complaint.email?.toLowerCase().includes(query);
      const phoneMatch = complaint.phone?.toLowerCase().includes(query);
      const subjectMatch = complaint.subject?.toLowerCase().includes(query);

      return refMatch || nameMatch || emailMatch || phoneMatch || subjectMatch;
    });
  }, [initialComplaints, selectedStatus, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
  };

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

  const isFilteringActive = searchQuery.trim() !== '' || selectedStatus !== 'all';

  return (
    <div className="complaints-table-wrapper">
      {/* Controls Bar: Search & Status Filters */}
      <div className="table-controls-bar">
        {/* Status Filter Tabs */}
        <div className="status-filter-pills" role="tablist" aria-label="Filter complaints by status">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selectedStatus === tab.id}
              className={`filter-pill-btn ${selectedStatus === tab.id ? 'is-active' : ''}`}
              onClick={() => setSelectedStatus(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="pill-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="table-search-box">
          <Search size={16} className="search-box-icon" />
          <input
            type="text"
            className="table-search-input"
            placeholder="Search reference, customer, phone, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search complaints"
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search input"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Table Results Container */}
      <div className="table-responsive-container">
        {initialComplaints.length === 0 ? (
          /* Entire database empty */
          <div className="table-empty-state">
            <div className="empty-icon-circle">
              <Inbox size={36} />
            </div>
            <h3 className="empty-title">No Complaints Yet</h3>
            <p className="empty-description">
              Customer complaints submitted through the public intake portal will automatically appear here.
            </p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          /* Search / Filter produced 0 results */
          <div className="table-empty-state">
            <div className="empty-icon-circle">
              <Filter size={36} />
            </div>
            <h3 className="empty-title">No Matching Complaints Found</h3>
            <p className="empty-description">
              We couldn&apos;t find any complaints matching your current search query or active status filter.
            </p>
            <button
              type="button"
              className="btn-clear-filters-action"
              onClick={handleClearFilters}
            >
              <RefreshCw size={14} />
              <span>Reset & Clear All Filters</span>
            </button>
          </div>
        ) : (
          <>
            {/* Filter Summary Bar */}
            <div className="table-summary-bar">
              <span className="summary-count-text">
                Showing <strong>{filteredComplaints.length}</strong> of{' '}
                <strong>{initialComplaints.length}</strong> total complaints
                {isFilteringActive && ' (filtered)'}
              </span>

              {isFilteringActive && (
                <button
                  type="button"
                  className="btn-text-clear"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <table className="staff-data-table" aria-label="Complaints list">
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
                {filteredComplaints.map((complaint) => (
                  <tr key={complaint.id} className="data-table-row">
                    {/* Reference Number */}
                    <td className="cell-reference">
                      <span className="reference-code">{complaint.reference_number}</span>
                    </td>

                    {/* Customer Info */}
                    <td className="cell-customer">
                      <div className="customer-info-box">
                        <span className="customer-name">{complaint.full_name}</span>
                        <span className="customer-contact">
                          {complaint.email ? (
                            <span>{complaint.email}</span>
                          ) : (
                            <span>{complaint.phone}</span>
                          )}
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
                        <Eye size={14} />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
