import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { STORAGE_BUCKET_NAME } from '@/lib/storage';

interface RouteParams {
  params: Promise<{
    token: string;
    attachmentId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token, attachmentId } = await params;

    if (!token || !attachmentId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token or attachment identifier.' },
        { status: 400 }
      );
    }

    // Call secure RPC to validate token and return attachment storage path
    const { data: filePath, error: rpcError } = await supabaseServer.rpc(
      'get_customer_attachment_path_by_token',
      {
        p_token: token.trim(),
        p_attachment_id: attachmentId,
      }
    );

    if (rpcError || !filePath) {
      return NextResponse.json(
        { success: false, message: 'Attachment not found for this complaint link.' },
        { status: 404 }
      );
    }

    // Generate signed URL with 300s expiry
    const EXPIRES_IN_SECONDS = 300;
    const isDownload = request.nextUrl.searchParams.get('download') === 'true';

    const { data: signedData, error: signedError } = await supabaseServer.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrl(filePath, EXPIRES_IN_SECONDS, {
        download: isDownload,
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
