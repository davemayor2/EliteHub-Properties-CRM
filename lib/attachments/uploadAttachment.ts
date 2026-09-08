import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import {
  validateAttachment,
  uploadComplaintAttachment,
  deleteComplaintAttachment,
  inferAttachmentType,
} from '@/lib/storage';
import {
  AttachmentVisibility,
  ComplaintAttachmentRecord,
  UploadAttachmentResult,
} from '@/types/attachment';

interface UploadAttachmentParams {
  complaintId: string;
  fileBuffer: Buffer | Uint8Array;
  fileName: string;
  fileSize: number;
  mimeType: string;
  visibility?: AttachmentVisibility;
  messageId?: string | null;
  uploadedByProfileId?: string | null;
  actorType?: 'customer' | 'staff' | 'system';
  actorName?: string;
  client?: SupabaseClient;
}

/**
 * Uploads an attachment to Supabase Storage and records it in complaint_attachments.
 * Includes transactional safety: storage file is deleted if DB insertion fails.
 */
export async function uploadAttachment({
  complaintId,
  fileBuffer,
  fileName,
  fileSize,
  mimeType,
  visibility = 'customer_visible',
  messageId = null,
  uploadedByProfileId = null,
  actorType = 'customer',
  actorName = 'Customer',
  client = supabaseServer,
}: UploadAttachmentParams): Promise<UploadAttachmentResult> {
  try {
    // 1. Validate file parameters
    const validation = validateAttachment({
      name: fileName,
      size: fileSize,
      type: mimeType,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid attachment' };
    }

    const attachmentType = validation.attachmentType || inferAttachmentType(mimeType, fileName);

    // 2. Upload file to private Supabase Storage
    const uploadResult = await uploadComplaintAttachment(complaintId, fileBuffer, fileName, mimeType);
    if (!uploadResult.success || !uploadResult.filePath) {
      return { success: false, error: uploadResult.error || 'Failed to upload file to storage vault.' };
    }

    const storagePath = uploadResult.filePath;

    // 3. Insert record into complaint_attachments
    let savedAttachment: ComplaintAttachmentRecord | null = null;

    // Try attach_complaint_file_v2 RPC first
    const { data: rpcData, error: rpcError } = await client.rpc('attach_complaint_file_v2', {
      p_complaint_id: complaintId,
      p_original_filename: fileName,
      p_storage_path: storagePath,
      p_mime_type: mimeType,
      p_file_size: fileSize,
      p_attachment_type: attachmentType,
      p_visibility: visibility,
      p_message_id: messageId,
      p_uploaded_by_profile_id: uploadedByProfileId,
    });

    if (!rpcError && rpcData?.id) {
      savedAttachment = rpcData as ComplaintAttachmentRecord;
    } else {
      // Fallback direct table insert if migration V2 RPC is not yet executed
      const { data: insertData, error: insertError } = await client
        .from('complaint_attachments')
        .insert({
          complaint_id: complaintId,
          message_id: messageId,
          uploaded_by_profile_id: uploadedByProfileId,
          storage_path: storagePath,
          file_path: storagePath,
          original_filename: fileName,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
          file_type: mimeType,
          attachment_type: attachmentType,
          visibility,
        })
        .select('*')
        .single();

      if (insertError || !insertData) {
        console.error('[uploadAttachment DB Error]:', insertError || rpcError);
        // Clean up storage file so no orphaned file is left
        await deleteComplaintAttachment(storagePath);
        return { success: false, error: 'Failed to record attachment in database.' };
      }

      savedAttachment = insertData as ComplaintAttachmentRecord;
    }

    // 4. Log complaint activity audit entry
    try {
      const isInternal = visibility === 'internal';
      const activityType = isInternal ? 'internal_attachment_uploaded' : 'attachment_uploaded';

      await client.from('complaint_activity').insert({
        complaint_id: complaintId,
        actor_type: actorType,
        actor_id: uploadedByProfileId || null,
        activity_type: activityType,
        metadata: {
          file_name: fileName,
          file_size: fileSize,
          attachment_type: attachmentType,
          visibility,
          message_id: messageId,
          actor_name: actorName,
        },
      });
    } catch (actErr) {
      console.warn('[uploadAttachment Activity Warning]:', actErr);
    }

    return {
      success: true,
      attachment: savedAttachment,
    };
  } catch (err) {
    console.error('[uploadAttachment Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected attachment upload error',
    };
  }
}
