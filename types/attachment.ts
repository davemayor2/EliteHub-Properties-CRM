export type AttachmentType = 'image' | 'document' | 'pdf' | 'other';
export type AttachmentVisibility = 'customer_visible' | 'internal';

export interface ComplaintAttachmentRecord {
  id: string;
  complaint_id: string;
  message_id?: string | null;
  uploaded_by_profile_id?: string | null;
  storage_path: string;
  file_path?: string; // backward compatibility
  original_filename: string;
  file_name?: string; // backward compatibility
  file_size: number;
  mime_type: string;
  file_type?: string | null; // backward compatibility
  attachment_type: AttachmentType;
  visibility: AttachmentVisibility;
  created_at: string;
  uploader_profile?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
  attachmentType?: AttachmentType;
}

export interface UploadAttachmentResult {
  success: boolean;
  attachment?: ComplaintAttachmentRecord;
  error?: string;
}

export interface SignedAttachmentUrlResponse {
  success: boolean;
  signedUrl?: string;
  fileName?: string;
  originalFilename?: string;
  attachmentType?: AttachmentType;
  expiresInSeconds?: number;
  message?: string;
}
