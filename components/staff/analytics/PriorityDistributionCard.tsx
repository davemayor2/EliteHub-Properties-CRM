'use client';

import React from 'react';
import { AlertOctagon, Flame } from 'lucide-react';
import { DistributionItem } from '@/lib/analytics/types';

interface PriorityDistributionCardProps {
  distribution: DistributionItem[];
  totalComplaints: number;
}

export default function PriorityDistributionCard({
  distribution,
  totalComplaints,
}: PriorityDistributionCardProps) {
  const urgentItem = distribution.find((d) => d.key === 'urgent');
  const hasUrgent = urgentItem && urgentItem.count > 0;

  return (
    <div className="staff-section-card distribution-card" role="region" aria-label="Complaint Priority Distribution">
      <div className="section-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-amber">
            <AlertOctagon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="section-card-title">Priority Breakdown</h3>
              {hasUrgent && (
                <span className="urgent-badge-pill">
                  <Flame size={12} className="inline mr-1" />
                  {urgentItem.count} Urgent
                </span>
              )}
            </div>
            <p className="section-card-subtitle">
              Triage urgency classification across active complaints
            </p>
          </div>
        </div>

        <div className="status-total-pill">
          <span className="pill-count-text">{totalComplaints} Total</span>
        </div>
      </div>

      {totalComplaints === 0 ? (
        <div className="distribution-empty-state">
          <p className="text-muted text-sm">No complaints recorded yet.</p>
        </div>
      ) : (
        <div className="distribution-content">
          {/* Segmented Progress Bar */}
          <div
            className="segmented-distribution-bar"
            role="progressbar"
            aria-valuenow={100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Priority distribution segmented bar"
          >
            {distribution.map((item) => {
              if (item.count === 0) return null;
              return (
                <div
                  key={item.key}
                  className="bar-segment"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.label}: ${item.count} (${item.percentage}%)`}
                />
              );
            })}
          </div>

          {/* Detailed Breakdown List */}
          <div className="distribution-list">
            {distribution.map((item) => {
              const isUrgent = item.key === 'urgent' && item.count > 0;
              const isHigh = item.key === 'high' && item.count > 0;

              return (
                <div
                  key={item.key}
                  className={`distribution-row ${isUrgent ? 'row-urgent-highlight' : isHigh ? 'row-high-highlight' : ''}`}
                >
                  <div className="dist-label-group">
                    <span
                      className="dist-color-indicator"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={`dist-item-label ${isUrgent ? 'font-semibold text-red-700' : ''}`}>
                      {item.label}
                    </span>
                    {isUrgent && (
                      <span className="dist-inline-flag">Needs Immediate Attention</span>
                    )}
                  </div>

                  <div className="dist-val-group">
                    <span className="dist-item-count">{item.count.toLocaleString()}</span>
                    <span className="dist-item-pct">({item.percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
