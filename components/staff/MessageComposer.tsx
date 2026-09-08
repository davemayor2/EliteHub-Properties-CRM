'use client';

import React, { useState, useRef } from 'react';
import { Send, Loader2, AlertCircle, CornerDownLeft, Paperclip } from 'lucide-react';
import { ComplaintMessageRecord } from '@/types/complaint';
import AttachmentUploader from '@/components/attachments/AttachmentUploader';

interface MessageComposerProps {
  complaintId: string;
  onMessageSent: (newMessage: ComplaintMessageRecord, newComplaintStatus?: string) => void;
}

export default function MessageComposer({
  complaintId,
  onMessageSent,
}: MessageComposerProps) {
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
      setErrorMsg('Please enter a response before sending.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      let res: Response;

      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('message', trimmed);
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        res = await fetch(`/api/staff/complaints/${complaintId}/messages`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`/api/staff/complaints/${complaintId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: trimmed }),
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send response. Please try again.');
      }

      setContent('');
      setAttachments([]);
      setShowUploader(false);
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

        {showUploader && (
          <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 mt-2">
            <AttachmentUploader
              files={attachments}
              onFilesChange={(newFiles) => setAttachments(newFiles)}
              disabled={isSubmitting}
              label="Attach Customer-Facing Evidence"
              helperText="Files attached here will be visible to the customer on their tracking link (Max 5 files, 10MB each)."
            />
          </div>
        )}

        <div className="composer-footer-toolbar flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowUploader((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition ${
                showUploader || attachments.length > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Paperclip size={13} />
              <span>
                {attachments.length > 0
                  ? `${attachments.length} file(s) attached`
                  : 'Attach Evidence'}
              </span>
            </button>

            <div className="composer-hint hidden sm:flex items-center gap-1 text-slate-400 text-xs">
              <CornerDownLeft size={12} className="hint-icon" />
              <span>Press <strong>Ctrl + Enter</strong> to send</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="btn-send-message inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Send Response</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
