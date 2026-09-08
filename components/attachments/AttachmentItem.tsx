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
    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition">
      {/* File info */}
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        <div
          className={`p-2.5 rounded-lg flex-shrink-0 flex items-center justify-center ${
            isImage
              ? 'bg-blue-50 text-blue-700 border border-blue-100'
              : isPdf
              ? 'bg-rose-50 text-rose-700 border border-rose-100'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          }`}
        >
          {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
        </div>

        <div className="min-w-0 overflow-hidden">
          <p className="text-xs font-semibold text-slate-800 truncate" title={fileName}>
            {fileName}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
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
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    <Lock size={10} />
                    <span>Internal Only</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
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
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
        <button
          type="button"
          onClick={() => onPreview(attachment)}
          disabled={isLoading || isDeleting}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          title="Preview attachment"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
          <span>View</span>
        </button>

        <button
          type="button"
          onClick={() => onDownload(attachment)}
          disabled={isLoading || isDeleting}
          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
          title="Download attachment"
          aria-label="Download attachment"
        >
          <Download size={14} />
        </button>

        {canDelete && onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isLoading || isDeleting}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Delete attachment"
            aria-label="Delete attachment"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin text-rose-600" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
