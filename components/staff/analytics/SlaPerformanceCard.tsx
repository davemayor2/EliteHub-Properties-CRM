'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Timer, AlertTriangle, CheckCircle, Flame, ArrowUpRight } from 'lucide-react';
import { SlaPerformanceMetrics } from '@/lib/analytics/performance';

interface SlaPerformanceCardProps {
  metrics: SlaPerformanceMetrics;
  selectedRangeLabel: string;
}

export default function SlaPerformanceCard({
  metrics,
  selectedRangeLabel,
}: SlaPerformanceCardProps) {
  const complianceRate = metrics.complianceRate;
  const isHighCompliance = complianceRate >= 90;
  const isMediumCompliance = complianceRate >= 75 && complianceRate < 90;

  const complianceColorClass = isHighCompliance
    ? 'text-emerald-600'
    : isMediumCompliance
    ? 'text-amber-600'
    : 'text-rose-600';

  const barColor = isHighCompliance
    ? 'bg-emerald-500'
    : isMediumCompliance
    ? 'bg-amber-500'
    : 'bg-rose-500';

  return (
    <div className="staff-section-card sla-performance-card" role="region" aria-label="SLA Compliance & Escalations">
      <div className="section-card-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="header-icon-pill icon-pill-purple">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="section-card-title">SLA Compliance & Escalations</h3>
              <p className="section-card-subtitle">
                Response deadlines and resolution targets ({selectedRangeLabel.toLowerCase()})
              </p>
            </div>
          </div>
          <Link
            href="/staff/complaints?sla=overdue"
            className="sla-view-risk-link"
          >
            <span>View At-Risk</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="resolution-metrics-grid">
        {/* Metric Box 1: SLA Compliance Rate */}
        <div className="resolution-metric-box">
          <div className="metric-box-top">
            <div className="box-icon-wrap rate-icon">
              <CheckCircle size={18} />
            </div>
            <span className="metric-box-name">Resolution SLA Compliance</span>
          </div>
          <div className="metric-box-value-row">
            <span className={`metric-large-value ${complianceColorClass}`}>
              {metrics.complianceRateFormatted}
            </span>
          </div>
          <p className="metric-box-subtext">
            {metrics.resolvedWithinSla} of {metrics.resolvedWithinSla + metrics.resolvedAfterSla} resolved complaints met SLA targets
          </p>

          <div className="resolution-mini-bar-track">
            <div
              className={`resolution-mini-bar-fill ${barColor}`}
              style={{ width: `${Math.min(100, Math.max(0, complianceRate))}%` }}
            />
          </div>
        </div>

        {/* Metric Box 2: Average First Response Time */}
        <div className="resolution-metric-box">
          <div className="metric-box-top">
            <div className="box-icon-wrap time-icon">
              <Timer size={18} />
            </div>
            <span className="metric-box-name">Avg First Response Time</span>
          </div>
          <div className="metric-box-value-row">
            <span className="metric-large-value time-val">
              {metrics.avgFirstResponseFormatted}
            </span>
          </div>
          <p className="metric-box-subtext">
            {metrics.avgFirstResponseHours !== null
              ? 'Average time from customer submission to first staff response'
              : 'Requires customer-facing staff response activity'}
          </p>

          <div className="resolution-mini-badge-note">
            <span className="font-medium text-slate-600">
              {metrics.totalWithSla} active/resolved cases tracked with SLA policies
            </span>
          </div>
        </div>
      </div>

      {/* Mini Tally Row: Overdue, Approaching, Escalated */}
      <div className="sla-tally-row">
        <Link
          href="/staff/complaints?sla=overdue"
          className="sla-tally-pill overdue"
        >
          <div className="sla-tally-pill-left">
            <AlertTriangle size={15} className="sla-tally-icon" />
            <span className="sla-tally-label">Overdue</span>
          </div>
          <span className="sla-tally-count">{metrics.overdueCount}</span>
        </Link>

        <Link
          href="/staff/complaints?sla=approaching"
          className="sla-tally-pill approaching"
        >
          <div className="sla-tally-pill-left">
            <Timer size={15} className="sla-tally-icon" />
            <span className="sla-tally-label">Approaching</span>
          </div>
          <span className="sla-tally-count">{metrics.approachingCount}</span>
        </Link>

        <Link
          href="/staff/complaints?escalated=true"
          className="sla-tally-pill escalated"
        >
          <div className="sla-tally-pill-left">
            <Flame size={15} className="sla-tally-icon" />
            <span className="sla-tally-label">Escalated</span>
          </div>
          <span className="sla-tally-count">{metrics.escalatedCount}</span>
        </Link>
      </div>
    </div>
  );
}
