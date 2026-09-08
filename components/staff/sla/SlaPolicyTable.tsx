'use client';

import React, { useState } from 'react';
import { SlaPolicyRecord } from '@/types/sla';
import SlaPolicyModal from './SlaPolicyModal';
import {
  Clock,
  Plus,
  Edit2,
  Building2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

interface SlaPolicyTableProps {
  initialPolicies: SlaPolicyRecord[];
  departments: { id: string; name: string }[];
}

export default function SlaPolicyTable({ initialPolicies, departments }: SlaPolicyTableProps) {
  const [policies, setPolicies] = useState<SlaPolicyRecord[]>(initialPolicies);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicyRecord | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (policy: SlaPolicyRecord) => {
    setEditingPolicy(policy);
    setModalOpen(true);
  };

  const handleSaved = (saved: SlaPolicyRecord) => {
    setPolicies((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleToggleActive = async (policy: SlaPolicyRecord) => {
    setTogglingId(policy.id);
    try {
      const res = await fetch(`/api/staff/sla-policies/${policy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !policy.is_active }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPolicies((prev) =>
          prev.map((p) => (p.id === policy.id ? { ...p, is_active: !p.is_active } : p))
        );
      } else {
        alert(data.message || 'Failed to update policy status.');
      }
    } catch (err) {
      console.error('[handleToggleActive Error]:', err);
      alert('Network error while toggling policy.');
    } finally {
      setTogglingId(null);
    }
  };

  const formatHours = (hours: number) => {
    if (hours >= 24 && hours % 24 === 0) {
      const days = hours / 24;
      return `${days} ${days === 1 ? 'day' : 'days'} (${hours}h)`;
    }
    return `${hours} hrs`;
  };

  const filtered = policies.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.priority && p.priority.toLowerCase().includes(q)) ||
      (p.department?.name && p.department.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="staff-section-card">
      <div className="section-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="header-icon-pill" style={{ background: '#e8f5ee', color: '#145E3D' }}>
            <Clock size={18} />
          </div>
          <div>
            <h2 className="section-card-title">Configured SLA Policies</h2>
            <p className="section-card-subtitle">
              {policies.filter((p) => p.is_active).length} active policies governing complaint turnaround times
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <div className="table-search-box" style={{ width: '240px' }}>
            <Search size={15} className="search-box-icon" />
            <input
              type="text"
              className="table-search-input"
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search SLA policies"
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>New Policy</span>
          </button>
        </div>
      </div>

      <div className="table-responsive-container">
        {filtered.length === 0 ? (
          <div className="table-empty-state">
            <Clock size={36} className="text-muted mb-2" />
            <h3 className="empty-title">No SLA Policies Found</h3>
            <p className="empty-description">
              {searchQuery ? 'No policies match your search term.' : 'Create your first SLA policy to establish turnaround targets.'}
            </p>
          </div>
        ) : (
          <table className="staff-data-table" aria-label="SLA policies list">
            <thead>
              <tr>
                <th scope="col">Policy Name</th>
                <th scope="col">Scope (Dept / Priority)</th>
                <th scope="col">First Response</th>
                <th scope="col">Resolution Target</th>
                <th scope="col">Warning & Escalation</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((policy) => (
                <tr key={policy.id} className="data-table-row">
                  {/* Name & Description */}
                  <td>
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{policy.name}</strong>
                      {policy.description && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                          {policy.description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Scope */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {policy.department ? (
                        <span className="badge-dept-tag">
                          <Building2 size={10} className="inline mr-1" />
                          {policy.department.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">All Departments</span>
                      )}

                      {policy.priority ? (
                        <span className={`priority-pill priority-${policy.priority.toLowerCase()}`} style={{ width: 'fit-content' }}>
                          {policy.priority.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Any Priority</span>
                      )}
                    </div>
                  </td>

                  {/* First Response */}
                  <td>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {formatHours(policy.first_response_hours)}
                    </span>
                  </td>

                  {/* Resolution Target */}
                  <td>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {formatHours(policy.resolution_hours)}
                    </span>
                  </td>

                  {/* Warning & Escalation */}
                  <td>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      <div>Warn at: <strong>{policy.warning_percentage || 75}%</strong></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        {policy.auto_escalate ? (
                          <span style={{ color: '#b45309', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ShieldAlert size={12} /> Auto-Escalate
                          </span>
                        ) : (
                          <span className="text-muted">Manual Escalate</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status Toggle */}
                  <td>
                    <button
                      type="button"
                      className={`btn-status-toggle ${policy.is_active ? 'is-active' : 'is-inactive'}`}
                      onClick={() => handleToggleActive(policy)}
                      disabled={togglingId === policy.id}
                      title="Click to toggle active status"
                    >
                      {togglingId === policy.id ? (
                        <RefreshCw size={12} className="animate-spin inline mr-1" />
                      ) : policy.is_active ? (
                        <CheckCircle2 size={12} className="inline mr-1 text-success" />
                      ) : (
                        <XCircle size={12} className="inline mr-1 text-muted" />
                      )}
                      <span>{policy.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-table-action"
                      onClick={() => handleOpenEdit(policy)}
                      aria-label={`Edit ${policy.name}`}
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SlaPolicyModal
        isOpen={modalOpen}
        policy={editingPolicy}
        departments={departments}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSaved}
      />
    </div>
  );
}
