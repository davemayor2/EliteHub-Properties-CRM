import React from 'react';
import { ComplaintActivityRecord } from '@/types/activity';
import {
  Inbox,
  ArrowRight,
  RefreshCcw,
  AlertTriangle,
  UserCheck,
  UserX,
  Send,
  MessageCircle,
  StickyNote,
  Clock,
  User,
  Shield,
  Bot,
} from 'lucide-react';

interface ActivityItemProps {
  activity: ComplaintActivityRecord;
}

export default function ActivityItem({ activity }: ActivityItemProps) {
  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getActorLabel = () => {
    if (activity.actor_type === 'customer') {
      return 'by Customer';
    }
    if (activity.actor_type === 'system') {
      return 'by System';
    }
    if (activity.actor_profile?.full_name) {
      return `by ${activity.actor_profile.full_name}`;
    }
    return 'by Staff';
  };

  const renderContent = () => {
    switch (activity.activity_type) {
      case 'complaint_created':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Complaint submitted</span>
            {activity.metadata?.reference_number && (
              <span className="activity-ref-tag">
                {String(activity.metadata.reference_number)}
              </span>
            )}
          </div>
        );

      case 'status_changed': {
        const prev = String(activity.metadata?.previous_status || 'unknown').toUpperCase();
        const next = String(activity.metadata?.new_status || 'unknown').toUpperCase();
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Status changed</span>
            <div className="activity-transition-pill">
              <span className={`status-pill status-${prev.toLowerCase()}`}>{prev}</span>
              <ArrowRight size={11} className="transition-arrow" />
              <span className={`status-pill status-${next.toLowerCase()}`}>{next}</span>
            </div>
          </div>
        );
      }

      case 'priority_changed': {
        const prev = String(activity.metadata?.previous_priority || 'normal').toUpperCase();
        const next = String(activity.metadata?.new_priority || 'normal').toUpperCase();
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Priority changed</span>
            <div className="activity-transition-pill">
              <span className={`priority-pill priority-${prev.toLowerCase()}`}>{prev}</span>
              <ArrowRight size={11} className="transition-arrow" />
              <span className={`priority-pill priority-${next.toLowerCase()}`}>{next}</span>
            </div>
          </div>
        );
      }

      case 'assigned': {
        const assigneeName =
          (activity.metadata?.new_assignee_name as string) || 'Staff Member';
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Assigned to</span>
            <span className="activity-highlight-name">{assigneeName}</span>
          </div>
        );
      }

      case 'unassigned':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Complaint unassigned</span>
          </div>
        );

      case 'staff_message_sent':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Staff response sent to customer</span>
          </div>
        );

      case 'customer_message_sent':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Customer sent a new message</span>
          </div>
        );

      case 'internal_note_added':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Internal note added</span>
          </div>
        );

      default:
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">
              {activity.activity_type.replace(/_/g, ' ')}
            </span>
          </div>
        );
    }
  };

  const getIconAndClass = () => {
    switch (activity.activity_type) {
      case 'complaint_created':
        return { icon: <Inbox size={14} />, className: 'icon-created' };
      case 'status_changed':
        return { icon: <RefreshCcw size={14} />, className: 'icon-status' };
      case 'priority_changed':
        return { icon: <AlertTriangle size={14} />, className: 'icon-priority' };
      case 'assigned':
        return { icon: <UserCheck size={14} />, className: 'icon-assign' };
      case 'unassigned':
        return { icon: <UserX size={14} />, className: 'icon-unassign' };
      case 'staff_message_sent':
        return { icon: <Send size={14} />, className: 'icon-staff-msg' };
      case 'customer_message_sent':
        return { icon: <MessageCircle size={14} />, className: 'icon-customer-msg' };
      case 'internal_note_added':
        return { icon: <StickyNote size={14} />, className: 'icon-note' };
      default:
        return { icon: <Clock size={14} />, className: 'icon-default' };
    }
  };

  const { icon, className } = getIconAndClass();

  return (
    <div className="timeline-item">
      {/* Visual node on timeline spine */}
      <div className={`timeline-node ${className}`}>
        {icon}
      </div>

      <div className="timeline-item-content">
        <div className="timeline-item-body">
          {renderContent()}
        </div>

        <div className="timeline-item-meta">
          <span className="timeline-actor-label">{getActorLabel()}</span>
          <span className="timeline-dot">•</span>
          <span className="timeline-time">{formatTimestamp(activity.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
