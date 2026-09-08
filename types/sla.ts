import { ComplaintPriority } from './complaint';

export interface SlaPolicyRecord {
  id: string;
  name: string;
  description: string | null;
  priority: ComplaintPriority | null;
  department_id: string | null;
  first_response_hours: number;
  resolution_hours: number;
  warning_percentage: number;
  auto_escalate: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface SlaPolicyPayload {
  name: string;
  description?: string | null;
  priority?: ComplaintPriority | null;
  department_id?: string | null;
  first_response_hours: number;
  resolution_hours: number;
  warning_percentage?: number;
  auto_escalate?: boolean;
  is_active?: boolean;
}

export type SlaStatus =
  | 'no_sla'
  | 'on_track'
  | 'approaching_deadline'
  | 'overdue'
  | 'first_response_breached'
  | 'resolution_breached'
  | 'resolved_within_sla'
  | 'resolved_after_sla';

export interface ComplaintSlaEvaluation {
  status: SlaStatus;
  label: string;
  badgeClass: string;
  firstResponseStatus: 'pending' | 'met' | 'breached' | 'not_applicable';
  resolutionStatus: 'pending' | 'met' | 'breached' | 'not_applicable';
  firstResponseDueAt: string | null;
  firstRespondedAt: string | null;
  resolutionDueAt: string | null;
  resolvedAt: string | null;
  isEscalated: boolean;
  escalatedAt: string | null;
  timeRemainingHours: number | null;
  timeRemainingFormatted: string;
  complaintAgeFormatted: string;
  policyName?: string | null;
}

export interface SlaMetrics {
  totalWithSla: number;
  resolvedWithinSla: number;
  complianceRate: number; // 0 - 100
  overdueCount: number;
  approachingCount: number;
  escalatedCount: number;
  avgFirstResponseHours: number | null;
  avgFirstResponseFormatted: string;
}
