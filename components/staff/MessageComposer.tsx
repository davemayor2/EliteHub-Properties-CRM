'use client';

import React, { useState, useRef } from 'react';
import { Send, Loader2, AlertCircle, CornerDownLeft } from 'lucide-react';
import { ComplaintMessageRecord } from '@/types/complaint';

interface MessageComposerProps {
  complaintId: string;
  onMessageSent: (newMessage: ComplaintMessageRecord, newComplaintStatus?: string) => void;
}

export default function MessageComposer({
  complaintId,
  onMessageSent,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();

    if (!trimmed) {
      setErrorMsg('Please enter a response before sending.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/staff/complaints/${complaintId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send response. Please try again.');
      }

      setContent('');
      onMessageSent(data.message, data.complaintStatus);

      // Refocus textarea after sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error('[Send Message Error]:', err);
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
    <div className="message-composer-card">
      {errorMsg && (
        <div className="composer-error-banner">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="composer-form">
        <div className="composer-textarea-wrapper">
          <textarea
            ref={textareaRef}
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder="Write a response to the customer..."
            className="composer-textarea"
          />
        </div>

        <div className="composer-footer-toolbar">
          <div className="composer-hint">
            <CornerDownLeft size={13} className="hint-icon" />
            <span>Press <strong>Ctrl + Enter</strong> to quickly send</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="btn-send-message"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Send Response</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
