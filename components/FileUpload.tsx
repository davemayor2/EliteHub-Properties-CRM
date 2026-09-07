'use client';

import React, { useRef, useState } from 'react';
import { CloudUpload, FileText, X, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

interface FileUploadProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
}

export default function FileUpload({
  file,
  onFileSelect,
  onFileRemove,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File | undefined) => {
    setUploadError('');
    if (!selectedFile) return;

    // Check extension and mime type
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    const isExtensionValid = ALLOWED_EXTENSIONS.includes(fileExtension);
    const isTypeValid = ALLOWED_TYPES.includes(selectedFile.type) || isExtensionValid;

    if (!isTypeValid) {
      setUploadError('Invalid file type. Please upload a PDF, JPG, or PNG file.');
      return;
    }

    // Check size limit (10MB)
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError('File size exceeds the 10MB limit. Please choose a smaller file.');
      return;
    }

    onFileSelect(selectedFile);
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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDropzoneClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDropzoneClick();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className={`form-field ${disabled ? 'is-disabled' : ''}`}>
      <label className="form-label" id="attachment-label">
        Upload Attachment
      </label>
      <p className="form-helper-text">
        You can provide screenshots, documents or any files that may help us understand your issue.
      </p>

      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        style={{ display: 'none' }}
        aria-labelledby="attachment-label"
        disabled={disabled}
      />

      {/* Dropzone Area */}
      {!file ? (
        <div
          className={`upload-dropzone ${isDragging ? 'is-dragging' : ''} ${
            disabled ? 'disabled-dropzone' : ''
          }`}
          onClick={handleDropzoneClick}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload attachment dropzone. Click or drag and drop files."
          aria-disabled={disabled}
        >
          <CloudUpload size={28} strokeWidth={1.75} className="upload-icon" />
          <p className="upload-prompt">Click Upload or drag and drop</p>
          <p className="upload-limit">PDF, JPG, PNG up to 10MB</p>
        </div>
      ) : (
        /* Selected File Display */
        <div className="selected-file-card">
          <div className="file-info">
            <FileText size={22} color="var(--color-green-primary)" />
            <div>
              <p className="file-name" title={file.name}>
                {file.name}
              </p>
              <p className="file-size">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-remove-file"
            onClick={onFileRemove}
            disabled={disabled}
            aria-label={`Remove file ${file.name}`}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Inline File Validation Error */}
      {uploadError && (
        <div className="field-error-msg" role="alert">
          <AlertCircle size={14} />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
