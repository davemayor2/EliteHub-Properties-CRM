import { SupabaseClient } from '@supabase/supabase-js';
import { EscalationResult } from '@/types/escalation';
import { sendEscalationAlertEmail } from '@/services/email';

interface EscalateComplaintOptions {
  actorId?: string | null;
  actorType?: 'staff' | 'system';
  reason?: string | null;
  isAuto?: boolean;
}

/**
 * Executes a complaint escalation (manual or automatic).
 * Guaranteed to be idempotent: avoids duplicate escalations, duplicate logs, and email spam.
 */
export async function escalateComplaint(
  supabase: SupabaseClient,
  complaintId: string,
  options: EscalateComplaintOptions = {}
): Promise<EscalationResult> {
  const { actorId = null, actorType = 'staff', reason = null, isAuto = false } = options;

  try {
    // 1. Fetch current complaint state and department details
    const { data: complaint, error: fetchErr } = await supabase
      .from('complaints')
      .select(`
        id,
        reference_number,
        full_name,
        subject,
        priority,
        status,
        is_escalated,
        escalated_at,
        first_response_due_at,
        resolution_due_at,
        department:departments(id, name)
      `)
      .eq('id', complaintId)
      .single();

    if (fetchErr || !complaint) {
      return { success: false, message: 'Complaint not found.' };
    }

    // 2. Idempotency Guard: prevent duplicate escalation
    if (complaint.is_escalated) {
      return {
        success: true,
        alreadyEscalated: true,
        message: `Complaint ${complaint.reference_number} is already escalated.`,
        complaintId: complaint.id,
        escalatedAt: complaint.escalated_at || undefined,
      };
    }

    const nowIso = new Date().toISOString();

    // 3. Update complaint record
    const { error: updateErr } = await supabase
      .from('complaints')
      .update({
        is_escalated: true,
        escalated_at: nowIso,
        escalation_reason: reason || (isAuto ? 'Automatic SLA breach escalation' : 'Manual staff escalation'),
        updated_at: nowIso,
      })
      .eq('id', complaintId);

    if (updateErr) {
      console.error('[escalateComplaint Update Error]:', updateErr);
      return { success: false, message: `Database update failed: ${updateErr.message}` };
    }

    // 4. Log escalation activity timeline entry
    const activityType = isAuto ? 'complaint_auto_escalated' : 'manual_escalation';
    await supabase.from('complaint_activity').insert({
      complaint_id: complaintId,
      actor_type: actorType,
      actor_id: actorId,
      activity_type: activityType,
      metadata: {
        reference_number: complaint.reference_number,
        reason: reason || (isAuto ? 'SLA deadline breach' : 'Manual escalation'),
        escalated_at: nowIso,
        is_auto: isAuto,
      },
    });

    // 5. Query active administrators for email notification
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, status')
      .eq('role', 'admin')
      .neq('status', 'inactive');

    const adminEmails = (adminProfiles || [])
      .map((p: any) => p.email)
      .filter((email: string) => Boolean(email));

    if (adminEmails.length > 0) {
      const deptName = (complaint.department as any)?.name || 'General';
      const slaStatus = isAuto ? 'SLA Target Breached' : 'Priority Escalation';

      sendEscalationAlertEmail({
        recipients: adminEmails,
        complaintId: complaint.id,
        referenceNumber: complaint.reference_number,
        customerName: complaint.full_name,
        complaintSubject: complaint.subject,
        priority: complaint.priority,
        departmentName: deptName,
        slaStatus,
        reason: reason || undefined,
      }).catch((emailErr) => {
        console.error('[escalateComplaint Background Email Error]:', emailErr);
      });

      // Record notification activity
      await supabase.from('complaint_activity').insert({
        complaint_id: complaintId,
        actor_type: 'system',
        activity_type: 'escalation_notification_sent',
        metadata: {
          admin_count: adminEmails.length,
          sent_at: nowIso,
        },
      });
    }

    return {
      success: true,
      message: `Complaint ${complaint.reference_number} successfully escalated.`,
      complaintId: complaint.id,
      escalatedAt: nowIso,
    };
  } catch (err) {
    console.error('[escalateComplaint Exception]:', err);
    return { success: false, message: 'Internal error while escalating complaint.' };
  }
}
