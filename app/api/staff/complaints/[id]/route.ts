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

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const rawId = (await params).id;
    const isIdUuid = isUuid(rawId);

    // Resolve complaint ID (supports both UUID and reference number)
    let complaintId = rawId;
    if (!isIdUuid) {
      const { data: refMatch } = await supabase
        .from('complaints')
        .select('id')
        .or(`reference_number.eq.${rawId},tracking_token.eq.${rawId}`)
        .maybeSingle();

      if (!refMatch?.id) {
        return NextResponse.json({ success: false, message: 'Complaint not found' }, { status: 404 });
      }
      complaintId = refMatch.id;
    }

    // Fetch complaint with attachments, assigned staff, category, department, and feedback
    let { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        category:complaint_categories(id, name, description, is_active),
        department:departments(id, name, is_active, auto_assign_enabled),
        attachments:complaint_attachments(*)
      `)
      .eq('id', complaintId)
      .maybeSingle();

    if (complaintError || !complaint) {
      // Fallback if joined tables do not exist yet
      const fallback = await supabase
        .from('complaints')
        .select(`
          *,
          assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
          attachments:complaint_attachments(*)
        `)
        .eq('id', complaintId)
        .maybeSingle();

      if (fallback.data) {
        complaint = fallback.data;
        complaintError = null;
      } else {
        const basic = await supabase
          .from('complaints')
          .select('*')
          .eq('id', complaintId)
          .maybeSingle();
        if (basic.data) {
          complaint = basic.data;
          complaintError = null;
        }
      }
    }

    if (!complaint) {
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

    const rawId = (await params).id;
    const isIdUuid = isUuid(rawId);

    const body = await request.json().catch(() => ({}));
    const { status, priority, assigned_to, category_id, department_id } = body;

    // Verify existing complaint using select('*') so missing SLA columns never cause 42703 errors
    const lookup = isIdUuid
      ? supabase.from('complaints').select('*').eq('id', rawId)
      : supabase.from('complaints').select('*').or(`reference_number.eq.${rawId},tracking_token.eq.${rawId}`);

    const { data: existingComplaint, error: fetchErr } = await lookup.maybeSingle();

    if (fetchErr) {
      console.error('[API /api/staff/complaints/[id] PATCH Fetch Error]:', fetchErr);
      return NextResponse.json(
        { success: false, message: `Database error: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    if (!existingComplaint) {
      return NextResponse.json({ success: false, message: 'Complaint not found' }, { status: 404 });
    }

    const complaintId = existingComplaint.id;

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

      // SLA Resolution Tracking (safely check if columns exist on the table record)
      if (status === 'resolved') {
        if ('resolved_at' in existingComplaint && !existingComplaint.resolved_at) {
          const now = new Date();
          const nowIso = now.toISOString();
          updates.resolved_at = nowIso;

          if (existingComplaint.resolution_due_at && 'resolution_sla_breached' in existingComplaint) {
            const isBreached = now > new Date(existingComplaint.resolution_due_at);
            updates.resolution_sla_breached = isBreached;

            if (isBreached && !existingComplaint.resolution_sla_breached) {
              try {
                await supabase.from('complaint_activity').insert({
                  complaint_id: complaintId,
                  actor_type: 'system',
                  activity_type: 'resolution_sla_breached',
                  metadata: {
                    reference_number: existingComplaint.reference_number,
                    resolution_due_at: existingComplaint.resolution_due_at,
                    resolved_at: nowIso,
                  },
                });
              } catch {}
            }
          }
        }
      } else if (status === 'closed') {
        if ('closed_at' in existingComplaint && !existingComplaint.closed_at) {
          updates.closed_at = new Date().toISOString();
        }
      }
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
          .maybeSingle();

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

    // Execute update with progressive fallbacks
    let updatedComplaint: any = null;
    let updateError: any = null;

    const richUpdate = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', complaintId)
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        category:complaint_categories(id, name, description, is_active),
        department:departments(id, name, is_active, auto_assign_enabled),
        attachments:complaint_attachments(*)
      `)
      .maybeSingle();

    if (richUpdate.error) {
      console.warn('[API PATCH Rich Select Fallback]:', richUpdate.error.message);
      const fallbackUpdate = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', complaintId)
        .select(`
          *,
          assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
          attachments:complaint_attachments(*)
        `)
        .maybeSingle();

      if (fallbackUpdate.error) {
        const basicUpdate = await supabase
          .from('complaints')
          .update(updates)
          .eq('id', complaintId)
          .select('*')
          .maybeSingle();

        if (basicUpdate.error) {
          updateError = basicUpdate.error;
        } else {
          updatedComplaint = basicUpdate.data;
        }
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
      createFeedbackRequest(supabase, complaintId, {
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
