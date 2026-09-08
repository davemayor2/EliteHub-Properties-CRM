import { supabaseServer } from '@/lib/supabase/server';
import { STORAGE_BUCKET_NAME } from '@/lib/storage';
import { SignedAttachmentUrlResponse } from '@/types/attachment';

interface GetSignedUrlParams {
  complaintId: string;
  attachmentId: string;
  trackingToken?: string | null;
  isStaff?: boolean;
  isDownload?: boolean;
  expiresInSeconds?: number;
}

export async function getSignedAttachmentUrl({
  complaintId,
  attachmentId,
  trackingToken,
  isStaff = false,
  isDownload = false,
  expiresInSeconds = 600, // 10 minutes default
}: GetSignedUrlParams): Promise<SignedAttachmentUrlResponse> {
  try {
    // 1. If customer access via tracking token:
    if (trackingToken) {
      // Validate tracking token matches complaint
      const { data: complaint, error: compErr } = await supabaseServer
        .from('complaints')
        .select('id, tracking_token, tracking_token_revoked_at')
        .eq('id', complaintId)
        .single();

      if (
        compErr ||
        !complaint ||
        complaint.tracking_token !== trackingToken.trim() ||
        complaint.tracking_token_revoked_at
      ) {
        return { success: false, message: 'Unauthorized: Invalid tracking authorization.' };
      }

      // Fetch attachment and ensure customer_visible
      const { data: attachment, error: attErr } = await supabaseServer
        .from('complaint_attachments')
        .select('id, storage_path, file_path, original_filename, file_name, visibility, attachment_type')
        .eq('id', attachmentId)
        .eq('complaint_id', complaintId)
        .single();

      if (attErr || !attachment) {
        return { success: false, message: 'Attachment not found for this complaint.' };
      }

      // Critical Security Rule: Customers must NEVER access internal attachments!
      if (attachment.visibility === 'internal') {
        return { success: false, message: 'Unauthorized: Access to internal attachments is restricted.' };
      }

      const storagePath = attachment.storage_path || attachment.file_path;
      const fileName = attachment.original_filename || attachment.file_name;

      const { data: signedData, error: signedError } = await supabaseServer.storage
        .from(STORAGE_BUCKET_NAME)
        .createSignedUrl(storagePath, expiresInSeconds, {
          download: isDownload ? fileName : false,
        });

      if (signedError || !signedData?.signedUrl) {
        console.error('[Customer Signed URL Generation Error]:', signedError);
        return { success: false, message: 'Failed to generate secure access URL.' };
      }

      return {
        success: true,
        signedUrl: signedData.signedUrl,
        fileName,
        originalFilename: fileName,
        attachmentType: attachment.attachment_type,
        expiresInSeconds,
      };
    }

    // 2. If staff access:
    if (isStaff) {
      const { data: attachment, error: attErr } = await supabaseServer
        .from('complaint_attachments')
        .select('id, storage_path, file_path, original_filename, file_name, visibility, attachment_type')
        .eq('id', attachmentId)
        .eq('complaint_id', complaintId)
        .single();

      if (attErr || !attachment) {
        return { success: false, message: 'Attachment not found for this complaint.' };
      }

      const storagePath = attachment.storage_path || attachment.file_path;
      const fileName = attachment.original_filename || attachment.file_name;

      const { data: signedData, error: signedError } = await supabaseServer.storage
        .from(STORAGE_BUCKET_NAME)
        .createSignedUrl(storagePath, expiresInSeconds, {
          download: isDownload ? fileName : false,
        });

      if (signedError || !signedData?.signedUrl) {
        console.error('[Staff Signed URL Generation Error]:', signedError);
        return { success: false, message: 'Failed to generate secure access URL.' };
      }

      return {
        success: true,
        signedUrl: signedData.signedUrl,
        fileName,
        originalFilename: fileName,
        attachmentType: attachment.attachment_type,
        expiresInSeconds,
      };
    }

    return { success: false, message: 'Unauthorized request.' };
  } catch (err) {
    console.error('[getSignedAttachmentUrl Exception]:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unexpected error generating file URL',
    };
  }
}
