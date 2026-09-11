'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Plus,
} from 'lucide-react';
import { MAX_ATTACHMENTS_PER_ACTION, MAX_FILE_SIZE_BYTES, validateAttachment } from '@/lib/attachments/validation';

interface AttachmentUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

export default function AttachmentUploader({
  files,
  onFilesChange,
  maxFiles = MAX_ATTACHMENTS_PER_ACTION,
  maxSizeBytes = MAX_FILE_SIZE_BYTES,
  disabled = false,
  label = 'Supporting Documents & Evidence',
  helperText = 'Upload screenshots, receipts, or other files that may help us understand your complaint (PDF, JPG, PNG, WebP, TXT up to 10MB each. Max 5 files).',
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processSelectedFiles = (newFiles: FileList | File[]) => {
    setErrorMessage(null);
    if (!newFiles || newFiles.length === 0) return;

    const fileArray = Array.from(newFiles);

    // Check count constraint
    if (files.length + fileArray.length > maxFiles) {
      setErrorMessage(`You can only attach up to ${maxFiles} files in total. Please remove some files first.`);
      return;
    }

    const validNewFiles: File[] = [];

    for (const f of fileArray) {
      // Validate with server-aligned validator
      const result = validateAttachment({
        name: f.name,
        size: f.size,
        type: f.type,
      });

      if (!result.valid) {
        setErrorMessage(`"${f.name}": ${result.error}`);
        return;
      }

      // Check duplicates by filename & size
      const isDuplicate = files.some(
        (existing) => existing.name === f.name && existing.size === f.size
      );

      if (!isDuplicate) {
        validNewFiles.push(f);
      }
    }

    if (validNewFiles.length > 0) {
      onFilesChange([...files, ...validNewFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
    }
    // reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (indexToRemove: number) => {
    setErrorMessage(null);
    const updated = files.filter((_, idx) => idx !== indexToRemove);
    onFilesChange(updated);
  };

  return (
    <div className="attachment-uploader-widget">
      {/* Hidden File Input with guaranteed display none */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
        onChange={handleInputChange}
        disabled={disabled}
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Header with Title & Count Chip */}
      <div className="uploader-header-row">
        <label className="uploader-label">
          <Paperclip size={16} className="uploader-label-icon" />
          <span>{label}</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(Optional)</span>
        </label>
        <span className={`uploader-count-chip ${files.length > 0 ? 'has-files' : ''}`}>
          {files.length} / {maxFiles} files
        </span>
      </div>

      {helperText && (
        <p className="uploader-helper-text">
          {helperText}
        </p>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div role="alert" className="uploader-error-alert">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Modern Dropzone Area (shown when files < maxFiles) */}
      {files.length < maxFiles ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label="Upload files by dragging or clicking"
          className={`modern-upload-dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
        >
          <div className="dropzone-icon-circle">
            <UploadCloud size={24} />
          </div>

          <div className="dropzone-primary-action">
            <span>Drag and drop files here, or</span>
            <button
              type="button"
              className="btn-browse-pill"
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) fileInputRef.current?.click();
              }}
              disabled={disabled}
            >
              Browse Files
            </button>
          </div>

          <div className="dropzone-format-badges">
            <span className="format-chip">PDF</span>
            <span className="format-chip">PNG</span>
            <span className="format-chip">JPG</span>
            <span className="format-chip">WebP</span>
            <span className="format-chip">TXT</span>
            <span className="dropzone-limit-text">• Max 10MB per file</span>
          </div>
        </div>
      ) : null}

      {/* Attached Files List */}
      {files.length > 0 && (
        <div className="attached-files-section" aria-label="Selected files for upload">
          <div className="attached-files-header">
            <span className="attached-files-heading">
              Attached Documents ({files.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {files.map((file, index) => {
              const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
              const isPdf = file.type.includes('pdf') || file.name.endsWith('.pdf');

              return (
                <div
                  key={`${file.name}-${index}`}
                  className="attached-file-card"
                >
                  <div className="attached-file-left">
                    <div
                      className={`attached-file-icon-box ${
                        isImage ? 'is-image' : isPdf ? 'is-pdf' : 'is-doc'
                      }`}
                    >
                      {isImage ? (
                        <ImageIcon size={18} />
                      ) : isPdf ? (
                        <FileText size={18} />
                      ) : (
                        <FileText size={18} />
                      )}
                    </div>
                    <div className="attached-file-meta">
                      <p className="attached-file-name" title={file.name}>
                        {file.name}
                      </p>
                      <span className="attached-file-size">{formatSize(file.size)}</span>
                    </div>
                  </div>

                  <div className="attached-file-right">
                    <span className="attached-ready-pill">
                      <CheckCircle2 size={12} />
                      <span>Ready</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      disabled={disabled}
                      className="btn-remove-attachment"
                      title={`Remove ${file.name}`}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add more files button if not at limit and files already exist */}
          {files.length > 0 && files.length < maxFiles && (
            <button
              type="button"
              onClick={() => !disabled && fileInputRef.current?.click()}
              disabled={disabled}
              className="btn-add-more-attachments"
            >
              <Plus size={15} />
              <span>Add another document ({files.length}/{maxFiles})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
