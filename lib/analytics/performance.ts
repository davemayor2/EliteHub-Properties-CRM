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
