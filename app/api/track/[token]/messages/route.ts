import { NextRequest, NextResponse } from 'next/server';
import { submitCustomerMessage } from '@/lib/tracking';
import { supabaseServer } from '@/lib/supabase/server';
import { validateAttachment, MAX_ATTACHMENTS_PER_ACTION } from '@/lib/storage';
import { uploadAttachment } from '@/lib/attachments';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing tracking token.' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    const contentType = request.headers.get('content-type') || '';
    let rawMessage = '';
    const attachmentFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      rawMessage = (formData.get('message') as string) || '';

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
      rawMessage = body.message || '';
    }

    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return NextResponse.json(
        { success: false, message: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    const trimmedMessage = rawMessage.trim();

    // Validate attachment limits
    if (attachmentFiles.length > MAX_ATTACHMENTS_PER_ACTION) {
      return NextResponse.json(
        {
          success: false,
          message: `You can attach at most ${MAX_ATTACHMENTS_PER_ACTION} files per message.`,
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

    // Submit customer message to database & update status
    const result = await submitCustomerMessage(cleanToken, trimmedMessage);

    if (!result.success || !result.message) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || 'Unable to send message. Please verify your tracking link is valid.',
        },
        { status: 400 }
      );
    }

    const messageId = result.message.id;
    const uploadedAttachments = [];

    // If attachments were included, upload them linked to this message
    if (attachmentFiles.length > 0) {
      // Fetch complaint id by tracking token
      const { data: complaint } = await supabaseServer
        .from('complaints')
        .select('id')
        .eq('tracking_token', cleanToken)
        .single();

      if (complaint?.id) {
        for (const file of attachmentFiles) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const upRes = await uploadAttachment({
            complaintId: complaint.id,
            fileBuffer: buffer,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            visibility: 'customer_visible',
            messageId,
            actorType: 'customer',
            actorName: 'Customer',
          });

          if (upRes.success && upRes.attachment) {
            uploadedAttachments.push({
              id: upRes.attachment.id,
              file_name: upRes.attachment.original_filename || upRes.attachment.file_name,
              original_filename: upRes.attachment.original_filename || upRes.attachment.file_name,
              file_type: upRes.attachment.mime_type || upRes.attachment.file_type,
              mime_type: upRes.attachment.mime_type || upRes.attachment.file_type,
              file_size: upRes.attachment.file_size,
              attachment_type: upRes.attachment.attachment_type,
              message_id: messageId,
              created_at: upRes.attachment.created_at,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        ...result.message,
        attachments: uploadedAttachments,
      },
      status: result.status,
      attachments: uploadedAttachments,
    });
  } catch (err) {
    console.error('[API /api/track/[token]/messages Unexpected Error]:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
