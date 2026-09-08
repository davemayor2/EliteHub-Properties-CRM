import { SupabaseClient } from '@supabase/supabase-js';
import { escalateComplaint } from './escalation';

export interface SlaProcessSummary {
  scannedCount: number;
  firstResponseBreaches: number;
  resolutionBreaches: number;
  warningsSent: number;
  escalationsTriggered: number;
}

/**
 * Scans active complaints for SLA deadline breaches, warning thresholds, and auto-escalations.
 * Completely idempotent: running multiple times never duplicates activity entries or alerts.
 */
export async function processSlaBreaches(
  supabase: SupabaseClient
): Promise<SlaProcessSummary> {
  const summary: SlaProcessSummary = {
    scannedCount: 0,
    firstResponseBreaches: 0,
    resolutionBreaches: 0,
    warningsSent: 0,
    escalationsTriggered: 0,
  };

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Fetch active complaints with SLA targets joined with their policy
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select(`
        id,
        reference_number,
        status,
        created_at,
        first_response_due_at,
        first_responded_at,
        resolution_due_at,
        first_response_sla_breached,
        resolution_sla_breached,
        sla_warning_sent,
        is_escalated,
        sla_policy:sla_policies(id, name, auto_escalate, warning_percentage)
      `)
      .in('status', ['new', 'open', 'pending'])
      .or('first_response_due_at.not.is.null,resolution_due_at.not.is.null');

    if (error) {
      // If table or columns not yet present, exit safely
      if (error.code !== 'PGRST205') {
        console.warn('[processSlaBreaches Warning]:', error.message);
      }
      return summary;
    }

    if (!complaints || complaints.length === 0) {
      return summary;
    }

    summary.scannedCount = complaints.length;

    for (const c of complaints) {
      const policy = Array.isArray(c.sla_policy) ? c.sla_policy[0] : c.sla_policy;
      const autoEscalate = policy?.auto_escalate ?? false;
      const warningThreshold = policy?.warning_percentage || 75;

      let shouldEscalate = false;
      let escalationReason = '';

      // Check A: First Response Overdue
      if (
        c.first_response_due_at &&
        !c.first_responded_at &&
        !c.first_response_sla_breached &&
        new Date(c.first_response_due_at) < now
      ) {
        await supabase
          .from('complaints')
          .update({ first_response_sla_breached: true, updated_at: nowIso })
          .eq('id', c.id);

        await supabase.from('complaint_activity').insert({
          complaint_id: c.id,
          actor_type: 'system',
          activity_type: 'first_response_sla_breached',
          metadata: {
            reference_number: c.reference_number,
            first_response_due_at: c.first_response_due_at,
            breached_at: nowIso,
          },
        });

        summary.firstResponseBreaches++;
        if (autoEscalate && !c.is_escalated) {
          shouldEscalate = true;
          escalationReason = 'First response SLA target breached.';
        }
      }

      // Check B: Resolution Overdue
      if (
        c.resolution_due_at &&
        !c.resolution_sla_breached &&
        new Date(c.resolution_due_at) < now
      ) {
        await supabase
          .from('complaints')
          .update({ resolution_sla_breached: true, updated_at: nowIso })
          .eq('id', c.id);

        await supabase.from('complaint_activity').insert({
          complaint_id: c.id,
          actor_type: 'system',
          activity_type: 'resolution_sla_breached',
          metadata: {
            reference_number: c.reference_number,
            resolution_due_at: c.resolution_due_at,
            breached_at: nowIso,
          },
        });

        summary.resolutionBreaches++;
        if (autoEscalate && !c.is_escalated) {
          shouldEscalate = true;
          escalationReason = 'Resolution SLA target breached.';
        }
      }

      // Check C: Approaching Warning Threshold
      if (!c.sla_warning_sent) {
        const targetDue = (!c.first_responded_at && c.first_response_due_at)
          ? new Date(c.first_response_due_at).getTime()
          : (c.resolution_due_at ? new Date(c.resolution_due_at).getTime() : null);

        const createdTime = new Date(c.created_at).getTime();
        const nowTime = now.getTime();

        if (targetDue && targetDue > createdTime) {
          const totalWindow = targetDue - createdTime;
          const elapsed = nowTime - createdTime;
          const percentElapsed = (elapsed / totalWindow) * 100;

          if (percentElapsed >= warningThreshold && percentElapsed < 100) {
            await supabase
              .from('complaints')
              .update({ sla_warning_sent: true, updated_at: nowIso })
              .eq('id', c.id);

            await supabase.from('complaint_activity').insert({
              complaint_id: c.id,
              actor_type: 'system',
              activity_type: 'sla_warning',
              metadata: {
                reference_number: c.reference_number,
                percent_elapsed: Math.round(percentElapsed),
                warned_at: nowIso,
              },
            });

            summary.warningsSent++;
          }
        }
      }

      // Execute auto-escalation if needed
      if (shouldEscalate && !c.is_escalated) {
        const escResult = await escalateComplaint(supabase, c.id, {
          actorType: 'system',
          isAuto: true,
          reason: escalationReason,
        });
        if (escResult.success && !escResult.alreadyEscalated) {
          summary.escalationsTriggered++;
        }
      }
    }

    return summary;
  } catch (err) {
    console.error('[processSlaBreaches Exception]:', err);
    return summary;
  }
}
