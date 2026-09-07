'use client';

import React, { useState, useRef } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { CustomerMessageView, ComplaintStatus } from '@/types/complaint';

interface CustomerMessageComposerProps {
  token: string;
  onMessageSent: (message: CustomerMessageView, newStatus?: ComplaintStatus) => void;
}

export default function CustomerMessageComposer({
  token,
  onMessageSent,
}: CustomerMessageComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();

    if (!trimmed) {
      setErrorMsg('Please write a message before sending.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/track/${token}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to submit your message. Please try again.');
      }

      setContent('');
      onMessageSent(data.message, data.status);

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error('[Customer Message Send Error]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error sending message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="customer-composer-card">
      <h4 className="composer-heading">Send a Reply to Customer Care</h4>

      {errorMsg && (
        <div className="customer-composer-error">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="customer-composer-form">
        <textarea
          ref={textareaRef}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          placeholder="Write a message..."
          className="customer-composer-textarea"
        />

        <div className="customer-composer-actions">
          <span className="customer-composer-note">
            Our support team will review your message promptly.
          </span>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="btn-customer-send"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Send Message</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
