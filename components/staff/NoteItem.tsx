import React from 'react';
import { ComplaintNoteRecord } from '@/types/note';
import { User, Clock, Lock } from 'lucide-react';

interface NoteItemProps {
  note: ComplaintNoteRecord;
}

export default function NoteItem({ note }: NoteItemProps) {
  const authorName = note.author_profile?.full_name || 'Staff Member';
  const authorRole = note.author_profile?.role || 'staff';

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="internal-note-item">
      <div className="note-item-header">
        <div className="note-author-info">
          <div className="note-avatar" title={authorName}>
            {getInitials(authorName)}
          </div>
          <div className="note-meta">
            <div className="note-author-line">
              <span className="note-author-name">{authorName}</span>
              <span className={`note-role-tag role-${authorRole}`}>
                {authorRole.toUpperCase()}
              </span>
            </div>
            <div className="note-time-line">
              <Clock size={12} className="text-muted" />
              <span>{formatTimestamp(note.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="note-visibility-pill" title="Only visible to staff">
          <Lock size={11} />
          <span>Internal Note</span>
        </div>
      </div>

      <div className="note-body-content">
        <p>{note.note}</p>
      </div>
    </div>
  );
}
