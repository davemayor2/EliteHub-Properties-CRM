'use client';

import React from 'react';
import { Info, Clock } from 'lucide-react';
import { ComplaintMessageRecord } from '@/types/complaint';

interface SystemMessageProps {
  message: ComplaintMessageRecord;
}

export default function SystemMessage({ message }: SystemMessageProps) {
  const formattedTime = React.useMemo(() => {
    try {
      const d = new Date(message.created_at);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return message.created_at;
    }
  }, [message.created_at]);

  return (
    <div className="system-message-row">
      <div className="system-message-divider" />
      <div className="system-message-bubble">
        <Info size={13} className="system-message-icon" />
        <span className="system-message-text">{message.message}</span>
        <span className="system-message-time">
          <Clock size={11} />
          {formattedTime}
        </span>
      </div>
      <div className="system-message-divider" />
    </div>
  );
}
