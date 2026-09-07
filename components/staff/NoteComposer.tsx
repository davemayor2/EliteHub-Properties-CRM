'use client';

import React, { useState, useRef } from 'react';
import { PlusCircle, Loader2, AlertCircle, CornerDownLeft, Lock } from 'lucide-react';
import { ComplaintNoteRecord } from '@/types/note';

interface NoteComposerProps {
  complaintId: string;
  onNoteAdded: (newNote: ComplaintNoteRecord) => void;
}

export default function NoteComposer({ complaintId, onNoteAdded }: NoteComposerProps) {
  const [content, setContent] = useState('');
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

      const res = await fetch(`/api/staff/complaints/${complaintId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save note. Please try again.');
      }

      setContent('');
      onNoteAdded(data.note);

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

        <div className="note-composer-footer">
          <div className="composer-hint">
            <Lock size={12} className="text-amber-500" />
            <span>Only visible to staff • Press <strong>Ctrl + Enter</strong> to add</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="btn-add-note"
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
