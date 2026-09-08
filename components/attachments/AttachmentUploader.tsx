'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, X, AlertCircle, CheckCircle2, Paperclip } from 'lucide-react';
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
  helperText = 'Upload screenshots, receipts, or documents (PDF, JPG, PNG, WebP, TXT up to 10MB each. Max 5 files).',
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
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
      {/* Label and Subheading */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Paperclip size={14} className="text-emerald-700" />
          <span>{label}</span>
          <span className="text-[11px] font-normal text-slate-500">
            ({files.length}/{maxFiles})
          </span>
        </label>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
          {helperText}
        </p>
      )}

      {/* Validation Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 p-2.5 mb-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg animate-fade-in"
        >
          <AlertCircle size={15} className="flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto p-0.5 text-rose-500 hover:text-rose-800"
            aria-label="Dismiss error"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Dropzone Area */}
      {files.length < maxFiles && (
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
          className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition text-center ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50/50'
              : 'border-slate-200 hover:border-emerald-500 bg-slate-50/60 hover:bg-slate-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <UploadCloud
            size={24}
            className={`mb-1 transition ${
              isDragging ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'
            }`}
          />
          <div className="text-xs font-medium text-slate-700">
            <span className="text-emerald-700 font-semibold hover:underline">Click to browse</span> or drag and drop files here
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5">
            PDF, PNG, JPG, WebP, TXT (Max 10MB)
          </span>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="mt-3 space-y-1.5" aria-label="Selected files for upload">
          {files.map((file, index) => {
            const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
            const isPdf = file.type.includes('pdf') || file.name.endsWith('.pdf');

            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                  <div className="p-1.5 rounded-md bg-slate-100 text-slate-600 flex-shrink-0">
                    {isImage ? (
                      <ImageIcon size={15} className="text-blue-600" />
                    ) : isPdf ? (
                      <FileText size={15} className="text-rose-600" />
                    ) : (
                      <FileText size={15} className="text-emerald-600" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <span className="text-[11px] text-slate-500">{formatSize(file.size)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle2 size={11} />
                    <span>Ready</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    disabled={disabled}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                    title={`Remove ${file.name}`}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={14} />
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
