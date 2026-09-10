'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { TeamFiltersState, StaffRole, StaffStatus } from '@/types/staff';

interface TeamFiltersProps {
  filters: TeamFiltersState;
  onChange: (nextFilters: TeamFiltersState) => void;
  onReset: () => void;
}

export default function TeamFilters({ filters, onChange, onReset }: TeamFiltersProps) {
  const isFiltered =
    filters.search.trim() !== '' || filters.role !== 'all' || filters.status !== 'all';

  return (
    <div className="team-filters-container">
      {/* Search Field */}
      <div className="team-search-wrapper">
        <Search size={16} className="team-search-icon" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search staff by name or email..."
          className="team-search-input"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, search: '' })}
            className="team-search-clear-btn"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Selects */}
      <div className="team-filter-controls">
        {/* Role Filter */}
        <div className="filter-select-group">
          <label htmlFor="role-filter" className="filter-select-label">
            <Filter size={13} />
            <span>Role:</span>
          </label>
          <select
            id="role-filter"
            value={filters.role}
            onChange={(e) =>
              onChange({ ...filters, role: e.target.value as 'all' | StaffRole })
            }
            className="team-filter-select"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="staff">Staff Agents</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="filter-select-group">
          <label htmlFor="status-filter" className="filter-select-label">
            <span>Status:</span>
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) =>
              onChange({ ...filters, status: e.target.value as 'all' | StaffStatus })
            }
            className="team-filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="awaiting_login">Awaiting First Login</option>
            <option value="inactive">Inactive Accounts</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="btn-reset-filters"
            title="Reset all filters"
          >
            <X size={13} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
