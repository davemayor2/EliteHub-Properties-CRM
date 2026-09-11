'use client';

import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Trash2,
  Lock,
  Globe,
  Loader2,
} from 'lucide-react';
import { ComplaintAttachmentRecord } from '@/types/attachment';

interface AttachmentItemProps {
  attachment: ComplaintAttachmentRecord;
  onPreview: (attachment: ComplaintAttachmentRecord) => void;
  onDownload: (attachment: ComplaintAttachmentRecord) => void;
  onDelete?: (attachment: ComplaintAttachmentRecord) => void;
  canDelete?: boolean;
  showVisibilityBadge?: boolean;
  isLoading?: boolean;
}

export default function AttachmentItem({
  attachment,
  onPreview,
  onDownload,
  onDelete,
  canDelete = false,
  showVisibilityBadge = false,
  isLoading = false,
}: AttachmentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const fileName = attachment.original_filename || attachment.file_name || 'Attachment';
  const isImage =
    attachment.attachment_type === 'image' ||
    /\.(jpg|jpeg|png|webp)$/i.test(fileName);
  const isPdf =
    attachment.attachment_type === 'pdf' ||
    /\.pdf$/i.test(fileName);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`);
    if (confirmed) {
      try {
        setIsDeleting(true);
        await onDelete(attachment);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="attachment-card-modern">
      {/* File info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '10px',
            borderRadius: '10px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isImage ? '#eff6ff' : isPdf ? '#fef2f2' : '#ecfdf5',
            color: isImage ? '#1d4ed8' : isPdf ? '#b91c1c' : '#047857',
            border: `1px solid ${isImage ? '#bfdbfe' : isPdf ? '#fecaca' : '#a7f3d0'}`,
          }}
        >
          {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
        </div>

        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fileName}>
            {fileName}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '11.5px', color: '#64748b' }}>
            <span>{formatSize(attachment.file_size)}</span>
            {attachment.created_at && (
              <>
                <span>•</span>
                <span>{formatDate(attachment.created_at)}</span>
              </>
            )}

            {/* Visibility Badge (Staff views) */}
            {showVisibilityBadge && (
              <>
                <span>•</span>
                {attachment.visibility === 'internal' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                    <Lock size={10} />
                    <span>Internal Only</span>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                    <Globe size={10} />
                    <span>Customer Visible</span>
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
        <button
          type="button"
          onClick={() => onPreview(attachment)}
          disabled={isLoading || isDeleting}
          className="btn-attachment-view"
          title="Preview attachment"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={13} />}
          <span>View</span>
        </button>

        <button
          type="button"
          onClick={() => onDownload(attachment)}
          disabled={isLoading || isDeleting}
          className="btn-attachment-icon"
          title="Download attachment"
          aria-label="Download attachment"
        >
          <Download size={15} />
        </button>

        {canDelete && onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isLoading || isDeleting}
            className="btn-attachment-icon btn-delete"
            title="Delete attachment"
            aria-label="Delete attachment"
          >
            {isDeleting ? <Loader2 size={15} className="animate-spin text-rose-600" /> : <Trash2 size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}
