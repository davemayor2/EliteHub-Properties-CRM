import React from 'react';
import { Sparkles, FolderOpen, Clock, CheckCircle2 } from 'lucide-react';
import { ComplaintStats, ComplaintStatus } from '@/types/complaint';

interface StatsCardsProps {
  stats: ComplaintStats;
  isLoading?: boolean;
}

export default function StatsCardGrid({ stats, isLoading = false }: StatsCardsProps) {
  const cards: {
    status: ComplaintStatus;
    title: string;
    count: number;
    description: string;
    icon: React.ReactNode;
    colorScheme: {
      accent: string;
      bg: string;
      border: string;
      iconBg: string;
    };
  }[] = [
    {
      status: 'new',
      title: 'New Complaints',
      count: stats.new,
      description: 'Awaiting initial triage',
      icon: <Sparkles size={20} strokeWidth={2.2} />,
      colorScheme: {
        accent: '#145E3D',
        bg: '#ffffff',
        border: 'rgba(20, 94, 61, 0.2)',
        iconBg: '#ecfdf5',
      },
    },
    {
      status: 'open',
      title: 'Open Complaints',
      count: stats.open,
      description: 'Currently under active review',
      icon: <FolderOpen size={20} strokeWidth={2.2} />,
      colorScheme: {
        accent: '#2563eb',
        bg: '#ffffff',
        border: 'rgba(37, 99, 235, 0.2)',
        iconBg: '#eff6ff',
      },
    },
    {
      status: 'pending',
      title: 'Pending Complaints',
      count: stats.pending,
      description: 'Awaiting customer feedback',
      icon: <Clock size={20} strokeWidth={2.2} />,
      colorScheme: {
        accent: '#d97706',
        bg: '#ffffff',
        border: 'rgba(217, 119, 6, 0.2)',
        iconBg: '#fffbeb',
      },
    },
    {
      status: 'resolved',
      title: 'Resolved Complaints',
      count: stats.resolved,
      description: 'Successfully addressed',
      icon: <CheckCircle2 size={20} strokeWidth={2.2} />,
      colorScheme: {
        accent: '#16a34a',
        bg: '#ffffff',
        border: 'rgba(22, 163, 74, 0.2)',
        iconBg: '#f0fdf4',
      },
    },
  ];

  return (
    <div className="stats-cards-grid" role="region" aria-label="Complaint Statistics Overview">
      {cards.map((card) => (
        <div
          key={card.status}
          className="stat-card"
          style={{
            borderTop: `3px solid ${card.colorScheme.accent}`,
          }}
        >
          <div className="stat-card-header">
            <span className="stat-card-title">{card.title}</span>
            <div
              className="stat-card-icon-box"
              style={{
                backgroundColor: card.colorScheme.iconBg,
                color: card.colorScheme.accent,
              }}
            >
              {card.icon}
            </div>
          </div>

          <div className="stat-card-body">
            {isLoading ? (
              <div className="stat-skeleton-loader" aria-hidden="true" />
            ) : (
              <span
                className="stat-card-count"
                style={{ color: card.count > 0 ? card.colorScheme.accent : '#111827' }}
              >
                {card.count.toLocaleString()}
              </span>
            )}
            <span className="stat-card-desc">{card.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
