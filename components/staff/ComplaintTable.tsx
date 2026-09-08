'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ComplaintRecord, ComplaintStatus } from '@/types/complaint';
import StatusBadge from '@/components/staff/StatusBadge';
import PriorityBadge from '@/components/staff/PriorityBadge';
import SlaStatusBadge from '@/components/staff/sla/SlaStatusBadge';
import { checkSlaStatus } from '@/lib/sla/checkSlaStatus';
import { Search, X, Inbox, Eye, Filter, RefreshCw, Building2, Tag, Clock } from 'lucide-react';

interface ComplaintTableProps {
  initialComplaints: ComplaintRecord[];
  initialStatus?: string;
  initialAssigned?: string;
  departments?: { id: string; name: string }[];
  categories?: { id: string; name: string }[];
}

export default function ComplaintTable({
  initialComplaints,
  initialStatus,
  initialAssigned,
  departments = [],
  categories = [],
}: ComplaintTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSla, setSelectedSla] = useState<string>('all');

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

  // Filter complaints based on search query, selected status tab, department, and category
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

      // 2. Department Filter
      if (selectedDepartment !== 'all' && complaint.department_id !== selectedDepartment) {
        return false;
      }

      // 3. Category Filter
      if (selectedCategory !== 'all' && complaint.category_id !== selectedCategory) {
        return false;
      }

      // 4. SLA Status Filter
      if (selectedSla !== 'all') {
        const sla = checkSlaStatus(complaint);
        if (selectedSla === 'escalated') {
          if (!complaint.is_escalated) return false;
        } else if (selectedSla === 'on_track') {
          if (sla.status !== 'on_track') return false;
        } else if (selectedSla === 'approaching') {
          if (sla.status !== 'approaching_deadline') return false;
        } else if (selectedSla === 'overdue') {
          if (!['overdue', 'first_response_breached', 'resolution_breached', 'resolved_after_sla'].includes(sla.status)) return false;
        }
      }

      // 5. Text Search Query
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
  }, [initialComplaints, selectedStatus, selectedDepartment, selectedCategory, selectedSla, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedDepartment('all');
    setSelectedCategory('all');
    setSelectedSla('all');
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

  const isFilteringActive =
    searchQuery.trim() !== '' ||
    selectedStatus !== 'all' ||
    selectedDepartment !== 'all' ||
    selectedCategory !== 'all' ||
    selectedSla !== 'all';

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

        {/* Search Box & Dropdown Filters */}
        <div className="table-controls-right">
          {departments.length > 0 && (
            <select
              className="table-filter-select"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          {categories.length > 0 && (
            <select
              className="table-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <select
            className="table-filter-select"
            value={selectedSla}
            onChange={(e) => setSelectedSla(e.target.value)}
            aria-label="Filter by SLA status"
          >
            <option value="all">All SLA Status</option>
            <option value="on_track">On Track</option>
            <option value="approaching">Approaching Deadline</option>
            <option value="overdue">Overdue / Breached</option>
            <option value="escalated">Escalated</option>
          </select>

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
                  <th scope="col">SLA</th>
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

                    {/* Subject & Classification Tags */}
                    <td className="cell-subject" title={complaint.subject}>
                      <span className="subject-truncate">{complaint.subject}</span>
                      {(complaint.department?.name || complaint.category?.name) && (
                        <div className="table-meta-tags mt-1">
                          {complaint.department?.name && (
                            <span className="badge-dept-tag">
                              <Building2 size={10} className="inline mr-1" />
                              {complaint.department.name}
                            </span>
                          )}
                          {complaint.category?.name && (
                            <span className="badge-cat-tag">
                              <Tag size={10} className="inline mr-1" />
                              {complaint.category.name}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="cell-status">
                      <StatusBadge status={complaint.status} />
                    </td>

                    {/* Priority Badge */}
                    <td className="cell-priority">
                      <PriorityBadge priority={complaint.priority} />
                    </td>

                    {/* SLA Status Badge */}
                    <td className="cell-sla">
                      <SlaStatusBadge complaint={complaint} />
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
