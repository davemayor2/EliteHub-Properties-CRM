import { ComplaintRecord } from '@/types/complaint';
import { ComplaintSlaEvaluation, SlaStatus } from '@/types/sla';
import { calculateComplaintAge, formatTimeRemaining } from './calculateDeadlines';

/**
 * Centrally evaluates the live SLA status of a complaint.
 * Ensures consistent display and logic across the workspace, lists, and background checkers.
 */
export function checkSlaStatus(complaint: ComplaintRecord): ComplaintSlaEvaluation {
  const isResolvedOrClosed = complaint.status === 'resolved' || complaint.status === 'closed';
  const now = Date.now();

  const firstResponseDue = complaint.first_response_due_at ? new Date(complaint.first_response_due_at).getTime() : null;
  const resolutionDue = complaint.resolution_due_at ? new Date(complaint.resolution_due_at).getTime() : null;
  const createdTime = new Date(complaint.created_at).getTime();

  // 1. Complaint without SLA targets
  if (!firstResponseDue && !resolutionDue) {
    return {
      status: 'no_sla',
      label: 'No SLA',
      badgeClass: 'badge-sla-none',
      firstResponseStatus: 'not_applicable',
      resolutionStatus: 'not_applicable',
      firstResponseDueAt: null,
      firstRespondedAt: complaint.first_responded_at || null,
      resolutionDueAt: null,
      resolvedAt: complaint.resolved_at || null,
      isEscalated: Boolean(complaint.is_escalated),
      escalatedAt: complaint.escalated_at || null,
      timeRemainingHours: null,
      timeRemainingFormatted: 'No SLA assigned',
      complaintAgeFormatted: calculateComplaintAge(complaint.created_at, complaint.resolved_at),
      policyName: complaint.sla_policy?.name || null,
    };
  }

  // 2. Evaluate First Response Status
  let firstResponseStatus: 'pending' | 'met' | 'breached' | 'not_applicable' = 'not_applicable';
  if (firstResponseDue) {
    if (complaint.first_responded_at) {
      const respondedTime = new Date(complaint.first_responded_at).getTime();
      firstResponseStatus = complaint.first_response_sla_breached || respondedTime > firstResponseDue ? 'breached' : 'met';
    } else {
      firstResponseStatus = now > firstResponseDue ? 'breached' : 'pending';
    }
  }

  // 3. Evaluate Resolution Status
  let resolutionStatus: 'pending' | 'met' | 'breached' | 'not_applicable' = 'not_applicable';
  if (resolutionDue) {
    if (isResolvedOrClosed) {
      const resolvedTime = complaint.resolved_at ? new Date(complaint.resolved_at).getTime() : now;
      resolutionStatus = complaint.resolution_sla_breached || resolvedTime > resolutionDue ? 'breached' : 'met';
    } else {
      resolutionStatus = now > resolutionDue ? 'breached' : 'pending';
    }
  }

  // 4. Time Remaining towards primary pending deadline
  let targetDeadlineIso: string | null = null;
  if (!isResolvedOrClosed) {
    if (firstResponseStatus === 'pending' && complaint.first_response_due_at) {
      targetDeadlineIso = complaint.first_response_due_at;
    } else if (complaint.resolution_due_at) {
      targetDeadlineIso = complaint.resolution_due_at;
    }
  }

  const { hoursRemaining, formatted: timeRemainingFormatted } = formatTimeRemaining(targetDeadlineIso);

  // 5. Derive primary SLA status
  let status: SlaStatus = 'on_track';
  let label = 'On Track';
  let badgeClass = 'badge-sla-ontrack';

  if (isResolvedOrClosed) {
    if (resolutionStatus === 'breached') {
      status = 'resolved_after_sla';
      label = 'Resolved After SLA';
      badgeClass = 'badge-sla-breach';
    } else {
      status = 'resolved_within_sla';
      label = 'Resolved Within SLA';
      badgeClass = 'badge-sla-met';
    }
  } else {
    // Active complaint
    if (firstResponseStatus === 'breached') {
      status = 'first_response_breached';
      label = 'First Response Overdue';
      badgeClass = 'badge-sla-overdue';
    } else if (resolutionStatus === 'breached') {
      status = 'resolution_breached';
      label = 'Resolution Overdue';
      badgeClass = 'badge-sla-overdue';
    } else {
      // Check warning threshold: has 75%+ of the window elapsed?
      const targetDue = (firstResponseStatus === 'pending' && firstResponseDue) ? firstResponseDue : resolutionDue;
      if (targetDue && targetDue > createdTime) {
        const totalWindow = targetDue - createdTime;
        const elapsed = now - createdTime;
        const percentElapsed = (elapsed / totalWindow) * 100;
        const warningThreshold = complaint.sla_policy?.warning_percentage || 75;

        if (percentElapsed >= warningThreshold) {
          status = 'approaching_deadline';
          label = 'Approaching Deadline';
          badgeClass = 'badge-sla-warning';
        } else {
          status = 'on_track';
          label = 'On Track';
          badgeClass = 'badge-sla-ontrack';
        }
      }
    }
  }

  return {
    status,
    label,
    badgeClass,
    firstResponseStatus,
    resolutionStatus,
    firstResponseDueAt: complaint.first_response_due_at || null,
    firstRespondedAt: complaint.first_responded_at || null,
    resolutionDueAt: complaint.resolution_due_at || null,
    resolvedAt: complaint.resolved_at || null,
    isEscalated: Boolean(complaint.is_escalated),
    escalatedAt: complaint.escalated_at || null,
    timeRemainingHours: isResolvedOrClosed ? null : hoursRemaining,
    timeRemainingFormatted,
    complaintAgeFormatted: calculateComplaintAge(complaint.created_at, complaint.resolved_at),
    policyName: complaint.sla_policy?.name || null,
  };
}

export const evaluateComplaintSla = checkSlaStatus;

