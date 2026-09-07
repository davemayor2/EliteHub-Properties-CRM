'use client';

import React, { useState } from 'react';
import { Lock, StickyNote, ShieldAlert, RefreshCw } from 'lucide-react';
import { ComplaintNoteRecord } from '@/types/note';
import NoteItem from './NoteItem';
import NoteComposer from './NoteComposer';

interface InternalNotesProps {
  complaintId: string;
  initialNotes: ComplaintNoteRecord[];
  onNoteAdded?: (note: ComplaintNoteRecord) => void;
}

export default function InternalNotes({
  complaintId,
  initialNotes,
  onNoteAdded,
}: InternalNotesProps) {
  const [notes, setNotes] = useState<ComplaintNoteRecord[]>(initialNotes);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleNoteAdded = (newNote: ComplaintNoteRecord) => {
    setNotes((prev) => [...prev, newNote]);
    if (onNoteAdded) {
      onNoteAdded(newNote);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/staff/complaints/${complaintId}/notes`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.notes)) {
        setNotes(data.notes);
      }
    } catch (err) {
      console.error('[Refresh Notes Error]:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="staff-section-card internal-notes-card">
      {/* Section Header */}
      <div className="section-card-header notes-card-header">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-amber">
            <StickyNote size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="section-card-title">Internal Notes</h3>
              <span className="notes-count-badge">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </span>
              <span className="confidential-badge">
                <Lock size={11} />
                <span>Staff Only</span>
              </span>
            </div>
            <p className="section-card-subtitle text-amber-700 dark:text-amber-400">
              Notes added here are only visible to Elite Hub Customer Care staff.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-refresh-conversation"
          title="Refresh internal notes"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notes List */}
      <div className="internal-notes-body">
        {notes.length === 0 ? (
          <div className="empty-notes-placeholder">
            <ShieldAlert size={28} className="text-amber-500 opacity-60 mb-2" />
            <p className="empty-notes-title">No internal notes yet</p>
            <p className="empty-notes-desc">
              Add private notes, investigation details, or cross-team collaboration remarks below.
            </p>
          </div>
        ) : (
          <div className="internal-notes-list">
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>

      {/* Note Composer */}
      <div className="internal-notes-composer-container">
        <NoteComposer
          complaintId={complaintId}
          onNoteAdded={handleNoteAdded}
        />
      </div>
    </div>
  );
}
