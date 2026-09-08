import { SlaPolicyRecord } from '@/types/sla';

export interface CalculatedSlaDeadlines {
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstResponseWarningAt: string;
  resolutionWarningAt: string;
}

/**
 * Calculates first response and resolution deadlines from creation timestamp and SLA policy targets.
 * Standard elapsed hours are used for this MVP.
 */
export function calculateDeadlines(
  createdAt: string | Date,
  policy: Pick<SlaPolicyRecord, 'first_response_hours' | 'resolution_hours' | 'warning_percentage'>
): CalculatedSlaDeadlines {
  const baseTime = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();

  const firstResponseHours = Math.max(1, policy.first_response_hours);
  const resolutionHours = Math.max(1, policy.resolution_hours);
  const warningPercentage = Math.min(100, Math.max(1, policy.warning_percentage || 75));

  const firstResponseMs = firstResponseHours * 3600000;
  const resolutionMs = resolutionHours * 3600000;

  const firstResponseDueMs = baseTime + firstResponseMs;
  const resolutionDueMs = baseTime + resolutionMs;

  const firstResponseWarningMs = baseTime + (firstResponseMs * (warningPercentage / 100));
  const resolutionWarningMs = baseTime + (resolutionMs * (warningPercentage / 100));

  return {
    firstResponseDueAt: new Date(firstResponseDueMs).toISOString(),
    resolutionDueAt: new Date(resolutionDueMs).toISOString(),
    firstResponseWarningAt: new Date(firstResponseWarningMs).toISOString(),
    resolutionWarningAt: new Date(resolutionWarningMs).toISOString(),
  };
}

/**
 * Formats remaining duration into clean, user-friendly text.
 * E.g., "3 hours remaining", "2 days remaining", "Overdue by 45 mins"
 */
export function formatTimeRemaining(targetIso: string | null): {
  isPast: boolean;
  hoursRemaining: number;
  formatted: string;
} {
  if (!targetIso) {
    return { isPast: false, hoursRemaining: 0, formatted: 'No target set' };
  }

  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const isPast = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const hours = absMs / 3600000;
  const minutes = Math.round(absMs / 60000);
  const days = Math.floor(hours / 24);

  let durationText = '';
  if (days >= 2) {
    durationText = `${days} days`;
  } else if (hours >= 1) {
    durationText = `${(Math.round(hours * 10) / 10).toFixed(1)} hours`;
  } else {
    durationText = `${Math.max(1, minutes)} mins`;
  }

  return {
    isPast,
    hoursRemaining: diffMs / 3600000,
    formatted: isPast ? `Overdue by ${durationText}` : `${durationText} remaining`,
  };
}

/**
 * Calculates complaint aging duration from created_at to now or resolved_at.
 */
export function calculateComplaintAge(
  createdAt: string,
  endTime?: string | null
): string {
  try {
    const start = new Date(createdAt).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);

    const hours = diffMs / 3600000;
    const days = Math.floor(hours / 24);
    const remHours = Math.floor(hours % 24);

    if (days >= 2) {
      return `${days} days${remHours > 0 ? `, ${remHours} hrs` : ''}`;
    }
    if (hours >= 1) {
      return `${(Math.round(hours * 10) / 10).toFixed(1)} hours`;
    }
    const minutes = Math.round(diffMs / 60000);
    return `${Math.max(1, minutes)} mins`;
  } catch {
    return 'Unknown';
  }
}
