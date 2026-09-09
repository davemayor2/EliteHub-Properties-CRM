import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi } from '@/lib/auth/apiAuth';
import { deleteAttachment } from '@/lib/attachments';

interface RouteParams {
  params: Promise<{
    id: string;
    attachmentId: string;
  }>;
}

/**
 * DELETE /api/staff/complaints/[id]/attachments/[attachmentId]
 * Allows authorized staff/admins to delete an attachment.
 * Removes both the database record and the Supabase Storage object.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { user, profile } = auth;

    const { id: complaintId, attachmentId } = await params;

    // 2. Perform authorized deletion
    const deleteResult = await deleteAttachment({
      complaintId,
      attachmentId,
      profileId: profile.id,
      actorName: profile.full_name || 'Staff Member',
    });

    if (!deleteResult.success) {
      return NextResponse.json(
        { success: false, message: deleteResult.error || 'Failed to delete attachment.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully.',
    });
  } catch (err) {
    console.error('[API Attachment DELETE Exception]:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
