import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseServer } from '@/lib/supabase/server';
import { STORAGE_BUCKET_NAME } from '@/lib/storage';

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

    // 2. Fetch attachment metadata to verify ownership and path
    const { data: attachment, error: attError } = await supabase
      .from('complaint_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('complaint_id', complaintId)
      .single();

    if (attError || !attachment) {
      return NextResponse.json(
        { success: false, message: 'Attachment not found for this complaint' },
        { status: 404 }
      );
    }

    // 3. Generate signed URL with 300 seconds (5 minutes) expiry
    const EXPIRES_IN_SECONDS = 300;
    const { data: signedData, error: signedError } = await supabaseServer.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrl(attachment.file_path, EXPIRES_IN_SECONDS, {
        download: request.nextUrl.searchParams.get('download') === 'true' ? attachment.file_name : false,
      });

    if (signedError || !signedData?.signedUrl) {
      console.error('[Storage Signed URL Generation Error]:', signedError);
      return NextResponse.json(
        { success: false, message: 'Failed to generate secure access URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
      fileName: attachment.file_name,
      expiresInSeconds: EXPIRES_IN_SECONDS,
    });
  } catch (err) {
    console.error('[Attachment Signed URL Route Unexpected Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
