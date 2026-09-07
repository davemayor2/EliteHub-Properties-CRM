import React from 'react';
import { ComplaintStatus } from '@/types/complaint';
import { Sparkles, FolderOpen, Clock, CheckCircle2, CheckCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  className?: string;
  showIcon?: boolean;
}

export default function StatusBadge({ status, className = '', showIcon = true }: StatusBadgeProps) {
  const normalizedStatus = (status || 'new').toLowerCase() as ComplaintStatus;

  const config: Record<
    ComplaintStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    new: {
      label: 'New',
      bg: '#ecfdf5',
      text: '#145E3D',
      border: 'rgba(20, 94, 61, 0.25)',
      icon: <Sparkles size={12} strokeWidth={2.5} />,
    },
    open: {
      label: 'Open',
      bg: '#eff6ff',
      text: '#1d4ed8',
      border: '#bfdbfe',
      icon: <FolderOpen size={12} strokeWidth={2.2} />,
    },
    pending: {
      label: 'Pending',
      bg: '#fffbeb',
      text: '#b45309',
      border: '#fde68a',
      icon: <Clock size={12} strokeWidth={2.2} />,
    },
    resolved: {
      label: 'Resolved',
      bg: '#f0fdf4',
      text: '#15803d',
      border: '#bbf7d0',
      icon: <CheckCircle2 size={12} strokeWidth={2.5} />,
    },
    closed: {
      label: 'Closed',
      bg: '#f8fafc',
      text: '#475569',
      border: '#e2e8f0',
      icon: <CheckCheck size={12} strokeWidth={2.2} />,
    },
  };

  const current = config[normalizedStatus] || config.new;

  return (
    <span
      className={`status-badge status-badge-${normalizedStatus} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        borderRadius: '9999px',
        fontSize: '11.5px',
        fontWeight: 600,
        textTransform: 'capitalize',
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
