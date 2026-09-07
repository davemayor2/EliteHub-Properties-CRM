import { supabaseServer } from '@/lib/supabase/server';
import crypto from 'crypto';

export const STORAGE_BUCKET_NAME = 'complaint-attachments';
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an uploaded attachment by MIME type, file extension, and file size.
 */
export function validateAttachment(file: {
  name: string;
  size: number;
  type: string;
}): ValidationResult {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds the maximum limit of 10MB.',
    };
  }

  const dotIndex = file.name.lastIndexOf('.');
  if (dotIndex === -1) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a PDF, JPG, JPEG, or PNG file.',
    };
  }

  const extension = file.name.slice(dotIndex).toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.includes(extension);
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || hasValidExtension;

  if (!hasValidExtension || !hasValidMime) {
    return {
      valid: false,
      error: 'Unsupported file type. Allowed formats: PDF, JPG, JPEG, PNG.',
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a filename to prevent directory traversal and unsafe characters.
 */
export function sanitizeFileName(name: string): string {
  // Remove path separators and special characters
  const baseName = name.replace(/[/\\?%*:|"<>]/g, '-');
  return baseName.replace(/\s+/g, '_');
}

/**
 * Generates a structured, unique storage path to prevent collisions:
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
 * Deletes an uploaded file from Supabase Storage (used during rollback).
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
