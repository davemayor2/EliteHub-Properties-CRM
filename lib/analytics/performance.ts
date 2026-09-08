import { SupabaseClient } from '@supabase/supabase-js';
import { DateRangeOption, ResolutionMetrics } from './types';
import { getDateRangeBounds } from './complaints';

/**
 * Formats a duration in milliseconds into a concise, human-readable string.
 * - Under 1 hour: "X mins"
 * - 1 hour to 48 hours: "X.X hours"
 * - 48 hours or more: "X.X days"
 */
export function formatResolutionDuration(ms: number | null): string {
  if (ms === null || ms <= 0 || isNaN(ms)) {
    return 'No data available';
  }

  const minutes = Math.round(ms / (1000 * 60));
  if (minutes < 60) {
    return `${Math.max(1, minutes)} mins`;
  }

  const hours = ms / (1000 * 60 * 60);
  if (hours < 48) {
    return `${(Math.round(hours * 10) / 10).toFixed(1)} hrs`;
  }

  const days = hours / 24;
  return `${(Math.round(days * 10) / 10).toFixed(1)} days`;
}

/**
 * Calculates resolution rate and average resolution time for the selected date range.
 * Only complaints with status 'resolved' or 'closed' are considered for resolution time.
 * Reopened complaints preserve historical duration if resolved_at was stamped.
 */
export async function getResolutionPerformance(
  supabase: SupabaseClient,
  range: DateRangeOption = 'all'
): Promise<ResolutionMetrics> {
  const { startDate } = getDateRangeBounds(range);

  let query = supabase
    .from('complaints')
    .select('id, status, created_at, updated_at');

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data: rows, error } = await query;
  if (error || !rows || rows.length === 0) {
    return {
      resolutionRate: 0,
      avgResolutionHours: null,
      avgResolutionFormatted: 'No data available',
      totalResolvedInPeriod: 0,
      totalComplaintsInPeriod: 0,
    };
  }

  const totalComplaints = rows.length;
  const resolvedRows = rows.filter((r) => r.status === 'resolved' || r.status === 'closed');
  const totalResolved = resolvedRows.length;

  // Resolution Rate
  const resolutionRate =
    totalComplaints > 0 ? Math.round((totalResolved / totalComplaints) * 1000) / 10 : 0;

  // Calculate resolution durations
  let totalDurationMs = 0;
  let validDurationCount = 0;

  for (const row of resolvedRows) {
    const createdTime = new Date(row.created_at).getTime();
    // Use resolved_at / closed_at if present in record; otherwise fallback to updated_at
    const anyRow = row as any;
    const resolvedTimeStr = anyRow.resolved_at || anyRow.closed_at || anyRow.updated_at;
    const resolvedTime = new Date(resolvedTimeStr).getTime();

    if (!isNaN(createdTime) && !isNaN(resolvedTime) && resolvedTime >= createdTime) {
      const diff = resolvedTime - createdTime;
      // Filter out negative values if any clock anomaly
      if (diff >= 0) {
        totalDurationMs += diff;
        validDurationCount++;
      }
    }
  }

  if (validDurationCount === 0) {
    return {
      resolutionRate,
      avgResolutionHours: null,
      avgResolutionFormatted: 'No data available',
      totalResolvedInPeriod: totalResolved,
      totalComplaintsInPeriod: totalComplaints,
    };
  }

  const avgDurationMs = totalDurationMs / validDurationCount;
  const avgResolutionHours = Math.round((avgDurationMs / (1000 * 60 * 60)) * 10) / 10;
  const avgResolutionFormatted = formatResolutionDuration(avgDurationMs);

  return {
    resolutionRate,
    avgResolutionHours,
    avgResolutionFormatted,
    totalResolvedInPeriod: totalResolved,
    totalComplaintsInPeriod: totalComplaints,
  };
}

export interface SlaPerformanceMetrics {
  totalWithSla: number;
  resolvedWithinSla: number;
  resolvedAfterSla: number;
  complianceRate: number;
  complianceRateFormatted: string;
  overdueCount: number;
  approachingCount: number;
  escalatedCount: number;
  avgFirstResponseHours: number | null;
  avgFirstResponseFormatted: string;
}

/**
 * Computes organization-wide or filtered SLA compliance metrics:
 * - SLA Compliance Rate: Resolved within SLA / Total completed with SLA
 * - Average First Response Time
 * - Overdue, Approaching, and Escalated counts
 */
