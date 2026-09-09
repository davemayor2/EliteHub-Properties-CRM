import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi } from '@/lib/auth/apiAuth';
import { ComplaintStatus, ComplaintPriority } from '@/types/complaint';
import { sendStatusUpdateEmail } from '@/services/email';
import { createFeedbackRequest } from '@/lib/feedback/createFeedbackRequest';

const VALID_STATUSES: ComplaintStatus[] = ['new', 'open', 'pending', 'resolved', 'closed'];
const VALID_PRIORITIES: ComplaintPriority[] = ['low', 'normal', 'high', 'urgent'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await params;

    // Fetch complaint with attachments, assigned staff, category, department, SLA policy, and feedback
    let { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        category:complaint_categories(id, name, description, is_active),
        department:departments(id, name, is_active, auto_assign_enabled),
        sla_policy:sla_policies(id, name, first_response_hours, resolution_hours, warning_percentage, auto_escalate),
        attachments:complaint_attachments(*),
        feedback:customer_feedback(*)
      `)
      .eq('id', id)
      .single();

    if (complaintError) {
      // Fallback if joined tables do not exist yet
      const fallback = await supabase
        .from('complaints')
        .select(`
          *,
          assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
          attachments:complaint_attachments(*)
        `)
        .eq('id', id)
        .single();

      if (fallback.data) {
        complaint = fallback.data;
        complaintError = null;
      }
    }

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
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { user, profile, supabase } = auth;

    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { status, priority, assigned_to, category_id, department_id } = body;

    // Verify existing complaint
    const { data: existingComplaint, error: fetchErr } = await supabase
      .from('complaints')
      .select(`
        id, status, priority, assigned_to, email, reference_number, tracking_token, full_name,
        resolved_at, closed_at, resolution_due_at, resolution_sla_breached,
        first_response_due_at, first_responded_at, first_response_sla_breached
      `)
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

      // SLA Resolution Tracking
      if (status === 'resolved') {
        if (!existingComplaint.resolved_at) {
          const now = new Date();
          const nowIso = now.toISOString();
          updates.resolved_at = nowIso;

          if (existingComplaint.resolution_due_at) {
            const isBreached = now > new Date(existingComplaint.resolution_due_at);
            updates.resolution_sla_breached = isBreached;

            if (isBreached && !existingComplaint.resolution_sla_breached) {
              await supabase.from('complaint_activity').insert({
                complaint_id: id,
                actor_type: 'system',
                activity_type: 'resolution_sla_breached',
                metadata: {
                  reference_number: existingComplaint.reference_number,
                  resolution_due_at: existingComplaint.resolution_due_at,
                  resolved_at: nowIso,
                },
              });
            }
          }
        }
      } else if (status === 'closed') {
        if (!existingComplaint.closed_at) {
          updates.closed_at = new Date().toISOString();
        }
      }
      // Reopened complaints: Preserve historical resolved_at, first_responded_at, and breach flags
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

    if (category_id !== undefined) {
      updates.category_id = category_id === null || category_id === '' ? null : category_id;
    }

    if (department_id !== undefined) {
      updates.department_id = department_id === null || department_id === '' ? null : department_id;
    }

    // Execute update with rich selects and fallback
    let updatedComplaint: any = null;
    let updateError: any = null;

    const richUpdate = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        category:complaint_categories(id, name, description, is_active),
        department:departments(id, name, is_active, auto_assign_enabled),
        sla_policy:sla_policies(id, name, first_response_hours, resolution_hours, warning_percentage, auto_escalate),
        attachments:complaint_attachments(*)
      `)
      .single();

    if (richUpdate.error) {
      // If joined relation error or column error, retry without category/department joins
      const fallbackUpdate = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
          attachments:complaint_attachments(*)
        `)
        .single();

      if (fallbackUpdate.error) {
        updateError = fallbackUpdate.error;
      } else {
        updatedComplaint = fallbackUpdate.data;
      }
    } else {
      updatedComplaint = richUpdate.data;
    }

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

    // Trigger Customer Satisfaction Feedback Request on first resolution/closure
    if (statusChanged && (status === 'resolved' || status === 'closed')) {
      createFeedbackRequest(supabase, id, {
        referenceNumber: existingComplaint.reference_number,
        customerEmail: existingComplaint.email,
        customerName: existingComplaint.full_name,
      }).catch((fbErr) => {
        console.error('[API /api/staff/complaints/[id] Feedback Request Background Error]:', fbErr);
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
