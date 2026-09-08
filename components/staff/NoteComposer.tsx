'use client';

import React, { useState, useRef } from 'react';
import { PlusCircle, Loader2, AlertCircle, CornerDownLeft, Lock, Paperclip } from 'lucide-react';
import { ComplaintNoteRecord } from '@/types/note';
import AttachmentUploader from '@/components/attachments/AttachmentUploader';

interface NoteComposerProps {
  complaintId: string;
  onNoteAdded: (newNote: ComplaintNoteRecord) => void;
  onAttachmentAdded?: () => void;
}

export default function NoteComposer({
  complaintId,
  onNoteAdded,
  onAttachmentAdded,
}: NoteComposerProps) {
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
      setErrorMsg('Please enter a note before adding.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      let res: Response;

      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('note', trimmed);
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        res = await fetch(`/api/staff/complaints/${complaintId}/notes`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`/api/staff/complaints/${complaintId}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note: trimmed }),
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save note. Please try again.');
      }

      setContent('');
      setAttachments([]);
      setShowUploader(false);
      onNoteAdded(data.note);

      if (onAttachmentAdded && data.attachments?.length > 0) {
        onAttachmentAdded();
      }

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error('[Add Note Error]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error adding note.');
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
    <div className="note-composer-box">
      {errorMsg && (
        <div className="composer-error-banner">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="note-composer-form">
        <div className="composer-textarea-wrapper">
          <textarea
            ref={textareaRef}
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder="Add an internal note..."
            className="composer-textarea internal-note-textarea"
          />
        </div>

        {showUploader && (
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 mt-2">
            <AttachmentUploader
              files={attachments}
              onFilesChange={(newFiles) => setAttachments(newFiles)}
              disabled={isSubmitting}
              label="Attach Confidential Internal Document"
              helperText="Internal attachments are strictly confidential and will never appear on the customer portal (Max 5 files, 10MB each)."
            />
          </div>
        )}

        <div className="note-composer-footer flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowUploader((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition ${
                showUploader || attachments.length > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Paperclip size={13} />
              <span>
                {attachments.length > 0
                  ? `${attachments.length} internal file(s)`
                  : 'Attach Internal File'}
              </span>
            </button>

            <div className="composer-hint flex items-center gap-1 text-slate-400 text-xs">
              <Lock size={12} className="text-amber-500" />
              <span>Internal staff only</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="btn-add-note inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <PlusCircle size={14} />
                <span>Add Note</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
