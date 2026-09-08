'use client';

import React, { useState } from 'react';
import { Paperclip, FileQuestion, AlertCircle } from 'lucide-react';
import { ComplaintAttachmentRecord } from '@/types/attachment';
import AttachmentItem from './AttachmentItem';
import AttachmentPreviewDialog from './AttachmentPreviewDialog';

interface AttachmentListProps {
  complaintId: string;
  attachments: ComplaintAttachmentRecord[];
  trackingToken?: string | null;
  canDelete?: boolean;
  onAttachmentDeleted?: (attachmentId: string) => void;
  showVisibilityBadge?: boolean;
  emptyMessage?: string;
}

export default function AttachmentList({
  complaintId,
  attachments,
  trackingToken = null,
  canDelete = false,
  onAttachmentDeleted,
  showVisibilityBadge = false,
  emptyMessage = 'No attachments uploaded yet.',
}: AttachmentListProps) {
  // Modal Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ComplaintAttachmentRecord | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSignedUrl = async (att: ComplaintAttachmentRecord, isDownload: boolean): Promise<string> => {
    const endpoint = trackingToken
      ? `/api/track/${trackingToken}/attachments/${att.id}/url${isDownload ? '?download=true' : ''}`
      : `/api/staff/complaints/${complaintId}/attachments/${att.id}/url${isDownload ? '?download=true' : ''}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok || !data.success || !data.signedUrl) {
      throw new Error(data.message || 'Unable to access attachment securely. Please try again.');
    }

    return data.signedUrl;
  };

  const handlePreview = async (att: ComplaintAttachmentRecord) => {
    try {
      setErrorMessage(null);
      setPreviewFile(att);
      setPreviewSignedUrl(null);
      setIsPreviewLoading(true);
      setPreviewOpen(true);
      setActiveActionId(att.id);

      const url = await fetchSignedUrl(att, false);
      setPreviewSignedUrl(url);
    } catch (err) {
      console.error('[Attachment Preview Error]:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error generating file preview URL');
      setPreviewOpen(false);
    } finally {
      setIsPreviewLoading(false);
      setActiveActionId(null);
    }
  };

  const handleDownload = async (att: ComplaintAttachmentRecord) => {
    try {
      setErrorMessage(null);
      setActiveActionId(att.id);

      const url = await fetchSignedUrl(att, true);
      const fileName = att.original_filename || att.file_name || 'download';

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (err) {
      console.error('[Attachment Download Error]:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error generating download link');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDelete = async (att: ComplaintAttachmentRecord) => {
    try {
      setErrorMessage(null);
      setActiveActionId(att.id);

      const res = await fetch(`/api/staff/complaints/${complaintId}/attachments/${att.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete attachment.');
      }

      if (onAttachmentDeleted) {
        onAttachmentDeleted(att.id);
      }
    } catch (err) {
      console.error('[Attachment Deletion Error]:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error deleting attachment');
    } finally {
      setActiveActionId(null);
    }
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 bg-slate-50/50 rounded-xl border border-slate-200/60">
        <FileQuestion size={28} className="mx-auto text-slate-400 mb-1.5" />
        <p className="text-xs font-medium text-slate-700">{emptyMessage}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Any supporting documents, receipts, or photos will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="attachment-list-wrapper">
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 mb-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        {attachments.map((att) => (
          <AttachmentItem
            key={att.id}
            attachment={att}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onDelete={canDelete ? handleDelete : undefined}
            canDelete={canDelete}
            showVisibilityBadge={showVisibilityBadge}
            isLoading={activeActionId === att.id}
          />
        ))}
      </div>

      {/* Shared Preview Modal */}
      {previewFile && (
        <AttachmentPreviewDialog
          isOpen={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewFile(null);
            setPreviewSignedUrl(null);
          }}
          fileName={previewFile.original_filename || previewFile.file_name || 'Attachment'}
          signedUrl={previewSignedUrl}
          attachmentType={previewFile.attachment_type}
          isLoading={isPreviewLoading}
          onDownload={() => handleDownload(previewFile)}
        />
      )}
    </div>
  );
}
