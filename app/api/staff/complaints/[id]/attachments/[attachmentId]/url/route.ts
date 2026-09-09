import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi } from '@/lib/auth/apiAuth';
import { getSignedAttachmentUrl } from '@/lib/attachments';

interface AttachmentUrlParams {
  params: Promise<{
    id: string;
    attachmentId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: AttachmentUrlParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;

    const { id: complaintId, attachmentId } = await params;

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
