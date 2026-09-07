'use client';

import React from 'react';
import { User, ShieldCheck, Clock } from 'lucide-react';
import { ComplaintMessageRecord } from '@/types/complaint';

interface MessageItemProps {
  message: ComplaintMessageRecord;
  customerName: string;
}

export default function MessageItem({ message, customerName }: MessageItemProps) {
  const isStaff = message.sender_type === 'staff';

  const formattedTime = React.useMemo(() => {
    try {
      const d = new Date(message.created_at);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return message.created_at;
    }
  }, [message.created_at]);

  const senderDisplayName = isStaff
    ? message.sender_profile?.full_name || 'Support Staff'
    : customerName || 'Customer';

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`message-item-wrapper ${isStaff ? 'sender-staff' : 'sender-customer'}`}>
      {/* Sender Avatar */}
      <div className={`message-avatar ${isStaff ? 'avatar-staff' : 'avatar-customer'}`}>
        {isStaff ? (
          <span>{getInitials(senderDisplayName)}</span>
        ) : (
          <User size={16} />
        )}
      </div>

      {/* Message Content Bubble */}
      <div className="message-content-card">
        {/* Header Strip */}
        <div className="message-header-strip">
          <div className="sender-identity-group">
            <span className="sender-name">{senderDisplayName}</span>
            {isStaff && (
              <span className={`sender-role-pill ${message.sender_profile?.role || 'staff'}`}>
                <ShieldCheck size={11} />
                {message.sender_profile?.role === 'admin' ? 'Admin' : 'Staff'}
              </span>
            )}
            {!isStaff && (
              <span className="sender-role-pill customer">
                Customer
              </span>
            )}
          </div>

          <span className="message-timestamp">
            <Clock size={12} />
            {formattedTime}
          </span>
        </div>

        {/* Message Body */}
        <div className="message-body-text">
          {message.message.split('\n').map((paragraph, index) => {
            const trimmed = paragraph.trim();
            if (!trimmed) {
              return <div key={index} className="message-text-spacer" />;
            }
            return (
              <p key={index} className="message-paragraph">
                {trimmed}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
