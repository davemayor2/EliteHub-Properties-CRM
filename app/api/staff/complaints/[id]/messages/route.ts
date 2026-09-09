import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi } from '@/lib/auth/apiAuth';
import { sendStaffResponseEmail } from '@/services/email';
import { validateAttachment, MAX_ATTACHMENTS_PER_ACTION } from '@/lib/storage';
import { uploadAttachment } from '@/lib/attachments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await params;

    // 2. Fetch complaint messages
    const { data: messages, error: messagesError } = await supabase
      .from('complaint_messages')
      .select(`
        *,
        sender_profile:profiles(id, full_name, email, role)
      `)
      .eq('complaint_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[API Messages GET Error]:', messagesError);
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve conversation messages' },
        { status: 500 }
      );
    }

    // 3. Fetch attachments linked to messages
    const { data: attachments } = await supabase
      .from('complaint_attachments')
      .select('*')
      .eq('complaint_id', id)
      .not('message_id', 'is', null);

    const attachmentsByMessageId: Record<string, any[]> = {};
    if (attachments) {
      for (const att of attachments) {
        if (att.message_id) {
          if (!attachmentsByMessageId[att.message_id]) {
            attachmentsByMessageId[att.message_id] = [];
          }
          attachmentsByMessageId[att.message_id].push(att);
        }
      }
    }

    const messagesWithAttachments = (messages || []).map((msg) => ({
      ...msg,
      attachments: attachmentsByMessageId[msg.id] || [],
    }));

    return NextResponse.json({ success: true, messages: messagesWithAttachments });
  } catch (err) {
    console.error('[API Messages GET Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { user, profile, supabase } = auth;

    const { id: complaintId } = await params;

    // 3. Parse and validate body
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
          message: `You can attach at most ${MAX_ATTACHMENTS_PER_ACTION} files per response.`,
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

    // 4. Verify complaint exists and fetch recipient info & SLA targets
    const { data: complaint, error: complaintErr } = await supabase
      .from('complaints')
      .select('id, status, email, full_name, reference_number, tracking_token, first_responded_at, first_response_due_at, first_response_sla_breached')
      .eq('id', complaintId)
      .single();

    if (complaintErr || !complaint) {
      return NextResponse.json(
        { success: false, message: 'Complaint not found' },
        { status: 404 }
      );
    }

    // 5. Insert message
    const { data: insertedMessage, error: insertErr } = await supabase
      .from('complaint_messages')
      .insert({
        complaint_id: complaintId,
        sender_type: 'staff',
        sender_id: user.id,
        message: trimmedMessage,
      })
      .select(`
        *,
        sender_profile:profiles(id, full_name, email, role)
      `)
      .single();

    if (insertErr || !insertedMessage) {
      console.error('[API Messages POST Insert Error]:', insertErr);
      return NextResponse.json(
        { success: false, message: `Failed to send message: ${insertErr?.message || 'Database error'}` },
        { status: 500 }
      );
    }

    // 6. Upload attachments linked to this staff response (customer_visible)
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
          visibility: 'customer_visible',
          messageId: insertedMessage.id,
          uploadedByProfileId: user.id,
          actorType: 'staff',
          actorName: profile?.full_name || 'Staff Member',
        });

        if (upRes.success && upRes.attachment) {
          uploadedAttachments.push(upRes.attachment);
        }
      }
    }

    // 7. SLA Tracking: Record First Response timestamp if not previously set
    try {
      if (!complaint.first_responded_at) {
        const nowIso = new Date().toISOString();
        const dueTime = complaint.first_response_due_at ? new Date(complaint.first_response_due_at).getTime() : null;
        const isBreached = Boolean(dueTime && Date.now() > dueTime);

        await supabase
          .from('complaints')
          .update({
            first_responded_at: nowIso,
            first_response_sla_breached: isBreached,
          })
          .eq('id', complaintId);

        if (isBreached) {
          await supabase.from('complaint_activity').insert({
            complaint_id: complaintId,
            actor_type: 'system',
            activity_type: 'first_response_sla_breached',
            metadata: {
              due_at: complaint.first_response_due_at,
              responded_at: nowIso,
            },
          });
        }
      }
    } catch (slaErr) {
      console.warn('[Staff Message SLA Warning]:', slaErr);
    }

    // 8. Refetch updated complaint status
    const { data: updatedComplaint } = await supabase
      .from('complaints')
      .select('status')
      .eq('id', complaintId)
      .single();

    const currentStatus = updatedComplaint?.status || complaint.status;

    // 9. Send email notification to customer
    if (complaint.email && complaint.tracking_token) {
      sendStaffResponseEmail({
        to: complaint.email,
        customerName: complaint.full_name,
        referenceNumber: complaint.reference_number,
        trackingToken: complaint.tracking_token,
        hasAttachments: uploadedAttachments.length > 0,
      }).catch((emailErr) => {
        console.error('[API SendStaffResponseEmail Error]:', emailErr);
      });
    }

    return NextResponse.json({
      success: true,
      message: {
        ...insertedMessage,
        attachments: uploadedAttachments,
      },
      complaintStatus: currentStatus,
      attachments: uploadedAttachments,
    });
  } catch (err) {
    console.error('[API Messages POST Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
