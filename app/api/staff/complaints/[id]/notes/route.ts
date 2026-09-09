import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi } from '@/lib/auth/apiAuth';
import { getComplaintNotes, createComplaintNote } from '@/lib/notes';
import { validateAttachment, MAX_ATTACHMENTS_PER_ACTION } from '@/lib/storage';
import { uploadAttachment } from '@/lib/attachments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/complaints/[id]/notes
 * Fetches all internal notes for a complaint.
 * Restricted strictly to authenticated staff.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const notes = await getComplaintNotes(id);

    return NextResponse.json({ success: true, notes });
  } catch (err) {
    console.error('[API /api/staff/complaints/[id]/notes GET Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/staff/complaints/[id]/notes
 * Adds a new internal note to a complaint with optional confidential internal attachments.
 * Restricted strictly to authenticated staff.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { user, profile } = auth;

    const { id: complaintId } = await params;

    const contentType = request.headers.get('content-type') || '';
    let rawNote = '';
    const attachmentFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      rawNote = (formData.get('note') as string) || '';

      const entries = [
        ...formData.getAll('attachments'),
        ...formData.getAll('attachment'),
      ];
      for (const entry of entries) {
        if (entry instanceof File && entry.size > 0 && entry.name) {
          attachmentFiles.push(entry);
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      rawNote = body.note || '';
    }

    if (!rawNote || typeof rawNote !== 'string' || !rawNote.trim()) {
      return NextResponse.json(
        { success: false, message: 'Note content cannot be empty.' },
        { status: 400 }
      );
    }

    // Validate attachment limits
    if (attachmentFiles.length > MAX_ATTACHMENTS_PER_ACTION) {
      return NextResponse.json(
        {
          success: false,
          message: `You can attach at most ${MAX_ATTACHMENTS_PER_ACTION} files per internal note.`,
        },
        { status: 400 }
      );
    }

    for (const file of attachmentFiles) {
      const validation = validateAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, message: `"${file.name}": ${validation.error}` },
          { status: 400 }
        );
      }
    }

    const result = await createComplaintNote(complaintId, user.id, rawNote.trim());

    if (!result.success || !result.note) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to save internal note.' },
        { status: 500 }
      );
    }

    // Upload internal attachments (visibility = 'internal')
    const uploadedAttachments = [];
    if (attachmentFiles.length > 0) {
      for (const file of attachmentFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        const upRes = await uploadAttachment({
          complaintId,
          fileBuffer,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          visibility: 'internal', // STRICT INTERNAL ONLY
          uploadedByProfileId: user.id,
          actorType: 'staff',
          actorName: profile?.full_name || 'Staff Member',
        });

        if (upRes.success && upRes.attachment) {
          uploadedAttachments.push(upRes.attachment);
        }
      }
    }

    return NextResponse.json({
      success: true,
      note: result.note,
      attachments: uploadedAttachments,
    });
  } catch (err) {
    console.error('[API /api/staff/complaints/[id]/notes POST Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
