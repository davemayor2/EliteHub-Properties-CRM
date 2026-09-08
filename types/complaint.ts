import { DepartmentRecord } from './department';
import { ComplaintCategoryRecord } from './category';

export type ComplaintStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed';
export type ComplaintPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SenderType = 'staff' | 'customer' | 'system';

export interface ComplaintSubmissionRequest {
  fullName: string;
  email?: string;
  phone: string;
  subject: string;
  description: string;
  categoryId?: string;
}

export interface ComplaintAttachmentRecord {
  id: string;
  complaint_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface ComplaintSubmissionResponse {
  success: boolean;
  referenceNumber?: string;
  id?: string;
  attachmentId?: string;
  attachmentPath?: string;
  message?: string;
  errors?: Record<string, string>;
}

export interface StaffProfileRecord {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'staff';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ComplaintRecord {
  id: string;
  reference_number: string;
  full_name: string;
  email: string | null;
  phone: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assigned_to?: string | null;
  assigned_profile?: StaffProfileRecord | null;
  tracking_token?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  category_id?: string | null;
  department_id?: string | null;
  category?: ComplaintCategoryRecord | null;
  department?: DepartmentRecord | null;
  attachments?: ComplaintAttachmentRecord[];

  // SLA & Escalation fields
  sla_policy_id?: string | null;
  first_response_due_at?: string | null;
  first_responded_at?: string | null;
  resolution_due_at?: string | null;
  is_escalated?: boolean;
  escalated_at?: string | null;
  first_response_sla_breached?: boolean;
  resolution_sla_breached?: boolean;
  sla_warning_sent?: boolean;
  escalation_reason?: string | null;
  sla_policy?: any;

  // Feedback fields
  feedback_requested_at?: string | null;
  feedback_email_sent_at?: string | null;
  feedback?: any;
}

export * from './note';
export * from './activity';
export * from './department';
export * from './category';
export * from './routing';
export * from './sla';
export * from './escalation';
export * from './feedback';

export interface ComplaintMessageRecord {
  id: string;
  complaint_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  sender_profile?: StaffProfileRecord | null;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface SendMessagePayload {
  message: string;
}

export interface CustomerAttachmentView {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface CustomerMessageView {
  id: string;
  sender_type: SenderType;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface CustomerComplaintView {
  reference_number: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  tracking_token: string;
  attachments: CustomerAttachmentView[];
  messages: CustomerMessageView[];
}

export interface ComplaintStats {
  total: number;
  new: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
}

export interface ComplaintFilterOptions {
  searchQuery?: string;
  status?: ComplaintStatus | 'all';
  sortBy?: 'created_at_desc' | 'created_at_asc';
}

export interface ComplaintUpdatePayload {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assigned_to?: string | null;
  category_id?: string | null;
  department_id?: string | null;
}