export async function getSlaPerformanceMetrics(
  supabase: SupabaseClient,
  range: DateRangeOption = 'all'
): Promise<SlaPerformanceMetrics> {
  const { startDate } = getDateRangeBounds(range);

  let query = supabase
    .from('complaints')
    .select(`
      id,
      status,
      created_at,
      first_response_due_at,
      first_responded_at,
      resolution_due_at,
      resolved_at,
      closed_at,
      is_escalated,
      first_response_sla_breached,
      resolution_sla_breached,
      sla_policy_id
    `);

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data: rows, error } = await query;
  if (error || !rows || rows.length === 0) {
    return {
      totalWithSla: 0,
      resolvedWithinSla: 0,
      resolvedAfterSla: 0,
      complianceRate: 100,
      complianceRateFormatted: '100%',
      overdueCount: 0,
      approachingCount: 0,
      escalatedCount: 0,
      avgFirstResponseHours: null,
      avgFirstResponseFormatted: 'No data',
    };
  }

  const now = Date.now();
  let totalWithSla = 0;
  let resolvedWithinSla = 0;
  let resolvedAfterSla = 0;
  let overdueCount = 0;
  let approachingCount = 0;
  let escalatedCount = 0;

  let totalFirstRespMs = 0;
  let firstRespCount = 0;

  for (const r of rows) {
    const hasSla = Boolean(r.sla_policy_id || r.first_response_due_at || r.resolution_due_at);
    if (hasSla) totalWithSla++;

    const isResolved = r.status === 'resolved' || r.status === 'closed';

    // First Response time calculation
    if (r.first_responded_at) {
      const createdTime = new Date(r.created_at).getTime();
      const respTime = new Date(r.first_responded_at).getTime();
      const diffMs = respTime - createdTime;
      if (diffMs >= 0) {
        totalFirstRespMs += diffMs;
        firstRespCount++;
      }
    }

    if (r.is_escalated) {
      escalatedCount++;
    }

    if (isResolved && hasSla) {
      const resDue = r.resolution_due_at ? new Date(r.resolution_due_at).getTime() : null;
      const resAt = r.resolved_at ? new Date(r.resolved_at).getTime() : null;

      const breached = r.resolution_sla_breached || (resDue && resAt && resAt > resDue);
      if (breached) {
        resolvedAfterSla++;
      } else {
        resolvedWithinSla++;
      }
    } else if (!isResolved && hasSla) {
      // Active complaint overdue check
      const resDue = r.resolution_due_at ? new Date(r.resolution_due_at).getTime() : null;
      const firstDue = r.first_response_due_at ? new Date(r.first_response_due_at).getTime() : null;

      const isOverdue =
        (resDue && now > resDue) ||
        (!r.first_responded_at && firstDue && now > firstDue);

      if (isOverdue) {
        overdueCount++;
      } else {
        // Approaching check: 75% elapsed
        const targetDue = (!r.first_responded_at && firstDue) ? firstDue : resDue;
        const createdTime = new Date(r.created_at).getTime();
        if (targetDue && targetDue > createdTime) {
          const percentElapsed = ((now - createdTime) / (targetDue - createdTime)) * 100;
          if (percentElapsed >= 75) {
            approachingCount++;
          }
        }
      }
    }
  }

  const completedSlaTotal = resolvedWithinSla + resolvedAfterSla;
  const complianceRate =
    completedSlaTotal > 0
      ? Math.round((resolvedWithinSla / completedSlaTotal) * 1000) / 10
      : 100;

  const avgFirstRespMs = firstRespCount > 0 ? totalFirstRespMs / firstRespCount : null;
  const avgFirstResponseHours = avgFirstRespMs !== null ? Math.round((avgFirstRespMs / 3600000) * 10) / 10 : null;
  const avgFirstResponseFormatted =
    avgFirstResponseHours !== null ? `${avgFirstResponseHours} hrs` : 'No data';

  return {
    totalWithSla,
    resolvedWithinSla,
    resolvedAfterSla,
    complianceRate,
    complianceRateFormatted: `${complianceRate}%`,
    overdueCount,
    approachingCount,
    escalatedCount,
    avgFirstResponseHours,
    avgFirstResponseFormatted,
  };
}
