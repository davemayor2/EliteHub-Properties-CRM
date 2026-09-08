import { SupabaseClient } from '@supabase/supabase-js';
import { RecentActivityDisplayItem } from './types';

/**
 * Generates user-friendly description for an activity event.
 */
function formatActivityDescription(
  activityType: string,
  metadata: Record<string, any> = {},
  actorName: string
): string {
  switch (activityType) {
    case 'complaint_created':
      return 'New complaint submitted by customer';
    case 'status_changed':
      return `Status changed from ${metadata.previous_status || 'previous'} to ${metadata.new_status || 'updated'}`;
    case 'priority_changed':
      return `Priority changed to ${metadata.new_priority || 'updated'}`;
    case 'assigned':
      return 'Complaint assigned to staff member';
    case 'unassigned':
      return 'Complaint assignment removed';
    case 'staff_message_sent':
      return `${actorName} sent a reply to customer`;
    case 'customer_message_sent':
      return 'Customer sent a reply';
    case 'internal_note_added':
      return `${actorName} added an internal note`;
    case 'category_changed':
      return `Category changed to ${metadata.new_category_name || 'updated category'}`;
    case 'department_changed':
      return `Department changed to ${metadata.new_department_name || 'updated department'}`;
    case 'auto_assigned':
      return `Auto-assigned to ${metadata.assigned_to_name || metadata.staff_name || actorName}`;
    case 'routing_failed':
      return 'Automatic routing could not find available staff';
    case 'sla_warning':
      return `SLA warning: approaching ${metadata.target_type === 'first_response' ? 'first response' : 'resolution'} deadline`;
    case 'first_response_sla_breached':
      return 'First response SLA deadline breached';
    case 'resolution_sla_breached':
      return 'Resolution SLA deadline breached';
    case 'complaint_auto_escalated':
      return 'Complaint auto-escalated due to breached SLA';
    case 'manual_escalation':
      return `${actorName} manually escalated complaint: ${metadata.reason || 'Escalated to management'}`;
    case 'escalation_notification_sent':
      return `Escalation alerts dispatched to ${metadata.admin_count || 'management'} admins`;
    default:
      return `${activityType.replace(/_/g, ' ')}`;
  }
}

/**
 * Fetches the most recent complaint activities joined with complaint reference and actor details.
 */
export async function getRecentActivity(
  supabase: SupabaseClient,
  limit = 8
): Promise<RecentActivityDisplayItem[]> {
  const { data: rows, error } = await supabase
    .from('complaint_activity')
    .select(`
      id,
      complaint_id,
      activity_type,
      actor_type,
      metadata,
      created_at,
      actor_profile:profiles!complaint_activity_actor_id_fkey(id, full_name, email, role),
      complaint:complaints!complaint_activity_complaint_id_fkey(id, reference_number, subject)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !rows) {
    console.error('[getRecentActivity Error]:', error);
    return [];
  }

  return rows.map((row: any) => {
    const actorName =
      row.actor_type === 'customer'
        ? 'Customer'
        : row.actor_profile?.full_name || (row.actor_type === 'system' ? 'System' : 'Staff');

    const refNumber =
      row.complaint?.reference_number ||
      row.metadata?.reference_number ||
      'EH-Ref';

    const subject = row.complaint?.subject || 'Customer Inquiry';

    return {
      id: row.id,
      complaintId: row.complaint_id,
      referenceNumber: refNumber,
      subject,
      activityType: row.activity_type,
      actorType: row.actor_type as 'staff' | 'customer' | 'system',
      actorName,
      description: formatActivityDescription(row.activity_type, row.metadata || {}, actorName),
      createdAt: row.created_at,
    };
  });
}
