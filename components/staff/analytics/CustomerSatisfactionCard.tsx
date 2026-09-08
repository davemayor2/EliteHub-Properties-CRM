'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Smile, ThumbsUp, MessageSquare, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { FeedbackAnalyticsMetrics } from '@/types/feedback';

interface CustomerSatisfactionCardProps {
  metrics: FeedbackAnalyticsMetrics;
  selectedRangeLabel: string;
}

export default function CustomerSatisfactionCard({
  metrics,
  selectedRangeLabel,
}: CustomerSatisfactionCardProps) {
  const isGoodSatisfaction = metrics.satisfactionRate >= 80;
  const isMedSatisfaction = metrics.satisfactionRate >= 60 && metrics.satisfactionRate < 80;

  const scoreColor = isGoodSatisfaction
    ? 'text-emerald-600'
    : isMedSatisfaction
    ? 'text-amber-600'
    : 'text-rose-600';

  return (
    <div
      className="staff-section-card customer-satisfaction-card"
      role="region"
      aria-label="Customer Satisfaction & Service Quality"
    >
      <div className="section-card-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="header-icon-pill icon-pill-gold">
              <Star size={18} />
            </div>
            <div>
              <h3 className="section-card-title">Customer Satisfaction (CSAT)</h3>
              <p className="section-card-subtitle">
                Customer resolution ratings & service quality ({selectedRangeLabel.toLowerCase()})
              </p>
            </div>
          </div>

          <Link
            href="/staff/analytics/feedback"
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
          >
            <span>Full Feedback Report</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="resolution-metrics-grid">
        {/* Metric Box 1: Average CSAT Score */}
        <div className="resolution-metric-box">
          <div className="metric-box-top">
            <div className="box-icon-wrap rate-icon">
              <Smile size={18} />
            </div>
            <span className="metric-box-name">Average Satisfaction</span>
          </div>
          <div className="metric-box-value-row">
            <span className={`metric-large-value ${scoreColor}`}>
              {metrics.avgRatingFormatted}
            </span>
          </div>
          <p className="metric-box-subtext">
            {metrics.totalSubmitted > 0
              ? `Calculated from ${metrics.totalSubmitted} verified customer response${metrics.totalSubmitted === 1 ? '' : 's'}`
              : 'Awaiting customer resolution responses'}
          </p>

          <div className="resolution-mini-bar-track">
            <div
              className={`resolution-mini-bar-fill ${isGoodSatisfaction ? 'bg-emerald-500' : isMedSatisfaction ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, Math.max(0, ((metrics.avgRating || 0) / 5) * 100))}%` }}
            />
          </div>
        </div>

        {/* Metric Box 2: Satisfaction & Engagement Rates */}
        <div className="resolution-metric-box">
          <div className="metric-box-top">
            <div className="box-icon-wrap time-icon">
              <ThumbsUp size={18} />
            </div>
            <span className="metric-box-name">Satisfaction Rate</span>
          </div>
          <div className="metric-box-value-row">
            <span className="metric-large-value text-emerald-700">
              {metrics.satisfactionRateFormatted}
            </span>
          </div>
          <p className="metric-box-subtext">
            {metrics.satisfactionRate}% rated 4 or 5 stars ({metrics.responseRateFormatted} response rate)
          </p>

          <div className="resolution-mini-badge-note">
            <span className="font-medium text-slate-600">
              {metrics.totalRequested} surveys dispatched upon complaint resolution
            </span>
          </div>
        </div>
      </div>

      {/* Mini Rating Distribution Track */}
      {metrics.totalSubmitted > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
            <span>Rating Breakdown</span>
            <span className="text-slate-500 font-normal">5★ to 1★ Distribution</span>
          </div>
          <div className="space-y-1.5">
            {metrics.ratingDistribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-2 text-xs">
                <span className="w-8 font-bold text-slate-700 shrink-0">{item.stars}★</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.stars >= 4
                        ? 'bg-emerald-500'
                        : item.stars === 3
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium text-slate-600 shrink-0">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Satisfaction Banner if any */}
      {metrics.lowSatisfactionCount > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
            <span>{metrics.lowSatisfactionCount} Low Satisfaction Case{metrics.lowSatisfactionCount === 1 ? '' : 's'} (1★ or 2★)</span>
          </div>
          <Link
            href="/staff/analytics/feedback#low-satisfaction"
            className="text-xs font-bold text-rose-900 underline hover:no-underline"
          >
            Review Cases
          </Link>
        </div>
      )}
    </div>
  );
}
