'use client';

import React, { useState } from 'react';
import { History, RefreshCw, Layers } from 'lucide-react';
import { ComplaintActivityRecord } from '@/types/activity';
import ActivityItem from './ActivityItem';

interface ActivityTimelineProps {
  complaintId: string;
  initialActivity: ComplaintActivityRecord[];
}

export default function ActivityTimeline({
  complaintId,
  initialActivity,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ComplaintActivityRecord[]>(initialActivity);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/staff/complaints/${complaintId}/activity`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.activity)) {
        setActivities(data.activity);
      }
    } catch (err) {
      console.error('[Refresh Activity Error]:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="staff-section-card activity-timeline-card">
      {/* Section Header */}
      <div className="section-card-header activity-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-slate">
            <History size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="section-card-title">Activity Timeline</h3>
              <span className="activity-count-badge">
                {activities.length} {activities.length === 1 ? 'event' : 'events'}
              </span>
            </div>
            <p className="section-card-subtitle">
              Audit log of status changes, assignments, messages, and notes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-refresh-conversation"
          title="Refresh activity timeline"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Timeline Stream */}
      <div className="activity-timeline-body">
        {activities.length === 0 ? (
          <div className="empty-activity-placeholder">
            <Layers size={26} className="text-muted opacity-40 mb-2" />
            <p className="empty-activity-title">No activity recorded yet</p>
            <p className="empty-activity-desc">
              All workflow actions, assignments, and notes will be tracked here.
            </p>
          </div>
        ) : (
          <div className="timeline-spine-wrapper">
            <div className="timeline-spine-line" />
            <div className="timeline-items-list">
              {activities.map((act) => (
                <ActivityItem key={act.id} activity={act} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
