'use client';

import React from 'react';
import Link from 'next/link';
import {
  History,
  Inbox,
  ArrowRight,
  RefreshCcw,
  AlertTriangle,
  UserCheck,
  UserX,
  Send,
  MessageCircle,
  StickyNote,
} from 'lucide-react';
import { RecentActivityDisplayItem } from '@/lib/analytics/types';

interface RecentActivityWidgetProps {
  activities: RecentActivityDisplayItem[];
}

export default function RecentActivityWidget({ activities }: RecentActivityWidgetProps) {
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'complaint_created':
        return <Inbox size={15} className="text-emerald-700" />;
      case 'status_changed':
        return <RefreshCcw size={15} className="text-blue-700" />;
      case 'priority_changed':
        return <AlertTriangle size={15} className="text-amber-700" />;
      case 'assigned':
        return <UserCheck size={15} className="text-purple-700" />;
      case 'unassigned':
        return <UserX size={15} className="text-gray-700" />;
      case 'staff_message_sent':
        return <Send size={15} className="text-indigo-700" />;
      case 'customer_message_sent':
        return <MessageCircle size={15} className="text-teal-700" />;
      case 'internal_note_added':
        return <StickyNote size={15} className="text-yellow-800" />;
      default:
        return <History size={15} className="text-gray-700" />;
    }
  };

  return (
    <div className="staff-section-card recent-activity-card" role="region" aria-label="Recent Operational Activity">
      <div className="section-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-slate">
            <History size={18} />
          </div>
          <div>
            <h3 className="section-card-title">Recent Operational Activity</h3>
            <p className="section-card-subtitle">
              Audit timeline of status updates, notes, and communications
            </p>
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="activity-empty-state">
          <History size={26} className="text-muted opacity-40 mb-2" />
          <p className="empty-activity-title">No recent activity recorded.</p>
          <p className="empty-activity-desc">
            Operational events, replies, and note updates will appear here.
          </p>
        </div>
      ) : (
        <div className="activity-feed-list">
          {activities.map((act) => (
            <Link
              key={act.id}
              href={`/staff/complaints/${act.complaintId}`}
              className="activity-feed-item-link"
            >
              <div className="activity-item-icon-box">
                {getActivityIcon(act.activityType)}
              </div>

              <div className="activity-item-main">
                <div className="activity-item-title-row">
                  <span className="activity-desc-text">{act.description}</span>
                  <span className="activity-time-stamp">{formatTimestamp(act.createdAt)}</span>
                </div>

                <div className="activity-item-meta-row">
                  <span className="activity-ref-code">{act.referenceNumber}</span>
                  <span className="activity-subject-text truncate max-w-[220px]">
                    {act.subject}
                  </span>
                  <span className="activity-actor-tag">{act.actorName}</span>
                </div>
              </div>

              <ArrowRight size={13} className="activity-link-arrow opacity-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
