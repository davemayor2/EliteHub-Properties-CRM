import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplaintStatus, ComplaintPriority } from '@/types/complaint';
import { sendStatusUpdateEmail } from '@/services/email';

const VALID_STATUSES: ComplaintStatus[] = ['new', 'open', 'pending', 'resolved', 'closed'];
const VALID_PRIORITIES: ComplaintPriority[] = ['low', 'normal', 'high', 'urgent'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch complaint with attachments and assigned staff profile
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        attachments:complaint_attachments(*)
      `)
      .eq('id', id)
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json({ success: false, message: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, complaint });
  } catch (err) {
    console.error('[API /api/staff/complaints/[id] GET Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { status, priority, assigned_to } = body;

    // Verify existing complaint
    const { data: existingComplaint, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, status, email, reference_number, tracking_token, full_name')
      .eq('id', id)
      .single();

    if (fetchErr || !existingComplaint) {
      return NextResponse.json({ success: false, message: 'Complaint not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status as ComplaintStatus)) {
        return NextResponse.json(
          { success: false, message: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority as ComplaintPriority)) {
        return NextResponse.json(
          { success: false, message: `Invalid priority: ${priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.priority = priority;
    }

    if (assigned_to !== undefined) {
      if (assigned_to === null || assigned_to === '') {
        updates.assigned_to = null;
      } else {
        // Verify target profile exists
        const { data: targetProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', assigned_to)
          .single();

        if (profileErr || !targetProfile) {
          return NextResponse.json(
            { success: false, message: 'Assigned staff user does not exist in profiles.' },
            { status: 400 }
          );
        }
        updates.assigned_to = assigned_to;
      }
    }

    // Execute update
    const { data: updatedComplaint, error: updateError } = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        attachments:complaint_attachments(*)
      `)
      .single();

    if (updateError) {
      console.error('[API /api/staff/complaints/[id] PATCH Error]:', updateError);
      return NextResponse.json(
        { success: false, message: `Failed to update complaint: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Trigger Status Update Notification Email only if status actually changed
    const statusChanged = status !== undefined && status !== existingComplaint.status;
    if (statusChanged && existingComplaint.email && existingComplaint.tracking_token) {
      sendStatusUpdateEmail({
        to: existingComplaint.email,
        referenceNumber: existingComplaint.reference_number,
        trackingToken: existingComplaint.tracking_token,
        newStatus: status as ComplaintStatus,
        customerName: existingComplaint.full_name,
      }).catch((emailErr) => {
        console.error('[API /api/staff/complaints/[id] Email Background Error]:', emailErr);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Complaint updated successfully',
      complaint: updatedComplaint,
    });
  } catch (err) {
    console.error('[API /api/staff/complaints/[id] PATCH Unexpected Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
