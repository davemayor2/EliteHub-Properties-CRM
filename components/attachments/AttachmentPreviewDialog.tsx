'use client';

import React, { useEffect } from 'react';
import { X, Download, ExternalLink, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { AttachmentType } from '@/types/attachment';

interface AttachmentPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  signedUrl: string | null;
  attachmentType?: AttachmentType | string;
  isLoading?: boolean;
  onDownload?: () => void;
}

export default function AttachmentPreviewDialog({
  isOpen,
  onClose,
  fileName,
  signedUrl,
  attachmentType,
  isLoading = false,
  onDownload,
}: AttachmentPreviewDialogProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isImage =
    attachmentType === 'image' ||
    /\.(jpg|jpeg|png|webp)$/i.test(fileName);

  const isPdf =
    attachmentType === 'pdf' ||
    /\.pdf$/i.test(fileName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
              {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
            </div>
            <div className="overflow-hidden">
              <h3 id="preview-modal-title" className="text-sm font-semibold text-slate-800 truncate" title={fileName}>
                {fileName}
              </h3>
              <p className="text-xs text-slate-500">
                {isImage ? 'Image Preview' : isPdf ? 'PDF Document' : 'Attachment File'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {signedUrl && onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm transition"
                title="Download file"
              >
                <Download size={14} />
                <span>Download</span>
              </button>
            )}

            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
                <span>Open Link</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[320px] bg-slate-100/50">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <span className="text-sm">Loading secure file preview...</span>
            </div>
          ) : !signedUrl ? (
            <div className="text-center p-8 text-slate-500">
              <FileText size={40} className="mx-auto text-slate-400 mb-2" />
              <p className="font-medium text-slate-700">Unable to preview this file.</p>
              <p className="text-xs text-slate-500 mt-1">
                Please try downloading the attachment directly.
              </p>
            </div>
          ) : isImage ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={fileName}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[70vh] flex flex-col items-center justify-center">
              <iframe
                src={signedUrl}
                title={fileName}
                className="w-full h-full rounded-lg border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md">
              <FileText size={48} className="mx-auto text-emerald-600 mb-3" />
              <h4 className="font-semibold text-slate-800 text-sm mb-1">{fileName}</h4>
              <p className="text-xs text-slate-500 mb-4">
                Inline preview is not available for this document format. You can download and open it securely on your device.
              </p>
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  <Download size={14} />
                  <span>Download Attachment</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
