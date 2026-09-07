'use client';

import React, { useState } from 'react';
import { Paperclip, FileText, Image as ImageIcon, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { ComplaintAttachmentRecord } from '@/types/complaint';

interface ComplaintAttachmentsProps {
  complaintId: string;
  attachments: ComplaintAttachmentRecord[];
}

export default function ComplaintAttachments({
  complaintId,
  attachments,
}: ComplaintAttachmentsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (fileName: string, mimeType: string | null) => {
    const isImage = (mimeType && mimeType.startsWith('image/')) || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    if (isImage) {
      return <ImageIcon size={20} className="file-type-icon icon-image" />;
    }
    return <FileText size={20} className="file-type-icon icon-document" />;
  };

  const handleAccessAttachment = async (attachment: ComplaintAttachmentRecord, isDownload: boolean) => {
    try {
      setLoadingId(`${attachment.id}-${isDownload ? 'download' : 'preview'}`);
      setErrorMsg(null);

      const endpoint = `/api/staff/complaints/${complaintId}/attachments/${attachment.id}/url${isDownload ? '?download=true' : ''}`;
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || !data.success || !data.signedUrl) {
        throw new Error(data.message || 'Unable to generate secure file access link.');
      }

      if (isDownload) {
        // Trigger download programmatically
        const anchor = document.createElement('a');
        anchor.href = data.signedUrl;
        anchor.download = attachment.file_name;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } else {
        // Open preview in new tab
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('[Attachment Access Error]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error generating secure file URL');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="staff-section-card complaint-attachments-card">
      <div className="section-card-header">
        <div className="header-icon-pill">
          <Paperclip size={18} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="section-card-title">Customer Attachments & Evidence</h3>
            <span className="attachment-count-badge">{attachments.length}</span>
          </div>
          <p className="section-card-subtitle">
            Securely stored in private encrypted vault • Signed URLs generated on-demand
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="attachment-error-banner">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="attachments-empty-state">
          <div className="empty-icon-circle">
            <Paperclip size={24} />
          </div>
          <p className="empty-title">No attachments submitted</p>
          <p className="empty-subtitle">The customer did not provide additional file attachments with this complaint.</p>
        </div>
      ) : (
        <div className="attachments-list-grid">
          {attachments.map((att) => {
            const isPreviewLoading = loadingId === `${att.id}-preview`;
            const isDownloadLoading = loadingId === `${att.id}-download`;

            return (
              <div key={att.id} className="attachment-card-item">
                <div className="attachment-left-meta">
                  <div className="attachment-icon-wrapper">
                    {getFileIcon(att.file_name, att.file_type)}
                  </div>
                  <div className="attachment-details">
                    <span className="attachment-name" title={att.file_name}>
                      {att.file_name}
                    </span>
                    <div className="attachment-sub-meta">
                      <span>{formatFileSize(att.file_size)}</span>
                      <span className="bullet-sep">•</span>
                      <span>Uploaded {formatDate(att.created_at)}</span>
                      {att.file_type && (
                        <>
                          <span className="bullet-sep">•</span>
                          <span className="mime-pill">{att.file_type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="attachment-actions">
                  <button
                    type="button"
                    onClick={() => handleAccessAttachment(att, false)}
                    disabled={Boolean(loadingId)}
                    className="btn-attachment-action btn-preview"
                    title="Preview file securely"
                  >
                    {isPreviewLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAccessAttachment(att, true)}
                    disabled={Boolean(loadingId)}
                    className="btn-attachment-action btn-download"
                    title="Download file securely"
                  >
                    {isDownloadLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
