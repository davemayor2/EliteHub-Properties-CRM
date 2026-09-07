'use client';

import React, { useState } from 'react';
import { Paperclip, FileText, Image as ImageIcon, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { CustomerAttachmentView } from '@/types/complaint';

interface CustomerAttachmentsProps {
  token: string;
  attachments: CustomerAttachmentView[];
}

export default function CustomerAttachments({
  token,
  attachments,
}: CustomerAttachmentsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleAccess = async (att: CustomerAttachmentView, isDownload: boolean) => {
    try {
      setLoadingId(`${att.id}-${isDownload ? 'download' : 'preview'}`);
      setErrorMsg(null);

      const endpoint = `/api/track/${token}/attachments/${att.id}/url${isDownload ? '?download=true' : ''}`;
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || !data.success || !data.signedUrl) {
        throw new Error(data.message || 'Unable to load attachment securely.');
      }

      if (isDownload) {
        const anchor = document.createElement('a');
        anchor.href = data.signedUrl;
        anchor.download = att.file_name;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } else {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('[Customer Attachment Access Error]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error generating file link.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="customer-section-card attachments-card">
      <div className="customer-card-header">
        <Paperclip size={18} className="header-icon" />
        <h3 className="customer-card-title">Submitted Evidence ({attachments.length})</h3>
      </div>

      {errorMsg && (
        <div className="customer-error-chip">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="customer-attachments-list">
        {attachments.map((att) => {
          const isImage = (att.file_type && att.file_type.startsWith('image/')) || /\.(jpg|jpeg|png|webp)$/i.test(att.file_name);
          const isPreviewing = loadingId === `${att.id}-preview`;
          const isDownloading = loadingId === `${att.id}-download`;

          return (
            <div key={att.id} className="customer-attachment-item">
              <div className="attachment-info-group">
                <div className="file-icon-box">
                  {isImage ? <ImageIcon size={18} color="#0284c7" /> : <FileText size={18} color="#145E3D" />}
                </div>
                <div className="file-text-details">
                  <span className="file-name" title={att.file_name}>
                    {att.file_name}
                  </span>
                  <span className="file-meta-size">{formatFileSize(att.file_size)}</span>
                </div>
              </div>

              <div className="attachment-button-group">
                <button
                  type="button"
                  onClick={() => handleAccess(att, false)}
                  disabled={Boolean(loadingId)}
                  className="btn-customer-att btn-att-preview"
                  title="View attachment"
                >
                  {isPreviewing ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                  <span>View</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAccess(att, true)}
                  disabled={Boolean(loadingId)}
                  className="btn-customer-att btn-att-download"
                  title="Download attachment"
                >
                  {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>Download</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
