import { StaffProfileRecord } from './complaint';

export type ActivityActorType = 'staff' | 'customer' | 'system';

export type ComplaintActivityType =
  | 'complaint_created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'unassigned'
  | 'staff_message_sent'
  | 'customer_message_sent'
  | 'internal_note_added';

export interface ActivityMetadata {
  previous_status?: string;
  new_status?: string;
  previous_priority?: string;
  new_priority?: string;
  previous_assignee?: string | null;
  new_assignee?: string | null;
  reference_number?: string;
  message_id?: string;
  note_id?: string;
  [key: string]: unknown;
}

export interface ComplaintActivityRecord {
  id: string;
  complaint_id: string;
  actor_type: ActivityActorType;
  actor_id: string | null;
  actor_profile?: StaffProfileRecord | null;
  activity_type: ComplaintActivityType | string;
  metadata: ActivityMetadata | null;
  created_at: string;
}

export interface LogActivityParams {
  complaint_id: string;
  actor_type: ActivityActorType;
  actor_id?: string | null;
  activity_type: ComplaintActivityType | string;
  metadata?: ActivityMetadata;
}
