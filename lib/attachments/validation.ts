import { AttachmentType, AttachmentValidationResult } from '@/types/attachment';

export const STORAGE_BUCKET_NAME = 'complaint-attachments';
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_ATTACHMENTS_PER_ACTION = 5;
export const SIGNED_URL_EXPIRATION_SECONDS = 600; // 10 minutes default

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'text/plain',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.txt'];

export const FORBIDDEN_EXTENSIONS = [
  '.exe',
  '.bat',
  '.sh',
  '.cmd',
  '.js',
  '.mjs',
  '.apk',
  '.vbs',
  '.msi',
  '.scr',
  '.bin',
  '.jar',
  '.com',
  '.ps1',
  '.py',
  '.php',
  '.html',
  '.htm',
  '.cgi',
  '.dll',
  '.sys',
  '.zip',
  '.tar',
  '.gz',
];

/**
 * Derives standardized AttachmentType from MIME type and filename.
 */
export function inferAttachmentType(mimeType: string, fileName: string): AttachmentType {
  const lowerMime = (mimeType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    lowerMime.startsWith('image/') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp')
  ) {
    return 'image';
  }
  if (
    lowerMime.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerMime.includes('document') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx')
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Validates an individual uploaded attachment by file size, MIME type, and extension.
 */
export function validateAttachment(file: {
  name: string;
  size: number;
  type: string;
}): AttachmentValidationResult {
  if (!file || !file.name) {
    return {
      valid: false,
      error: 'Invalid file: filename is required.',
    };
  }

  // 1. File size constraint (Max 10MB)
  if (file.size <= 0) {
    return {
      valid: false,
      error: 'File is empty (0 bytes).',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds the maximum allowable limit of 10MB.',
    };
  }

  // 2. Reject hidden files and path traversal attempts
  const rawName = file.name.trim();
  if (rawName.startsWith('.') || rawName.includes('/') || rawName.includes('\\') || rawName.includes('\0')) {
    return {
      valid: false,
      error: 'Invalid filename containing illegal characters.',
    };
  }

  const dotIndex = rawName.lastIndexOf('.');
  if (dotIndex === -1) {
    return {
      valid: false,
      error: 'File has no extension. Please upload a PDF, image, or text file.',
    };
  }

  const extension = rawName.slice(dotIndex).toLowerCase();

  // 3. Reject executable or dangerous file extensions
  if (FORBIDDEN_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Potentially dangerous file type "${extension}" is prohibited for security reasons.`,
    };
  }

  // 4. Validate allowed extension
  const hasValidExtension = ALLOWED_EXTENSIONS.includes(extension);
  const normalizedMime = (file.type || '').toLowerCase().trim();
  const hasValidMime = ALLOWED_MIME_TYPES.includes(normalizedMime);

  if (!hasValidExtension && !hasValidMime) {
    return {
      valid: false,
      error: 'Unsupported file type. Allowed formats: PDF, JPG, PNG, WebP, TXT.',
    };
  }

  const attachmentType = inferAttachmentType(normalizedMime, rawName);

  return {
    valid: true,
    attachmentType,
  };
}

/**
 * Validates a batch of files for multi-upload operations (e.g. max 5 files).
 */
export function validateAttachmentBatch(files: Array<{ name: string; size: number; type: string }>): {
  valid: boolean;
  error?: string;
} {
  if (files.length > MAX_ATTACHMENTS_PER_ACTION) {
    return {
      valid: false,
      error: `You can upload a maximum of ${MAX_ATTACHMENTS_PER_ACTION} files per action.`,
    };
  }

  for (let i = 0; i < files.length; i++) {
    const check = validateAttachment(files[i]);
    if (!check.valid) {
      return {
        valid: false,
        error: `File "${files[i].name}": ${check.error}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitizes a filename to prevent directory traversal and unsafe characters.
 */
export function sanitizeFileName(name: string): string {
  // Strip path traversal sequences, control characters, and special symbols
  const withoutPath = name.replace(/^.*[\\\/]/, '');
  const cleanName = withoutPath.replace(/[/\\?%*:|"<>]/g, '-');
  return cleanName.replace(/\s+/g, '_').slice(0, 150); // limit max filename length
}
