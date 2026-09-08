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
  Tag,
  Building2,
  Sparkles,
  AlertCircle,
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

      case 'category_changed': {
        const prev = String(activity.metadata?.old_category_name || 'None');
        const next = String(activity.metadata?.new_category_name || 'None');
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Category changed</span>
            <div className="activity-transition-pill">
              <span className="category-pill">{prev}</span>
              <ArrowRight size={11} className="transition-arrow" />
              <span className="category-pill">{next}</span>
            </div>
          </div>
        );
      }

      case 'department_changed': {
        const prev = String(activity.metadata?.old_department_name || 'None');
        const next = String(activity.metadata?.new_department_name || 'None');
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Department changed</span>
            <div className="activity-transition-pill">
              <span className="department-pill">{prev}</span>
              <ArrowRight size={11} className="transition-arrow" />
              <span className="department-pill">{next}</span>
            </div>
          </div>
        );
      }

      case 'auto_assigned': {
        const assignee = String(activity.metadata?.assigned_to_name || activity.metadata?.staff_name || 'Staff Member');
        const dept = activity.metadata?.department_name ? ` (${activity.metadata.department_name})` : '';
        return (
          <div className="activity-event-detail">
            <span className="activity-headline">Auto-assigned to</span>
            <span className="activity-highlight-name">{assignee}{dept}</span>
          </div>
        );
      }

      case 'routing_failed': {
        const reason = String(activity.metadata?.reason || 'No available staff in assigned department');
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-warning">Routing Notice</span>
            <span className="text-xs text-muted">{reason}</span>
          </div>
        );
      }

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
      case 'category_changed':
        return { icon: <Tag size={14} />, className: 'icon-category' };
      case 'department_changed':
        return { icon: <Building2 size={14} />, className: 'icon-department' };
      case 'auto_assigned':
        return { icon: <Sparkles size={14} />, className: 'icon-auto-assign' };
      case 'routing_failed':
        return { icon: <AlertCircle size={14} />, className: 'icon-routing-warn' };
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
