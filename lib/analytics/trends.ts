import { SupabaseClient } from '@supabase/supabase-js';
import { DateRangeOption, TrendDataPoint } from './types';
import { getDateRangeBounds } from './complaints';

/**
 * Generates complaint volume trends over time based on the selected date range.
 * Buckets are pre-filled with 0 counts so that days/intervals with zero complaints
 * still form a complete, accurate time-series graph.
 */
export async function getComplaintVolumeTrends(
  supabase: SupabaseClient,
  range: DateRangeOption = 'all'
): Promise<TrendDataPoint[]> {
  const { startDate, endDate } = getDateRangeBounds(range);

  let query = supabase.from('complaints').select('created_at').order('created_at', { ascending: true });
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    console.error('[getComplaintVolumeTrends Error]:', error);
    return [];
  }

  // 1. TODAY: Hourly 3-hour or 4-hour intervals
  if (range === 'today') {
    const buckets: Record<string, { label: string; count: number }> = {};
    for (let h = 0; h < 24; h += 3) {
      const key = `${String(h).padStart(2, '0')}:00`;
      const label = `${h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}`;
      buckets[key] = { label, count: 0 };
    }

    for (const row of rows) {
      const d = new Date(row.created_at);
      const hour = d.getHours();
      const bucketHour = Math.floor(hour / 3) * 3;
      const key = `${String(bucketHour).padStart(2, '0')}:00`;
      if (buckets[key]) {
        buckets[key].count++;
      }
    }

    return Object.entries(buckets).map(([date, { label, count }]) => ({
      date,
      label,
      count,
    }));
  }

  // 2. LAST 7 DAYS: Daily buckets
  if (range === '7d') {
    const result: TrendDataPoint[] = [];
    const dayMap = new Map<string, number>();

    // Prepopulate 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const isoDay = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      dayMap.set(isoDay, 0);
      result.push({ date: isoDay, label, count: 0 });
    }

    for (const row of rows) {
      const rowDay = new Date(row.created_at).toISOString().split('T')[0];
      if (dayMap.has(rowDay)) {
        dayMap.set(rowDay, (dayMap.get(rowDay) || 0) + 1);
      }
    }

    return result.map((item) => ({
      ...item,
      count: dayMap.get(item.date) || 0,
    }));
  }

  // 3. LAST 30 DAYS: Daily buckets
  if (range === '30d') {
    const result: TrendDataPoint[] = [];
    const dayMap = new Map<string, number>();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const isoDay = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap.set(isoDay, 0);
      result.push({ date: isoDay, label, count: 0 });
    }

    for (const row of rows) {
      const rowDay = new Date(row.created_at).toISOString().split('T')[0];
      if (dayMap.has(rowDay)) {
        dayMap.set(rowDay, (dayMap.get(rowDay) || 0) + 1);
      }
    }

    return result.map((item) => ({
      ...item,
      count: dayMap.get(item.date) || 0,
    }));
  }

  // 4. THIS MONTH: Daily buckets from day 1 to today
  if (range === 'month') {
    const result: TrendDataPoint[] = [];
    const dayMap = new Map<string, number>();
    const currentDay = endDate.getDate();

    for (let day = 1; day <= currentDay; day++) {
      const d = new Date(endDate.getFullYear(), endDate.getMonth(), day);
      const isoDay = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap.set(isoDay, 0);
      result.push({ date: isoDay, label, count: 0 });
    }

    for (const row of rows) {
      const rowDay = new Date(row.created_at).toISOString().split('T')[0];
      if (dayMap.has(rowDay)) {
        dayMap.set(rowDay, (dayMap.get(rowDay) || 0) + 1);
      }
    }

    return result.map((item) => ({
      ...item,
      count: dayMap.get(item.date) || 0,
    }));
  }

  // 5. ALL TIME: Group by month (or recent days if CRM was started recently)
  // If all rows span less than 30 days, show daily points for clean visualization
  if (rows.length > 0) {
    const firstDate = new Date(rows[0].created_at);
    const dayDiff = Math.ceil((endDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff <= 30) {
      // Group by day for the actual range
      const dayMap = new Map<string, number>();
      const result: TrendDataPoint[] = [];

      for (let i = Math.max(dayDiff, 6); i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const isoDay = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayMap.set(isoDay, 0);
        result.push({ date: isoDay, label, count: 0 });
      }

      for (const row of rows) {
        const rowDay = new Date(row.created_at).toISOString().split('T')[0];
        if (dayMap.has(rowDay)) {
          dayMap.set(rowDay, (dayMap.get(rowDay) || 0) + 1);
        }
      }

      return result.map((item) => ({
        ...item,
        count: dayMap.get(item.date) || 0,
      }));
    }
  }

  // Monthly grouping across the past 6 months
  const monthResult: TrendDataPoint[] = [];
  const monthMap = new Map<string, number>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthMap.set(key, 0);
    monthResult.push({ date: key, label, count: 0 });
  }

  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }
  }

  return monthResult.map((item) => ({
    ...item,
    count: monthMap.get(item.date) || 0,
  }));
}
