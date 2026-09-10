'use client';

import React from 'react';
import Link from 'next/link';
import {
  Inbox,
  Sparkles,
  FolderOpen,
  Clock,
  CheckCircle2,
  Archive,
  UserX,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardOverviewMetrics } from '@/lib/analytics/types';

interface OverviewMetricGridProps {
  metrics: DashboardOverviewMetrics;
  selectedRangeLabel: string;
}

export default function OverviewMetricGrid({
  metrics,
  selectedRangeLabel,
}: OverviewMetricGridProps) {
  const row1Cards = [
    {
      title: 'Total Complaints',
      count: metrics.total,
      subtitle: `${metrics.periodTotal} received in ${selectedRangeLabel.toLowerCase()}`,
      icon: <Inbox size={18} strokeWidth={2} />,
      accent: '#145E3D',
      iconBg: '#f0fdf4',
      href: '/staff/complaints',
    },
    {
      title: 'New Complaints',
      count: metrics.new,
      subtitle: 'Awaiting initial triage',
      icon: <Sparkles size={18} strokeWidth={2} />,
      accent: '#0284c7',
      iconBg: '#f0f9ff',
      href: '/staff/complaints?status=new',
    },
    {
      title: 'Open Complaints',
      count: metrics.open,
      subtitle: 'Under active investigation',
      icon: <FolderOpen size={18} strokeWidth={2} />,
      accent: '#2563eb',
      iconBg: '#eff6ff',
      href: '/staff/complaints?status=open',
    },
    {
      title: 'Pending Complaints',
      count: metrics.pending,
      subtitle: 'Awaiting customer feedback',
      icon: <Clock size={18} strokeWidth={2} />,
      accent: '#d97706',
      iconBg: '#fffbeb',
      href: '/staff/complaints?status=pending',
    },
  ];

  const row2Cards = [
    {
      title: 'Resolved Complaints',
      count: metrics.resolved,
      subtitle: 'Successfully addressed',
      icon: <CheckCircle2 size={18} strokeWidth={2} />,
      accent: '#16a34a',
      iconBg: '#f0fdf4',
      href: '/staff/complaints?status=resolved',
    },
    {
      title: 'Closed Complaints',
      count: metrics.closed,
      subtitle: 'Finalized & archived',
      icon: <Archive size={18} strokeWidth={2} />,
      accent: '#64748b',
      iconBg: '#f8fafc',
      href: '/staff/complaints?status=closed',
    },
    {
      title: 'Unassigned Complaints',
      count: metrics.unassigned,
      subtitle: 'Requires staff allocation',
      icon: <UserX size={18} strokeWidth={2} />,
      accent: metrics.unassigned > 0 ? '#ea580c' : '#64748b',
      iconBg: metrics.unassigned > 0 ? '#fff7ed' : '#f8fafc',
      href: '/staff/complaints?assigned=unassigned',
      badge: metrics.unassigned > 0 ? 'Action Needed' : undefined,
    },
    {
      title: 'Resolution Rate',
      count: `${metrics.resolutionRate}%`,
      subtitle: 'Overall resolution efficiency',
      icon: <TrendingUp size={18} strokeWidth={2} />,
      accent: '#145E3D',
      iconBg: '#f0fdf4',
      href: null,
    },
  ];

  return (
    <div className="overview-metrics-section" role="region" aria-label="Key Performance Indicators">
      {/* Row 1 */}
      <div className="stats-cards-grid row-grid-4">
        {row1Cards.map((card) => {
          const CardContent = (
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">{card.title}</span>
                <div
                  className="stat-card-icon-box"
                  style={{ backgroundColor: card.iconBg, color: card.accent }}
                >
                  {card.icon}
                </div>
              </div>
              <div className="stat-card-body">
                <div className="stat-count-row">
                  <span className="stat-card-count" style={{ color: '#0f172a' }}>
                    {typeof card.count === 'number' ? card.count.toLocaleString() : card.count}
                  </span>
                  {card.href && (
                    <ArrowUpRight size={14} className="stat-card-arrow text-muted opacity-0" />
                  )}
                </div>
                <span className="stat-card-desc">{card.subtitle}</span>
              </div>
            </div>
          );

          return card.href ? (
            <Link key={card.title} href={card.href} className="stat-card-link-wrapper">
              {CardContent}
            </Link>
          ) : (
            <div key={card.title}>{CardContent}</div>
          );
        })}
      </div>

      {/* Row 2 */}
      <div className="stats-cards-grid row-grid-4" style={{ marginTop: '16px' }}>
        {row2Cards.map((card) => {
          const CardContent = (
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="flex items-center gap-2">
                  <span className="stat-card-title">{card.title}</span>
                  {card.badge && (
                    <span className="stat-alert-badge">{card.badge}</span>
                  )}
                </div>
                <div
                  className="stat-card-icon-box"
                  style={{ backgroundColor: card.iconBg, color: card.accent }}
                >
                  {card.icon}
                </div>
              </div>
              <div className="stat-card-body">
                <div className="stat-count-row">
                  <span
                    className="stat-card-count"
                    style={{ color: card.title === 'Unassigned Complaints' && metrics.unassigned > 0 ? '#ea580c' : '#0f172a' }}
                  >
                    {typeof card.count === 'number' ? card.count.toLocaleString() : card.count}
                  </span>
                  {card.href && (
                    <ArrowUpRight size={14} className="stat-card-arrow text-muted opacity-0" />
                  )}
                </div>
                <span className="stat-card-desc">{card.subtitle}</span>
              </div>
            </div>
          );

          return card.href ? (
            <Link key={card.title} href={card.href} className="stat-card-link-wrapper">
              {CardContent}
            </Link>
          ) : (
            <div key={card.title}>{CardContent}</div>
          );
        })}
      </div>
    </div>
  );
}
