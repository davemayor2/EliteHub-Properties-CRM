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
  Star,
  ThumbsDown,
  Flame,
  Paperclip,
  Lock,
  Trash2,
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

      case 'sla_warning': {
        const target = activity.metadata?.target_type === 'first_response' ? 'First Response' : 'Resolution';
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-amber-700 font-semibold">SLA Deadline Approaching</span>
            <span className="text-xs text-amber-800">
              {target} SLA is approaching its deadline
            </span>
          </div>
        );
      }

      case 'first_response_sla_breached':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-rose-700 font-semibold">First Response SLA Breached</span>
            <span className="text-xs text-slate-500">
              Initial customer reply deadline was exceeded
            </span>
          </div>
        );

      case 'resolution_sla_breached':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-rose-700 font-semibold">Resolution SLA Breached</span>
            <span className="text-xs text-slate-500">
              Target resolution deadline was exceeded
            </span>
          </div>
        );

      case 'complaint_auto_escalated':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-red-700 font-bold">Auto-Escalated to Management</span>
            <span className="text-xs text-red-700">
              Breached SLA triggered automatic administrative escalation
            </span>
          </div>
        );

      case 'manual_escalation': {
        const reason = activity.metadata?.reason ? String(activity.metadata.reason) : 'Manual escalation requested';
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-red-700 font-bold">Manually Escalated</span>
            <span className="text-xs text-slate-600 bg-red-50 p-1.5 rounded border border-red-100 mt-1 block">
              &ldquo;{reason}&rdquo;
            </span>
          </div>
        );
      }

      case 'escalation_notification_sent': {
        const count = activity.metadata?.admin_count !== undefined ? String(activity.metadata.admin_count) : '1';
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-indigo-700 font-medium">Escalation Alert Dispatched</span>
            <span className="text-xs text-slate-500">
              Notification emails sent to {count} active CRM administrator{count === '1' ? '' : 's'}
            </span>
          </div>
        );
      }

      case 'feedback_requested':
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-amber-700 font-medium">Satisfaction Survey Sent</span>
            <span className="text-xs text-slate-500">
              Invitation dispatched to customer upon complaint resolution
            </span>
          </div>
        );

      case 'feedback_submitted': {
        const rating = activity.metadata?.rating !== undefined ? String(activity.metadata.rating) : '?';
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-emerald-700 font-semibold">
              Customer Feedback Received ({rating} / 5 Stars)
            </span>
            <span className="text-xs text-slate-500">
              Customer rated their service resolution experience
            </span>
          </div>
        );
      }

      case 'low_satisfaction_received': {
        const rating = activity.metadata?.rating !== undefined ? String(activity.metadata.rating) : 'Low';
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-rose-700 font-bold">
              Low Satisfaction Alert ({rating} / 5)
            </span>
            <span className="text-xs text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-100 mt-1 block">
              Customer reported poor resolution experience. Administrative review recommended.
            </span>
          </div>
        );
      }

      case 'attachment_uploaded': {
        const fileName = String(activity.metadata?.file_name || 'Supporting file');
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-blue-700 font-medium">
              Supporting Attachment Uploaded
            </span>
            <span className="text-xs text-slate-500 block truncate" title={fileName}>
              File: {fileName}
            </span>
          </div>
        );
      }

      case 'internal_attachment_uploaded': {
        const fileName = String(activity.metadata?.file_name || 'Internal file');
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-amber-700 font-medium flex items-center gap-1">
              <Lock size={12} />
              <span>Internal Evidence Document Added</span>
            </span>
            <span className="text-xs text-amber-800/80 block truncate" title={fileName}>
              Confidential: {fileName}
            </span>
          </div>
        );
      }

      case 'attachment_deleted': {
        const fileName = String(activity.metadata?.file_name || 'Attachment');
        return (
          <div className="activity-event-detail">
            <span className="activity-headline text-slate-700 font-medium">
              Attachment Removed
            </span>
            <span className="text-xs text-slate-500 block truncate" title={fileName}>
              Removed file: {fileName}
            </span>
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
      case 'sla_warning':
        return { icon: <Clock size={14} />, className: 'icon-sla-warn' };
      case 'first_response_sla_breached':
      case 'resolution_sla_breached':
        return { icon: <AlertTriangle size={14} />, className: 'icon-sla-breach' };
      case 'complaint_auto_escalated':
      case 'manual_escalation':
        return { icon: <Flame size={14} />, className: 'icon-escalated' };
      case 'escalation_notification_sent':
        return { icon: <Shield size={14} />, className: 'icon-escalation-alert' };
      case 'feedback_requested':
        return { icon: <Send size={14} />, className: 'icon-feedback-req' };
      case 'feedback_submitted':
        return { icon: <Star size={14} />, className: 'icon-feedback-sub' };
      case 'low_satisfaction_received':
        return { icon: <ThumbsDown size={14} />, className: 'icon-feedback-low' };
      case 'attachment_uploaded':
        return { icon: <Paperclip size={14} />, className: 'icon-attachment' };
      case 'internal_attachment_uploaded':
        return { icon: <Lock size={14} />, className: 'icon-internal-att' };
      case 'attachment_deleted':
        return { icon: <Trash2 size={14} />, className: 'icon-delete-att' };
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
