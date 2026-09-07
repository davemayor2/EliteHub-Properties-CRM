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

export default function FileUpload({ file, onFileSelect, onFileRemove }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const validateAndSetFile = (selectedFile) => {
    setUploadError('');
    if (!selectedFile) return;

    // Check extension and mime type
    const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDropzoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDropzoneClick();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="form-field">
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
      />

      {/* Dropzone Area */}
      {!file ? (
        <div
          className={`upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
          onClick={handleDropzoneClick}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload attachment dropzone. Click or drag and drop files."
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
              <p className="file-name" title={file.name}>{file.name}</p>
              <p className="file-size">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-remove-file"
            onClick={onFileRemove}
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
