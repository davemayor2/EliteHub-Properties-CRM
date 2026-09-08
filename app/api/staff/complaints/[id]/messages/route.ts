import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendStaffResponseEmail } from '@/services/email';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (err) {
    console.error('[API Messages GET Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: complaintId } = await params;
    const supabase = await createClient();

    // 1. Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate body
    const body = await request.json().catch(() => ({}));
    const rawMessage = body.message;

    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return NextResponse.json(
        { success: false, message: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    const trimmedMessage = rawMessage.trim();

    // 3. Verify complaint exists and fetch recipient info & SLA targets
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

    // 4. Insert message
    // Note: The database trigger trigger_staff_first_response_status will automatically
    // transition 'new' complaints to 'open' when sender_type is 'staff'.
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

    // 4b. SLA Tracking: Record First Response timestamp if not previously set
    try {
      if (!complaint.first_responded_at) {
        const now = new Date();
        const nowIso = now.toISOString();
        const isBreached = complaint.first_response_due_at
          ? now > new Date(complaint.first_response_due_at)
          : false;

        await supabase
          .from('complaints')
          .update({
            first_responded_at: nowIso,
            first_response_sla_breached: isBreached,
            updated_at: nowIso,
          })
          .eq('id', complaintId);

        if (isBreached && !complaint.first_response_sla_breached) {
          await supabase.from('complaint_activity').insert({
            complaint_id: complaintId,
            actor_type: 'system',
            activity_type: 'first_response_sla_breached',
            metadata: {
              reference_number: complaint.reference_number,
              first_response_due_at: complaint.first_response_due_at,
              responded_at: nowIso,
            },
          });
        }
      }
    } catch (slaErr) {
      console.error('[API Messages POST SLA Tracking Warning]:', slaErr);
      // Non-fatal to customer communication
    }

    // 5. Trigger Staff Response Notification Email (non-blocking)
    if (complaint.email && complaint.tracking_token) {
      sendStaffResponseEmail({
        to: complaint.email,
        referenceNumber: complaint.reference_number,
        trackingToken: complaint.tracking_token,
        customerName: complaint.full_name,
      }).catch((emailErr) => {
        console.error('[API Messages POST Email Background Error]:', emailErr);
      });
    }

    // 6. Fetch current status of complaint to inform caller of any transition
    const { data: refreshedComplaint } = await supabase
      .from('complaints')
      .select('status')
      .eq('id', complaintId)
      .single();

    return NextResponse.json({
      success: true,
      message: insertedMessage,
      complaintStatus: refreshedComplaint?.status || complaint.status,
      statusTransitioned: complaint.status === 'new' && refreshedComplaint?.status === 'open',
    });
  } catch (err) {
    console.error('[API Messages POST Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
