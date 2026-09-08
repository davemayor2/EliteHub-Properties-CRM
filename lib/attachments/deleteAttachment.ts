import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { deleteComplaintAttachment } from '@/lib/storage';

interface DeleteAttachmentParams {
  complaintId: string;
  attachmentId: string;
  profileId: string;
  actorName: string;
  client?: SupabaseClient;
}

export async function deleteAttachment({
  complaintId,
  attachmentId,
  profileId,
  actorName,
  client = supabaseServer,
}: DeleteAttachmentParams): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch attachment details
    const { data: attachment, error: fetchErr } = await client
      .from('complaint_attachments')
      .select('id, complaint_id, storage_path, file_path, original_filename, file_name, visibility')
      .eq('id', attachmentId)
      .eq('complaint_id', complaintId)
      .single();

    if (fetchErr || !attachment) {
      return { success: false, error: 'Attachment not found for this complaint.' };
    }

    const storagePath = attachment.storage_path || attachment.file_path;
    const fileName = attachment.original_filename || attachment.file_name || 'Attachment';

    // 2. Delete database record first
    const { error: dbDeleteErr } = await client
      .from('complaint_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbDeleteErr) {
      console.error('[deleteAttachment DB Error]:', dbDeleteErr);
      return { success: false, error: 'Failed to remove attachment record from database.' };
    }

    // 3. Delete file from Supabase Storage
    if (storagePath) {
      const storageDel = await deleteComplaintAttachment(storagePath);
      if (!storageDel.success) {
        console.warn('[deleteAttachment Storage Warning]: File was deleted from DB but failed storage cleanup:', storageDel.error);
      }
    }

    // 4. Log activity
    try {
      await client.from('complaint_activity').insert({
        complaint_id: complaintId,
        actor_type: 'staff',
        actor_id: profileId,
        activity_type: 'attachment_deleted',
        metadata: {
          file_name: fileName,
          attachment_id: attachmentId,
          visibility: attachment.visibility,
          actor_name: actorName,
        },
      });
    } catch (actErr) {
      console.warn('[deleteAttachment Activity Warning]:', actErr);
    }

    return { success: true };
  } catch (err) {
    console.error('[deleteAttachment Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected attachment deletion error',
    };
  }
}
