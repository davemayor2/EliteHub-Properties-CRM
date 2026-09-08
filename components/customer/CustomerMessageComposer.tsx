'use client';

import React, { useState, useRef } from 'react';
import { Send, Loader2, AlertCircle, Paperclip } from 'lucide-react';
import { CustomerMessageView, ComplaintStatus } from '@/types/complaint';
import AttachmentUploader from '@/components/attachments/AttachmentUploader';

interface CustomerMessageComposerProps {
  token: string;
  onMessageSent: (message: CustomerMessageView, newStatus?: ComplaintStatus) => void;
}

export default function CustomerMessageComposer({
  token,
  onMessageSent,
}: CustomerMessageComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showUploader, setShowUploader] = useState(false);
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

      let response: Response;

      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('message', trimmed);
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        response = await fetch(`/api/track/${token}/messages`, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(`/api/track/${token}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: trimmed }),
        });
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to submit your message. Please try again.');
      }

      setContent('');
      setAttachments([]);
      setShowUploader(false);
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
      <div className="flex items-center justify-between mb-2">
        <h4 className="composer-heading mb-0">Send a Reply to Customer Care</h4>
        <button
          type="button"
          onClick={() => setShowUploader((prev) => !prev)}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition ${
            showUploader || attachments.length > 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Paperclip size={13} />
          <span>
            {attachments.length > 0 ? `${attachments.length} file(s) attached` : 'Attach Evidence'}
          </span>
        </button>
      </div>

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

        {showUploader && (
          <div className="mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <AttachmentUploader
              files={attachments}
              onFilesChange={(newFiles) => setAttachments(newFiles)}
              disabled={isSubmitting}
              label="Attach Supporting Evidence"
              helperText="Add images, screenshots, receipts, or PDF documents (Max 5 files, 10MB each)."
            />
          </div>
        )}

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
