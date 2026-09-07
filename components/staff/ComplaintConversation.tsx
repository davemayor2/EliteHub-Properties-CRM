'use client';

import React, { useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { ComplaintMessageRecord, ComplaintStatus } from '@/types/complaint';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';

interface ComplaintConversationProps {
  complaintId: string;
  customerName: string;
  initialMessages: ComplaintMessageRecord[];
  onStatusTransition?: (newStatus: ComplaintStatus) => void;
}

export default function ComplaintConversation({
  complaintId,
  customerName,
  initialMessages,
  onStatusTransition,
}: ComplaintConversationProps) {
  const [messages, setMessages] = useState<ComplaintMessageRecord[]>(initialMessages);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleMessageSent = (
    newMessage: ComplaintMessageRecord,
    newComplaintStatus?: string
  ) => {
    setMessages((prev) => [...prev, newMessage]);

    if (newComplaintStatus && onStatusTransition) {
      onStatusTransition(newComplaintStatus as ComplaintStatus);
    }
  };

  const handleRefreshFeed = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/staff/complaints/${complaintId}/messages`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('[Refresh Conversation Error]:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const conversationalCount = messages.filter((m) => m.sender_type !== 'system').length;

  return (
    <div className="staff-section-card complaint-conversation-card">
      {/* Header */}
      <div className="section-card-header conversation-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="section-card-title">Case Conversation</h3>
              <span className="conversation-count-badge">
                {conversationalCount} {conversationalCount === 1 ? 'message' : 'messages'}
              </span>
            </div>
            <p className="section-card-subtitle">
              Direct staff responses and customer interaction timeline
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshFeed}
          disabled={isRefreshing}
          className="btn-refresh-conversation"
          title="Refresh conversation messages"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div className="conversation-body">
        <MessageList
          messages={messages}
          customerName={customerName}
        />
      </div>

      {/* Staff Response Composer */}
      <div className="conversation-composer-wrapper">
        <MessageComposer
          complaintId={complaintId}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}
