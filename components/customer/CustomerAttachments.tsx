'use client';

import React, { useState } from 'react';
import { Paperclip, FileText, Image as ImageIcon, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { CustomerAttachmentView } from '@/types/complaint';
import AttachmentPreviewDialog from '@/components/attachments/AttachmentPreviewDialog';

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

  // Preview Dialog State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CustomerAttachmentView | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const fetchUrl = async (att: CustomerAttachmentView, isDownload: boolean): Promise<string> => {
    const endpoint = `/api/track/${token}/attachments/${att.id}/url${isDownload ? '?download=true' : ''}`;
    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok || !data.success || !data.signedUrl) {
      throw new Error(data.message || 'Unable to load attachment securely.');
    }

    return data.signedUrl;
  };

  const handlePreview = async (att: CustomerAttachmentView) => {
    try {
      setErrorMsg(null);
      setPreviewFile(att);
      setPreviewSignedUrl(null);
      setIsPreviewLoading(true);
      setPreviewOpen(true);
      setLoadingId(`${att.id}-preview`);

      const url = await fetchUrl(att, false);
      setPreviewSignedUrl(url);
    } catch (err) {
      console.error('[Customer Attachment Preview Error]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error loading attachment preview.');
      setPreviewOpen(false);
    } finally {
      setIsPreviewLoading(false);
      setLoadingId(null);
    }
  };

  const handleDownload = async (att: CustomerAttachmentView) => {
    try {
      setErrorMsg(null);
      setLoadingId(`${att.id}-download`);

      const url = await fetchUrl(att, true);
      const fileName = att.original_filename || att.file_name || 'attachment';

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (err) {
      console.error('[Customer Attachment Download Error]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error downloading attachment.');
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
          const fileName = att.original_filename || att.file_name;
          const isImage = (att.file_type && att.file_type.startsWith('image/')) || /\.(jpg|jpeg|png|webp)$/i.test(fileName);
          const isPreviewing = loadingId === `${att.id}-preview`;
          const isDownloading = loadingId === `${att.id}-download`;

          return (
            <div key={att.id} className="customer-attachment-item">
              <div className="attachment-info-group">
                <div className="file-icon-box">
                  {isImage ? <ImageIcon size={18} color="#0284c7" /> : <FileText size={18} color="#145E3D" />}
                </div>
                <div className="file-text-details">
                  <span className="file-name" title={fileName}>
                    {fileName}
                  </span>
                  <span className="file-meta-size">{formatFileSize(att.file_size)}</span>
                </div>
              </div>

              <div className="attachment-button-group">
                <button
                  type="button"
                  onClick={() => handlePreview(att)}
                  disabled={Boolean(loadingId)}
                  className="btn-customer-att btn-att-preview"
                  title="View attachment"
                >
                  {isPreviewing ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                  <span>View</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(att)}
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

      {/* Shared Preview Modal */}
      {previewFile && (
        <AttachmentPreviewDialog
          isOpen={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewFile(null);
            setPreviewSignedUrl(null);
          }}
          fileName={previewFile.original_filename || previewFile.file_name}
          signedUrl={previewSignedUrl}
          attachmentType={previewFile.attachment_type}
          isLoading={isPreviewLoading}
          onDownload={() => handleDownload(previewFile)}
        />
      )}
    </div>
  );
}
