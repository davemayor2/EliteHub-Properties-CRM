'use client';

import React, { useState } from 'react';
import {
  Paperclip,
  UploadCloud,
  Lock,
  Globe,
  Plus,
  X,
  FileCheck2,
  FolderOpen,
} from 'lucide-react';
import { ComplaintAttachmentRecord, AttachmentVisibility } from '@/types/attachment';
import AttachmentList from '@/components/attachments/AttachmentList';
import AttachmentUploader from '@/components/attachments/AttachmentUploader';

interface ComplaintAttachmentsProps {
  complaintId: string;
  attachments: ComplaintAttachmentRecord[];
  onAttachmentAdded?: (newAttachment: ComplaintAttachmentRecord) => void;
  onAttachmentDeleted?: (attachmentId: string) => void;
  canDelete?: boolean;
}

export default function ComplaintAttachments({
  complaintId,
  attachments: initialAttachments,
  onAttachmentAdded,
  onAttachmentDeleted,
  canDelete = true,
}: ComplaintAttachmentsProps) {
  const [attachments, setAttachments] = useState<ComplaintAttachmentRecord[]>(initialAttachments);
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'staff' | 'internal'>('all');
  const [showUploader, setShowUploader] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploadVisibility, setUploadVisibility] = useState<AttachmentVisibility>('customer_visible');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync if parent updates
  React.useEffect(() => {
    setAttachments(initialAttachments);
  }, [initialAttachments]);

  // Categorize attachments
  const customerAttachments = attachments.filter(
    (a) => a.visibility === 'customer_visible' && !a.uploaded_by_profile_id
  );
  const staffAttachments = attachments.filter(
    (a) => a.visibility === 'customer_visible' && Boolean(a.uploaded_by_profile_id)
  );
  const internalAttachments = attachments.filter(
    (a) => a.visibility === 'internal'
  );

  const displayedAttachments =
    activeTab === 'customer'
      ? customerAttachments
      : activeTab === 'staff'
      ? staffAttachments
      : activeTab === 'internal'
      ? internalAttachments
      : attachments;

  const handleDelete = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    if (onAttachmentDeleted) {
      onAttachmentDeleted(attachmentId);
    }
  };

  const handleUploadSubmit = async () => {
    if (newFiles.length === 0 || isUploading) return;
    try {
      setIsUploading(true);
      setUploadError(null);

      // Upload via internal notes or direct route
      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('note', `Uploaded attachment: ${file.name}`);
        formData.append('attachments', file);

        // Upload using the staff notes route which handles file upload with visibility
        const endpoint = `/api/staff/complaints/${complaintId}/notes`;
        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || `Failed to upload "${file.name}"`);
        }

        if (data.attachments && data.attachments.length > 0) {
          const newAtt = data.attachments[0];
          setAttachments((prev) => [newAtt, ...prev]);
          if (onAttachmentAdded) {
            onAttachmentAdded(newAtt);
          }
        }
      }

      setNewFiles([]);
      setShowUploader(false);
    } catch (err) {
      console.error('[Upload Evidence Error]:', err);
      setUploadError(err instanceof Error ? err.message : 'Error uploading evidence');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="staff-section-card complaint-attachments-card">
      {/* Card Header */}
      <div className="section-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="header-icon-pill">
            <Paperclip size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="section-card-title">Evidence & Attachments</h3>
              <span className="attachment-count-badge font-bold px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
                {attachments.length}
              </span>
            </div>
            <p className="section-card-subtitle">
              Encrypted private vault • Signed URLs generated on-demand
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowUploader((prev) => !prev)}
          className={showUploader ? 'btn-cancel' : 'btn-upload-evidence'}
        >
          {showUploader ? <X size={14} /> : <Plus size={14} />}
          <span>{showUploader ? 'Cancel' : '+ Upload Evidence'}</span>
        </button>
      </div>

      {/* Upload Box (Collapsible) */}
      {showUploader && (
        <div style={{ padding: '16px', marginBottom: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>
            Upload Supporting Evidence Document
          </h4>

          <AttachmentUploader
            files={newFiles}
            onFilesChange={setNewFiles}
            disabled={isUploading}
            label="Select Evidence Documents"
            helperText="Add images, invoices, agreements, or reports (PDF, JPG, PNG, WebP up to 10MB each. Max 5 files)."
          />

          {uploadError && (
            <div className="modal-error-banner" style={{ margin: '12px 0 0 0' }}>
              {uploadError}
            </div>
          )}

          {newFiles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => {
                  setNewFiles([]);
                  setShowUploader(false);
                }}
                disabled={isUploading}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={isUploading}
                className="btn-submit-modal"
              >
                {isUploading ? (
                  <span>Uploading files...</span>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    <span>Upload {newFiles.length} File(s)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Category Tabs */}
      {attachments.length > 0 && (
        <div className="attachment-tabs-bar">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`attachment-tab-pill ${activeTab === 'all' ? 'is-active' : ''}`}
          >
            All Files ({attachments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`attachment-tab-pill ${activeTab === 'customer' ? 'is-active' : ''}`}
          >
            Customer Evidence ({customerAttachments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`attachment-tab-pill ${activeTab === 'staff' ? 'is-active' : ''}`}
          >
            Staff Shared ({staffAttachments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('internal')}
            className={`attachment-tab-pill tab-internal ${activeTab === 'internal' ? 'is-active' : ''}`}
          >
            <Lock size={11} style={{ display: 'inline', marginRight: '4px' }} />
            <span>Internal Only ({internalAttachments.length})</span>
          </button>
        </div>
      )}

      {/* Main Attachment List */}
      <AttachmentList
        complaintId={complaintId}
        attachments={displayedAttachments}
        canDelete={canDelete}
        onAttachmentDeleted={handleDelete}
        showVisibilityBadge={true}
        emptyMessage={
          activeTab === 'all'
            ? 'No attachments uploaded yet for this complaint.'
            : activeTab === 'internal'
            ? 'No confidential internal attachments.'
            : activeTab === 'customer'
            ? 'No customer evidence attachments.'
            : 'No staff shared attachments.'
        }
      />
    </div>
  );
}
