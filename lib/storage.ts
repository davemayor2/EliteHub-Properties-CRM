import { supabaseServer } from '@/lib/supabase/server';
import crypto from 'crypto';
import { sanitizeFileName } from './attachments/validation';

export * from './attachments/validation';

/**
 * Generates a structured, non-predictable unique storage path:
 * complaints/{complaint_id}/{uuid}-{sanitized-file-name}
 */
export function generateStoragePath(complaintId: string, originalFileName: string): string {
  const safeName = sanitizeFileName(originalFileName);
  const uniquePrefix = crypto.randomUUID();
  return `complaints/${complaintId}/${uniquePrefix}-${safeName}`;
}

/**
 * Uploads an attachment buffer directly to the private Supabase Storage bucket.
 */
export async function uploadComplaintAttachment(
  complaintId: string,
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  mimeType: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const storagePath = generateStoragePath(complaintId, fileName);

    const { data, error } = await supabaseServer.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('[Storage Upload Error]:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      filePath: data.path,
    };
  } catch (err) {
    console.error('[Storage Upload Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown storage upload error',
    };
  }
}

/**
 * Deletes an uploaded file from Supabase Storage.
 */
export async function deleteComplaintAttachment(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseServer.storage
      .from(STORAGE_BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('[Storage Delete Error]:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[Storage Delete Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown storage delete error',
    };
  }
}
