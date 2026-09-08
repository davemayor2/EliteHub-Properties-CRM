import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedAttachmentUrl } from '@/lib/attachments';

interface AttachmentUrlParams {
  params: Promise<{
    id: string;
    attachmentId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: AttachmentUrlParams) {
  try {
    const { id: complaintId, attachmentId } = await params;
    const supabase = await createClient();

    // 1. Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const isDownload = request.nextUrl.searchParams.get('download') === 'true';

    // 2. Generate secure short-lived signed URL (10 minutes / 600 seconds)
    const result = await getSignedAttachmentUrl({
      complaintId,
      attachmentId,
      isStaff: true,
      isDownload,
      expiresInSeconds: 600,
    });

    if (!result.success || !result.signedUrl) {
      return NextResponse.json(
        { success: false, message: result.message || 'Failed to generate secure access URL' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: result.signedUrl,
      fileName: result.fileName,
      originalFilename: result.fileName,
      attachmentType: result.attachmentType,
      expiresInSeconds: result.expiresInSeconds || 600,
    });
  } catch (err) {
    console.error('[Staff Attachment Signed URL Route Unexpected Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
