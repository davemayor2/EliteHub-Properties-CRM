'use client';

import React from 'react';
import { Award, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { ResolutionMetrics } from '@/lib/analytics/types';

interface ResolutionPerformanceCardProps {
  metrics: ResolutionMetrics;
  selectedRangeLabel: string;
}

export default function ResolutionPerformanceCard({
  metrics,
  selectedRangeLabel,
}: ResolutionPerformanceCardProps) {
  return (
    <div className="staff-section-card resolution-card" role="region" aria-label="Resolution Performance">
      <div className="section-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-gold">
            <Award size={18} />
          </div>
          <div>
            <h3 className="section-card-title">Resolution Performance</h3>
            <p className="section-card-subtitle">
              Efficiency and turnaround speed ({selectedRangeLabel.toLowerCase()})
            </p>
          </div>
        </div>
      </div>

      <div className="resolution-metrics-grid">
        {/* Metric Box 1: Resolution Rate */}
        <div className="resolution-metric-box">
          <div className="metric-box-top">
            <div className="box-icon-wrap rate-icon">
              <CheckCircle2 size={18} />
            </div>
            <span className="metric-box-name">Resolution Rate</span>
          </div>
          <div className="metric-box-value-row">
            <span className="metric-large-value">{metrics.resolutionRate}%</span>
          </div>
          <p className="metric-box-subtext">
            {metrics.totalResolvedInPeriod} of {metrics.totalComplaintsInPeriod} complaints resolved/closed
          </p>

          {/* Mini progress bar */}
          <div className="resolution-mini-bar-track">
            <div
              className="resolution-mini-bar-fill"
              style={{ width: `${Math.min(100, Math.max(0, metrics.resolutionRate))}%` }}
            />
          </div>
        </div>

        {/* Metric Box 2: Average Resolution Time */}
        <div className="resolution-metric-box">
          <div className="metric-box-top">
            <div className="box-icon-wrap time-icon">
              <Clock size={18} />
            </div>
            <span className="metric-box-name">Avg Resolution Time</span>
          </div>
          <div className="metric-box-value-row">
            <span className="metric-large-value time-val">
              {metrics.avgResolutionFormatted}
            </span>
          </div>
          <p className="metric-box-subtext">
            {metrics.avgResolutionHours !== null
              ? `Calculated from ${metrics.totalResolvedInPeriod} completed cases`
              : 'Requires at least one resolved complaint'}
          </p>

          <div className="resolution-mini-badge-note">
            <TrendingUp size={12} className="inline mr-1 text-emerald-600" />
            <span>Based on submission to resolution duration</span>
          </div>
        </div>
      </div>
    </div>
  );
}
