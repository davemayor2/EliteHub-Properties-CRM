'use client';

import React from 'react';
import { Clock, ShieldCheck, User } from 'lucide-react';
import { CustomerMessageView } from '@/types/complaint';

interface CustomerMessageItemProps {
  message: CustomerMessageView;
}

export default function CustomerMessageItem({ message }: CustomerMessageItemProps) {
  const isCustomer = message.sender_type === 'customer';

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
    <div className={`customer-message-row ${isCustomer ? 'align-customer' : 'align-care'}`}>
      <div className="message-avatar-circle">
        {isCustomer ? <User size={15} /> : <ShieldCheck size={16} />}
      </div>

      <div className="customer-bubble-card">
        <div className="bubble-header-meta">
          <span className="bubble-sender-name">
            {isCustomer ? 'You' : 'EliteHub Properties Customer Care'}
          </span>
          <span className="bubble-timestamp">
            <Clock size={11} />
            {formatTime(message.created_at)}
          </span>
        </div>

        <div className="bubble-text-content">
          {message.message.split('\n').map((para, i) => {
            const trimmed = para.trim();
            if (!trimmed) return <div key={i} className="bubble-gap" />;
            return (
              <p key={i} className="bubble-para">
                {trimmed}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
