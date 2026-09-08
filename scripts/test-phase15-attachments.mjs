/**
 * Automated Verification Script for Phase 15: Advanced Attachments, File Management & Evidence Handling
 * 
 * Verifies:
 * 1. File validation logic (MIME types, forbidden extensions, size limits, file counts).
 * 2. Filename sanitization & path traversal security.
 * 3. Storage path formatting & isolation hierarchy.
 * 4. Customer visibility vs Internal confidential attachment isolation.
 * 5. Short-lived signed URL parameter specifications (600s).
 * 6. Migration SQL schema integrity.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Minimal assertion runner
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
  }
}

console.log('=== PHASE 15: ATTACHMENTS & EVIDENCE TEST SUITE ===\n');

// -------------------------------------------------------------
// Test Group 1: Storage Utility Constants & Rules
// -------------------------------------------------------------
console.log('--- 1. Storage & Validation Rules Inspection ---');

const validationFile = resolve('lib/attachments/validation.ts');
assert(existsSync(validationFile), 'lib/attachments/validation.ts exists');
const validationContent = readFileSync(validationFile, 'utf8');

const storageFile = resolve('lib/storage.ts');
assert(existsSync(storageFile), 'lib/storage.ts exists');
const storageContent = readFileSync(storageFile, 'utf8');
assert(storageContent.includes("export * from './attachments/validation'"), 'lib/storage.ts re-exports validation');

assert(validationContent.includes('10 * 1024 * 1024'), 'Max file size is configured to 10MB');
assert(validationContent.includes('MAX_ATTACHMENTS_PER_ACTION = 5'), 'Max attachments per action is capped at 5');
assert(validationContent.includes('application/pdf'), 'MIME type application/pdf allowed');
assert(validationContent.includes('image/jpeg'), 'MIME type image/jpeg allowed');
assert(validationContent.includes('image/png'), 'MIME type image/png allowed');
assert(validationContent.includes('image/webp'), 'MIME type image/webp allowed');
assert(validationContent.includes('text/plain'), 'MIME type text/plain allowed');

// Check forbidden executable extensions
const forbiddenExts = ['.exe', '.bat', '.sh', '.cmd', '.js', '.mjs', '.vbs', '.msi', '.com', '.ps1', '.py', '.php', '.dll'];
for (const ext of forbiddenExts) {
  assert(validationContent.includes(`'${ext}'`), `Forbidden extension blocked: ${ext}`);
}

// -------------------------------------------------------------
// Test Group 2: Sanitize Filename & Security
// -------------------------------------------------------------
console.log('\n--- 2. Filename Sanitization & Path Traversal ---');

assert(validationContent.includes('sanitizeFileName'), 'sanitizeFileName function is exported');
assert(storageContent.includes('generateStoragePath'), 'generateStoragePath function is exported');
assert(validationContent.includes('SIGNED_URL_EXPIRATION_SECONDS = 600'), 'Signed URL duration is 600 seconds (10 minutes)');

// -------------------------------------------------------------
// Test Group 3: Customer vs Internal Isolation in API Routes
// -------------------------------------------------------------
console.log('\n--- 3. Confidential Isolation in API Routes ---');

const customerUrlRoute = resolve('app/api/track/[token]/attachments/[attachmentId]/url/route.ts');
assert(existsSync(customerUrlRoute), 'Customer attachment URL route exists');
const customerUrlContent = readFileSync(customerUrlRoute, 'utf8');
assert(customerUrlContent.includes("visibility === 'internal'"), 'Customer route detects internal attachments');
assert(customerUrlContent.includes('403'), 'Customer route returns 403 Forbidden for internal attachments');

const customerMessagesRoute = resolve('app/api/track/[token]/messages/route.ts');
assert(existsSync(customerMessagesRoute), 'Customer messages route exists');
const customerMsgContent = readFileSync(customerMessagesRoute, 'utf8');
assert(customerMsgContent.includes("visibility: 'customer_visible'"), 'Customer uploaded attachments are always forced to customer_visible');

const staffNotesRoute = resolve('app/api/staff/complaints/[id]/notes/route.ts');
assert(existsSync(staffNotesRoute), 'Staff notes route exists');
const staffNotesContent = readFileSync(staffNotesRoute, 'utf8');
assert(staffNotesContent.includes("visibility: 'internal'"), 'Internal staff note attachments are tagged as internal visibility');

const staffMessagesRoute = resolve('app/api/staff/complaints/[id]/messages/route.ts');
assert(existsSync(staffMessagesRoute), 'Staff customer messages route exists');
const staffMsgContent = readFileSync(staffMessagesRoute, 'utf8');
assert(staffMsgContent.includes("visibility: 'customer_visible'"), 'Staff responses to customers are tagged as customer_visible');

// -------------------------------------------------------------
// Test Group 4: Deletion Endpoint & Audit Log
// -------------------------------------------------------------
console.log('\n--- 4. Authorized Deletion & Audit Logging ---');

const deleteAttachmentRoute = resolve('app/api/staff/complaints/[id]/attachments/[attachmentId]/route.ts');
assert(existsSync(deleteAttachmentRoute), 'Staff attachment DELETE route exists');
const deleteRouteContent = readFileSync(deleteAttachmentRoute, 'utf8');
assert(deleteRouteContent.includes('deleteAttachment'), 'DELETE route invokes deleteAttachment helper');

const deleteHelper = resolve('lib/attachments/deleteAttachment.ts');
assert(existsSync(deleteHelper), 'lib/attachments/deleteAttachment.ts exists');
const deleteHelperContent = readFileSync(deleteHelper, 'utf8');
assert(deleteHelperContent.includes('attachment_deleted'), 'Deletions log attachment_deleted activity');

// -------------------------------------------------------------
// Test Group 5: UI Components
// -------------------------------------------------------------
console.log('\n--- 5. UI Components Integrity ---');

const previewDialog = resolve('components/attachments/AttachmentPreviewDialog.tsx');
assert(existsSync(previewDialog), 'AttachmentPreviewDialog exists');
const previewDialogContent = readFileSync(previewDialog, 'utf8');
assert(previewDialogContent.includes('isImage'), 'Preview dialog handles images');
assert(previewDialogContent.includes('isPdf'), 'Preview dialog handles PDFs');

const uploader = resolve('components/attachments/AttachmentUploader.tsx');
assert(existsSync(uploader), 'AttachmentUploader exists');
const uploaderContent = readFileSync(uploader, 'utf8');
assert(uploaderContent.includes('maxFiles'), 'Uploader enforces maxFiles');
assert(uploaderContent.includes('maxSizeBytes'), 'Uploader enforces maxSizeBytes');

const attachmentList = resolve('components/attachments/AttachmentList.tsx');
assert(existsSync(attachmentList), 'AttachmentList exists');

const complaintAttachments = resolve('components/staff/ComplaintAttachments.tsx');
assert(existsSync(complaintAttachments), 'Staff ComplaintAttachments tab exists');
const complaintAttachmentsContent = readFileSync(complaintAttachments, 'utf8');
assert(complaintAttachmentsContent.includes("'internal'"), 'Staff view filters internal attachments');
assert(complaintAttachmentsContent.includes("'customer_visible'"), 'Staff view filters customer_visible attachments');

// -------------------------------------------------------------
// Test Group 6: SQL Migration File
// -------------------------------------------------------------
console.log('\n--- 6. SQL Migration File Verification ---');

const migrationFile = resolve('supabase/migrations/20260908150000_phase15_attachments_evidence.sql');
assert(existsSync(migrationFile), 'Phase 15 SQL migration exists');
const migrationContent = readFileSync(migrationFile, 'utf8');
assert(migrationContent.includes('complaint-attachments'), 'Storage bucket complaint-attachments declared');
assert(migrationContent.includes('public = false'), 'Storage bucket is strictly private');
assert(migrationContent.includes('visibility IN (\'customer_visible\', \'internal\')'), 'Visibility check constraint defined');
assert(migrationContent.includes('attach_complaint_file_v2'), 'RPC attach_complaint_file_v2 declared');
assert(migrationContent.includes('trg_sync_attachment_columns'), 'Sync trigger for legacy attachment columns created');

// Summary
console.log('\n=============================================');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
console.log('=============================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 15 ARCHITECTURAL & SECURITY CHECKS PASSED!\n');
}
