'use client';

import React from 'react';
import { MessageSquare, Info } from 'lucide-react';
import { CustomerMessageView } from '@/types/complaint';
import CustomerMessageItem from './CustomerMessageItem';

interface CustomerConversationProps {
  messages: CustomerMessageView[];
}

export default function CustomerConversation({ messages }: CustomerConversationProps) {
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="customer-section-card conversation-section-card">
      <div className="customer-card-header">
        <MessageSquare size={18} className="header-icon" />
        <h3 className="customer-card-title">Conversation</h3>
      </div>

      <div className="customer-conversation-stream">
        {messages.map((msg) => {
          if (msg.sender_type === 'system') {
            return (
              <div key={msg.id} className="customer-system-event-row">
                <div className="system-pill">
                  <Info size={13} className="text-info" />
                  <span className="system-event-text">{msg.message}</span>
                  <span className="system-event-date">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            );
          }

          return <CustomerMessageItem key={msg.id} message={msg} />;
        })}
      </div>
    </div>
  );
}
