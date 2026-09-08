import React from 'react';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import DashboardHeader from '@/components/staff/DashboardHeader';
import SlaPolicyTable from '@/components/staff/sla/SlaPolicyTable';
import { SlaPolicyRecord } from '@/types/sla';
import { Clock, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SLA Management | EliteHub Properties Staff Portal',
  description: 'Configure customer response and resolution deadlines and escalation policies.',
};

export default async function SlaSettingsPage() {
  const { profile, supabase } = await requireAdmin('/staff/settings/sla');

  // 1. Fetch all SLA policies with departments
  let policies: SlaPolicyRecord[] = [];
  const { data: policiesData, error: policiesErr } = await supabase
    .from('sla_policies')
    .select(`
      *,
      department:departments(id, name)
    `)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (!policiesErr && policiesData) {
    policies = policiesData as unknown as SlaPolicyRecord[];
  }

  // 2. Fetch active departments for policy modal dropdown
  const { data: deptData } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const departments = (deptData || []) as { id: string; name: string }[];

  const activeCount = policies.filter((p) => p.is_active).length;
  const autoEscalateCount = policies.filter((p) => p.is_active && p.auto_escalate).length;

  return (
    <div className="sla-settings-page-container">
      <DashboardHeader
        title="SLA Management"
        subtitle="Configure response and resolution targets, warning thresholds, and auto-escalation rules."
        profile={profile}
      />

      {/* KPI Overview Cards */}
      <div className="stats-kpi-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="staff-stat-card">
          <div className="stat-card-icon" style={{ background: '#e8f5ee', color: '#145E3D' }}>
            <Clock size={20} />
          </div>
          <div>
            <span className="stat-card-label">Total Policies</span>
            <strong className="stat-card-value">{policies.length}</strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="stat-card-icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="stat-card-label">Active Policies</span>
            <strong className="stat-card-value">{activeCount}</strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="stat-card-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="stat-card-label">Auto-Escalating</span>
            <strong className="stat-card-value">{autoEscalateCount}</strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="stat-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="stat-card-label">Matching Engine</span>
            <strong className="stat-card-value" style={{ fontSize: '1.05rem', color: '#7c3aed' }}>
              Hierarchical
            </strong>
          </div>
        </div>
      </div>

      {/* SLA Policy Management Table */}
      <SlaPolicyTable
        initialPolicies={policies}
        departments={departments}
      />
    </div>
  );
}
