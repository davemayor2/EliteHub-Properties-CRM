import React from 'react';
import { ComplaintPriority } from '@/types/complaint';
import { ArrowDown, Minus, ArrowUp, AlertTriangle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: ComplaintPriority | string;
  className?: string;
  showIcon?: boolean;
}

export default function PriorityBadge({ priority, className = '', showIcon = true }: PriorityBadgeProps) {
  const normalized = (priority || 'normal').toLowerCase() as ComplaintPriority;

  const config: Record<
    ComplaintPriority,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    low: {
      label: 'Low',
      bg: '#f1f5f9',
      text: '#475569',
      border: '#cbd5e1',
      icon: <ArrowDown size={12} strokeWidth={2.5} />,
    },
    normal: {
      label: 'Normal',
      bg: '#e0f2fe',
      text: '#0369a1',
      border: '#bae6fd',
      icon: <Minus size={12} strokeWidth={2.5} />,
    },
    high: {
      label: 'High',
      bg: '#ffedd5',
      text: '#c2410c',
      border: '#fed7aa',
      icon: <ArrowUp size={12} strokeWidth={2.5} />,
    },
    urgent: {
      label: 'Urgent',
      bg: '#fef2f2',
      text: '#b91c1c',
      border: '#fecaca',
      icon: <AlertTriangle size={12} strokeWidth={2.5} />,
    },
  };

  const current = config[normalized] || config.normal;

  return (
    <span
      className={`priority-badge priority-badge-${normalized} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </span>
  );
}
