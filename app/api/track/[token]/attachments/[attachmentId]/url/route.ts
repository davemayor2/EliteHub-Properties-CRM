import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { STORAGE_BUCKET_NAME } from '@/lib/storage';
import { checkRateLimit, getClientIp, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit/rateLimiter';

interface RouteParams {
  params: Promise<{
    token: string;
    attachmentId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`att_dl:${clientIp}`, RATE_LIMIT_CONFIGS.attachmentDownload);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many download requests. Please try again shortly.' },
        { status: 429 }
      );
    }
    const { token, attachmentId } = await params;

    if (!token || !attachmentId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token or attachment identifier.' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();

    // 1. Verify complaint exists and tracking token is valid
    const { data: complaint, error: compErr } = await supabaseServer
      .from('complaints')
      .select('id, tracking_token, tracking_token_revoked_at')
      .eq('tracking_token', cleanToken)
      .single();

    if (compErr || !complaint || complaint.tracking_token_revoked_at) {
      return NextResponse.json(
        { success: false, message: 'Complaint tracking link is invalid or expired.' },
        { status: 404 }
      );
    }

    // 2. Fetch attachment for this complaint
    const { data: attachment, error: attErr } = await supabaseServer
      .from('complaint_attachments')
      .select('id, complaint_id, storage_path, file_path, original_filename, file_name, visibility, attachment_type')
      .eq('id', attachmentId)
      .eq('complaint_id', complaint.id)
      .single();

    if (attErr || !attachment) {
      return NextResponse.json(
        { success: false, message: 'Attachment not found for this complaint.' },
        { status: 404 }
      );
    }

    // 3. Strict security rule: Internal attachments can NEVER be accessed by customers!
    if (attachment.visibility === 'internal') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Access to internal attachments is restricted.' },
        { status: 403 }
      );
    }

    const filePath = attachment.storage_path || attachment.file_path;
    const fileName = attachment.original_filename || attachment.file_name || 'attachment';

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: 'File path not found.' },
        { status: 404 }
      );
    }

    // 4. Generate signed URL with 600s (10 minutes) expiry
    const EXPIRES_IN_SECONDS = 600;
    const isDownload = request.nextUrl.searchParams.get('download') === 'true';

    const { data: signedData, error: signedError } = await supabaseServer.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrl(filePath, EXPIRES_IN_SECONDS, {
        download: isDownload ? fileName : false,
      });

    if (signedError || !signedData?.signedUrl) {
      console.error('[Customer Signed URL Error]:', signedError);
      return NextResponse.json(
        { success: false, message: 'Failed to generate secure access URL.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
      fileName,
      originalFilename: fileName,
      attachmentType: attachment.attachment_type,
      expiresInSeconds: EXPIRES_IN_SECONDS,
    });
  } catch (err) {
    console.error('[Customer Attachment URL Exception]:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
