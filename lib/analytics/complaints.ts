import { SupabaseClient } from '@supabase/supabase-js';
import {
  DateRangeOption,
  DateRangeBounds,
  DashboardOverviewMetrics,
  DistributionItem,
} from './types';

/**
 * Calculates start and end Date boundaries for the selected date range.
 */
export function getDateRangeBounds(range: DateRangeOption = 'all'): DateRangeBounds {
  const endDate = new Date();
  let startDate: Date | null = null;
  let label = 'All Time';

  switch (range) {
    case 'today': {
      label = 'Today';
      const start = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      startDate = start;
      break;
    }
    case '7d': {
      label = 'Last 7 Days';
      const start = new Date(endDate);
      start.setDate(start.getDate() - 7);
      startDate = start;
      break;
    }
    case '30d': {
      label = 'Last 30 Days';
      const start = new Date(endDate);
      start.setDate(start.getDate() - 30);
      startDate = start;
      break;
    }
    case 'month': {
      label = 'This Month';
      const start = new Date(endDate.getFullYear(), endDate.getMonth(), 1, 0, 0, 0, 0);
      startDate = start;
      break;
    }
    case 'all':
    default: {
      label = 'All Time';
      startDate = null;
      break;
    }
  }

  return { range, label, startDate, endDate };
}

/**
 * Fetches high-level dashboard metrics (Row 1 & Row 2).
 * Overview status counts represent current active system state.
 * Period metrics represent volume created/resolved within the selected date range.
 */
export async function getDashboardOverviewMetrics(
  supabase: SupabaseClient,
  range: DateRangeOption = 'all',
  options?: { staffId?: string }
): Promise<DashboardOverviewMetrics> {
  const { startDate } = getDateRangeBounds(range);

  // Fetch all complaints with status, assigned_to, created_at, resolved_at
  let query = supabase.from('complaints').select('id, status, assigned_to, created_at, updated_at');

  if (options?.staffId) {
    query = query.eq('assigned_to', options.staffId);
  }

  const { data: rows, error } = await query;

  if (error || !rows) {
    console.error('[getDashboardOverviewMetrics Error]:', error);
    return {
      total: 0,
      new: 0,
      open: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
      unassigned: 0,
      resolutionRate: 0,
      periodTotal: 0,
      periodResolved: 0,
    };
  }

  const total = rows.length;
  let newCount = 0;
  let openCount = 0;
  let pendingCount = 0;
  let resolvedCount = 0;
  let closedCount = 0;
  let unassignedCount = 0;
  let periodTotal = 0;
  let periodResolved = 0;

  const startTimestamp = startDate ? startDate.getTime() : null;

  for (const row of rows) {
    // Current system status counts
    switch (row.status) {
      case 'new':
        newCount++;
        break;
      case 'open':
        openCount++;
        break;
      case 'pending':
        pendingCount++;
        break;
      case 'resolved':
        resolvedCount++;
        break;
      case 'closed':
        closedCount++;
        break;
    }

    if (!row.assigned_to) {
      unassignedCount++;
    }

    // Period specific volume
    const rowCreatedAt = new Date(row.created_at).getTime();
    if (startTimestamp === null || rowCreatedAt >= startTimestamp) {
      periodTotal++;
    }

    const isResolvedOrClosed = row.status === 'resolved' || row.status === 'closed';
    if (isResolvedOrClosed) {
      const rowUpdatedAt = new Date(row.updated_at).getTime();
      if (startTimestamp === null || rowUpdatedAt >= startTimestamp) {
        periodResolved++;
      }
    }
  }

  // Calculate resolution rate: (resolved + closed) / total * 100
  const resolvedOrClosed = resolvedCount + closedCount;
  const resolutionRate = total > 0 ? Math.round((resolvedOrClosed / total) * 1000) / 10 : 0;

  return {
    total,
    new: newCount,
    open: openCount,
    pending: pendingCount,
    resolved: resolvedCount,
    closed: closedCount,
    unassigned: unassignedCount,
    resolutionRate,
    periodTotal,
    periodResolved,
  };
}

/**
 * Returns complaint status distribution for the selected period.
 */
export async function getStatusDistribution(
  supabase: SupabaseClient,
  range: DateRangeOption = 'all'
): Promise<DistributionItem[]> {
  const { startDate } = getDateRangeBounds(range);

  let query = supabase.from('complaints').select('status, created_at');
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    console.error('[getStatusDistribution Error]:', error);
    return [];
  }

  const counts: Record<string, number> = {
    new: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
  };

  for (const row of rows) {
    if (counts[row.status] !== undefined) {
      counts[row.status]++;
    }
  }

  const total = rows.length;

  const config: { key: string; label: string; color: string; accentBg: string }[] = [
    { key: 'new', label: 'New', color: '#145E3D', accentBg: '#ecfdf5' },
    { key: 'open', label: 'Open', color: '#2563EB', accentBg: '#eff6ff' },
    { key: 'pending', label: 'Pending', color: '#D97706', accentBg: '#fffbeb' },
    { key: 'resolved', label: 'Resolved', color: '#16A34A', accentBg: '#f0fdf4' },
    { key: 'closed', label: 'Closed', color: '#64748B', accentBg: '#f8fafc' },
  ];

  return config.map((c) => {
    const count = counts[c.key] || 0;
    const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return {
      key: c.key,
      label: c.label,
      count,
      percentage,
      color: c.color,
      accentBg: c.accentBg,
    };
  });
}

/**
 * Returns complaint priority distribution for the selected period.
 */
export async function getPriorityDistribution(
  supabase: SupabaseClient,
  range: DateRangeOption = 'all'
): Promise<DistributionItem[]> {
  const { startDate } = getDateRangeBounds(range);

  let query = supabase.from('complaints').select('priority, created_at');
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    console.error('[getPriorityDistribution Error]:', error);
    return [];
  }

  const counts: Record<string, number> = {
    urgent: 0,
    high: 0,
    normal: 0,
    low: 0,
  };

  for (const row of rows) {
    if (counts[row.priority] !== undefined) {
      counts[row.priority]++;
    }
  }

  const total = rows.length;

  const config: { key: string; label: string; color: string; accentBg: string }[] = [
    { key: 'urgent', label: 'Urgent', color: '#DC2626', accentBg: '#fef2f2' },
    { key: 'high', label: 'High', color: '#EA580C', accentBg: '#fff7ed' },
    { key: 'normal', label: 'Normal', color: '#2563EB', accentBg: '#eff6ff' },
    { key: 'low', label: 'Low', color: '#64748B', accentBg: '#f8fafc' },
  ];

  return config.map((c) => {
    const count = counts[c.key] || 0;
    const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return {
      key: c.key,
      label: c.label,
      count,
      percentage,
      color: c.color,
      accentBg: c.accentBg,
    };
  });
}
