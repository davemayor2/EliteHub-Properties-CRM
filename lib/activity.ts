import { supabaseServer } from '@/lib/supabase/server';
import { ComplaintActivityRecord, LogActivityParams } from '@/types/activity';

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Server-side helper to fetch activity timeline for a complaint.
 * Ordered newest first for internal staff workflow.
 * Joins actor profile and resolves assignee names in metadata so no raw UUIDs are exposed.
 */
export async function getComplaintActivity(complaintId: string): Promise<ComplaintActivityRecord[]> {
  if (!complaintId) return [];

  try {
    let targetId = complaintId;
    if (!isUuid(complaintId)) {
      const { data: refRecord } = await supabaseServer
        .from('complaints')
        .select('id')
        .or(`reference_number.eq.${complaintId},tracking_token.eq.${complaintId}`)
        .maybeSingle();
      if (refRecord?.id) {
        targetId = refRecord.id;
      } else {
        return [];
      }
    }

    const { data, error } = await supabaseServer
      .from('complaint_activity')
      .select(`
        *,
        actor_profile:profiles!complaint_activity_actor_id_fkey(id, full_name, email, role)
      `)
      .eq('complaint_id', targetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[lib/activity getComplaintActivity Error]:', error);
      return [];
    }

    const activities = (data || []) as ComplaintActivityRecord[];

    // Collect all unique assignee UUIDs from metadata to resolve staff names
    const assigneeIds = new Set<string>();
    for (const act of activities) {
      if (act.metadata?.new_assignee && typeof act.metadata.new_assignee === 'string') {
        assigneeIds.add(act.metadata.new_assignee);
      }
      if (act.metadata?.previous_assignee && typeof act.metadata.previous_assignee === 'string') {
        assigneeIds.add(act.metadata.previous_assignee);
      }
    }

    if (assigneeIds.size > 0) {
      const { data: staffProfiles } = await supabaseServer
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(assigneeIds));

      const staffMap = new Map<string, string>();
      if (staffProfiles) {
        for (const staff of staffProfiles) {
          staffMap.set(staff.id, staff.full_name);
        }
      }

      // Enrich metadata with human-readable staff names
      for (const act of activities) {
        if (act.metadata) {
          if (act.metadata.new_assignee && typeof act.metadata.new_assignee === 'string') {
            act.metadata.new_assignee_name = staffMap.get(act.metadata.new_assignee) || 'Staff Member';
          }
          if (act.metadata.previous_assignee && typeof act.metadata.previous_assignee === 'string') {
            act.metadata.previous_assignee_name = staffMap.get(act.metadata.previous_assignee) || 'Staff Member';
          }
        }
      }
    }

    return activities;
  } catch (err) {
    console.error('[lib/activity getComplaintActivity Exception]:', err);
    return [];
  }
}

/**
 * Centralized server-side helper to record an activity event programmatically.
 */
export async function logActivity({
  complaint_id,
  actor_type,
  actor_id = null,
  activity_type,
  metadata = {},
}: LogActivityParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabaseServer
      .from('complaint_activity')
      .insert({
        complaint_id,
        actor_type,
        actor_id,
        activity_type,
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[lib/activity logActivity Error]:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('[lib/activity logActivity Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown server error',
    };
  }
}
