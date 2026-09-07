'use client';

import React from 'react';
import { MessageSquareOff } from 'lucide-react';
import { ComplaintMessageRecord } from '@/types/complaint';
import MessageItem from './MessageItem';
import SystemMessage from './SystemMessage';

interface MessageListProps {
  messages: ComplaintMessageRecord[];
  customerName: string;
}

export default function MessageList({ messages, customerName }: MessageListProps) {
  // Count conversational messages (excluding system events)
  const conversationalMessages = messages.filter((m) => m.sender_type !== 'system');

  return (
    <div className="messages-stream-container">
      {messages.length === 0 && (
        <div className="messages-empty-state">
          <div className="empty-message-circle">
            <MessageSquareOff size={24} />
          </div>
          <h4 className="empty-message-title">No messages yet</h4>
          <p className="empty-message-subtitle">Responses and customer communication will appear here.</p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="messages-chronological-feed">
          {messages.map((msg) => {
            if (msg.sender_type === 'system') {
              return <SystemMessage key={msg.id} message={msg} />;
            }

            return (
              <MessageItem
                key={msg.id}
                message={msg}
                customerName={customerName}
              />
            );
          })}

          {conversationalMessages.length === 0 && (
            <div className="messages-empty-state mini-empty-state">
              <p className="empty-message-title">No staff or customer replies yet</p>
              <p className="empty-message-subtitle">
                Use the response composer below to communicate with the customer.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
