import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const { id: complaintId, attachmentId } = await params;
    const supabase = await createClient();

    // 1. Verify authenticated staff
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.is_active !== undefined && !profile.is_active)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Inactive or unauthorized staff account.' },
        { status: 403 }
      );
    }

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
