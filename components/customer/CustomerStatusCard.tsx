import React from 'react';
import { ComplaintStatus } from '@/types/complaint';
import { Clock, CheckCircle2, AlertCircle, Sparkles, Archive } from 'lucide-react';

interface CustomerStatusCardProps {
  status: ComplaintStatus;
}

const STATUS_DETAILS: Record<
  ComplaintStatus,
  {
    title: string;
    explanation: string;
    icon: React.ElementType;
    badgeClass: string;
  }
> = {
  new: {
    title: 'New',
    explanation: 'Your complaint has been received and is awaiting review.',
    icon: Clock,
    badgeClass: 'status-customer-new',
  },
  open: {
    title: 'Open',
    explanation: 'Our customer care team is currently reviewing your complaint.',
    icon: Sparkles,
    badgeClass: 'status-customer-open',
  },
  pending: {
    title: 'Pending',
    explanation: 'We are currently awaiting additional information or action before proceeding.',
    icon: AlertCircle,
    badgeClass: 'status-customer-pending',
  },
  resolved: {
    title: 'Resolved',
    explanation: 'We believe your complaint has been resolved.',
    icon: CheckCircle2,
    badgeClass: 'status-customer-resolved',
  },
  closed: {
    title: 'Closed',
    explanation: 'This complaint has been closed.',
    icon: Archive,
    badgeClass: 'status-customer-closed',
  },
};

export default function CustomerStatusCard({ status }: CustomerStatusCardProps) {
  const cfg = STATUS_DETAILS[status] || STATUS_DETAILS.new;
  const Icon = cfg.icon;

  return (
    <div className={`customer-status-card ${cfg.badgeClass}`}>
      <div className="status-card-top-row">
        <div className="status-icon-wrapper">
          <Icon size={20} />
        </div>
        <div className="status-title-group">
          <span className="status-prefix-label">Current Status</span>
          <span className="status-main-badge">{cfg.title}</span>
        </div>
      </div>
      <p className="status-explanation-text">{cfg.explanation}</p>
    </div>
  );
}
