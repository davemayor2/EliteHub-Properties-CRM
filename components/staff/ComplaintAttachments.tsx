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
      <div className="section-card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill">
            <Paperclip size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
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
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            showUploader
              ? 'bg-slate-200 text-slate-800'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
          }`}
        >
          {showUploader ? <X size={14} /> : <Plus size={14} />}
          <span>{showUploader ? 'Cancel' : 'Upload Evidence'}</span>
        </button>
      </div>

      {/* Upload Box (Collapsible) */}
      {showUploader && (
        <div className="p-4 mb-4 bg-slate-50/90 rounded-xl border border-slate-200 animate-fade-in">
          <h4 className="text-xs font-bold text-slate-800 mb-2">Upload Supporting Evidence File</h4>

          <AttachmentUploader
            files={newFiles}
            onFilesChange={setNewFiles}
            disabled={isUploading}
            label="Select Evidence Documents"
            helperText="Add images, invoices, agreements, or reports (PDF, JPG, PNG, WebP up to 10MB each. Max 5 files)."
          />

          {uploadError && (
            <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
              {uploadError}
            </div>
          )}

          {newFiles.length > 0 && (
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setNewFiles([]);
                  setShowUploader(false);
                }}
                disabled={isUploading}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition disabled:opacity-50"
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
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2 mb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Files ({attachments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'customer'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Customer Evidence ({customerAttachments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'staff'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Staff Shared ({staffAttachments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('internal')}
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'internal'
                ? 'bg-amber-800 text-white font-semibold'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Lock size={11} />
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
