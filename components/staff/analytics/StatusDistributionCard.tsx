'use client';

import React from 'react';
import { PieChart, CheckCircle2 } from 'lucide-react';
import { DistributionItem } from '@/lib/analytics/types';

interface StatusDistributionCardProps {
  distribution: DistributionItem[];
  totalComplaints: number;
}

export default function StatusDistributionCard({
  distribution,
  totalComplaints,
}: StatusDistributionCardProps) {
  return (
    <div className="staff-section-card distribution-card" role="region" aria-label="Complaint Status Distribution">
      <div className="section-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-emerald">
            <PieChart size={18} />
          </div>
          <div>
            <h3 className="section-card-title">Status Distribution</h3>
            <p className="section-card-subtitle">
              Current breakdown of complaint lifecycle statuses
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
          {/* Visual Segmented Progress Bar */}
          <div
            className="segmented-distribution-bar"
            role="progressbar"
            aria-valuenow={100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Status distribution segmented bar"
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
            {distribution.map((item) => (
              <div key={item.key} className="distribution-row">
                <div className="dist-label-group">
                  <span
                    className="dist-color-indicator"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="dist-item-label">{item.label}</span>
                </div>

                <div className="dist-val-group">
                  <span className="dist-item-count">{item.count.toLocaleString()}</span>
                  <span className="dist-item-pct">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
