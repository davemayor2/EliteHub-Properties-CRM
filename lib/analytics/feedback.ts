import { SupabaseClient } from '@supabase/supabase-js';
import { DateRangeOption } from './types';
import { getDateRangeBounds } from './complaints';
import {
  FeedbackAnalyticsMetrics,
  RatingDistributionItem,
  DepartmentSatisfactionItem,
  FeedbackRating,
} from '@/types/feedback';

export interface RecentFeedbackComment {
  id: string;
  complaintId: string;
  referenceNumber: string;
  rating: number;
  comment: string;
  departmentName: string | null;
  submittedAt: string;
}

export interface LowSatisfactionCase {
  id: string;
  complaintId: string;
  referenceNumber: string;
  rating: number;
  comment: string | null;
  departmentName: string | null;
  assignedStaffName: string | null;
  submittedAt: string;
}

/**
 * Calculates organization-wide customer satisfaction analytics and metrics.
 */
export async function getFeedbackAnalytics(
  supabase: SupabaseClient,
  range: DateRangeOption = 'all'
): Promise<FeedbackAnalyticsMetrics> {
  const { startDate } = getDateRangeBounds(range);

  try {
    let query = supabase
      .from('customer_feedback')
      .select(`
        id,
        rating,
        comment,
        submitted_at,
        created_at,
        complaint:complaints!customer_feedback_complaint_id_fkey(
          id,
          reference_number,
          department_id,
          department:departments(id, name)
        )
      `);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: rows, error } = await query;

    if (error || !rows) {
      // Table may not exist yet or no rows
      return getEmptyMetrics();
    }

    const totalRequested = rows.length;
    const submittedRows = rows.filter((r) => r.submitted_at && r.rating !== null);
    const totalSubmitted = submittedRows.length;

    if (totalSubmitted === 0) {
      return {
        ...getEmptyMetrics(),
        totalRequested,
      };
    }

    const responseRate = totalRequested > 0 ? Math.round((totalSubmitted / totalRequested) * 100) : 0;

    // Rating counts for 1, 2, 3, 4, 5
    const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRatings = 0;
    let satisfiedCount = 0; // 4 or 5
    let dissatisfiedCount = 0; // 1 or 2

    // Department grouping: { deptId: { name, sum, count, satisfiedCount } }
    const deptMap: Record<string, { name: string; sum: number; count: number; satisfiedCount: number }> = {};

    for (const row of submittedRows) {
      const r = Number(row.rating);
      if (r >= 1 && r <= 5) {
        starCounts[r] = (starCounts[r] || 0) + 1;
        sumRatings += r;

        if (r >= 4) satisfiedCount++;
        if (r <= 2) dissatisfiedCount++;

        // Department tracking
        const complaint = row.complaint as any;
        const deptId = complaint?.department_id || 'unassigned';
        const deptName = complaint?.department?.name || 'Unassigned / General';

        if (!deptMap[deptId]) {
          deptMap[deptId] = { name: deptName, sum: 0, count: 0, satisfiedCount: 0 };
        }
        deptMap[deptId].sum += r;
        deptMap[deptId].count += 1;
        if (r >= 4) deptMap[deptId].satisfiedCount += 1;
      }
    }

    const avgRating = Math.round((sumRatings / totalSubmitted) * 10) / 10;
    const satisfactionRate = Math.round((satisfiedCount / totalSubmitted) * 100);
    const dissatisfactionRate = Math.round((dissatisfiedCount / totalSubmitted) * 100);

    // Build distribution array: 5 down to 1
    const ratingLabels: Record<number, string> = {
      5: 'Very Satisfied',
      4: 'Satisfied',
      3: 'Neutral',
      2: 'Dissatisfied',
      1: 'Very Dissatisfied',
    };

    const ratingDistribution: RatingDistributionItem[] = [5, 4, 3, 2, 1].map((stars) => {
      const count = starCounts[stars] || 0;
      const percentage = totalSubmitted > 0 ? Math.round((count / totalSubmitted) * 100) : 0;
      return {
        stars: stars as FeedbackRating,
        label: ratingLabels[stars],
        count,
        percentage,
      };
    });

    // Build department satisfaction array
    const departmentSatisfaction: DepartmentSatisfactionItem[] = Object.entries(deptMap)
      .filter(([_, d]) => d.count > 0)
      .map(([id, d]) => ({
        departmentId: id,
        departmentName: d.name,
        avgRating: Math.round((d.sum / d.count) * 10) / 10,
        totalResponses: d.count,
        satisfiedPercentage: Math.round((d.satisfiedCount / d.count) * 100),
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    return {
      totalRequested,
      totalSubmitted,
      responseRate,
      responseRateFormatted: `${responseRate}%`,
      avgRating,
      avgRatingFormatted: `${avgRating.toFixed(1)} / 5`,
      satisfactionRate,
      satisfactionRateFormatted: `${satisfactionRate}%`,
      dissatisfactionRate,
      dissatisfactionRateFormatted: `${dissatisfactionRate}%`,
      lowSatisfactionCount: dissatisfiedCount,
      ratingDistribution,
      departmentSatisfaction,
    };
  } catch (err) {
    console.error('[getFeedbackAnalytics Exception]:', err);
    return getEmptyMetrics();
  }
}

/**
 * Fetches recent customer comments for display in feedback analytics.
 */
export async function getRecentFeedbackComments(
  supabase: SupabaseClient,
  limit = 6
): Promise<RecentFeedbackComment[]> {
  try {
    const { data: rows, error } = await supabase
      .from('customer_feedback')
      .select(`
        id,
        complaint_id,
        rating,
        comment,
        submitted_at,
        complaint:complaints!customer_feedback_complaint_id_fkey(
          id,
          reference_number,
          department:departments(name)
        )
      `)
      .not('submitted_at', 'is', null)
      .not('comment', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error || !rows) return [];

    return rows
      .filter((r) => r.comment && r.comment.trim().length > 0)
      .map((r: any) => ({
        id: r.id,
        complaintId: r.complaint_id,
        referenceNumber: r.complaint?.reference_number || 'EH-Ref',
        rating: Number(r.rating) || 5,
        comment: r.comment,
        departmentName: r.complaint?.department?.name || null,
        submittedAt: r.submitted_at,
      }));
  } catch (err) {
    console.error('[getRecentFeedbackComments Exception]:', err);
    return [];
  }
}

/**
 * Fetches low satisfaction cases (ratings 1 or 2) for administrative review.
 */
export async function getLowSatisfactionCases(
  supabase: SupabaseClient,
  limit = 8
): Promise<LowSatisfactionCase[]> {
  try {
    const { data: rows, error } = await supabase
      .from('customer_feedback')
      .select(`
        id,
        complaint_id,
        rating,
        comment,
        submitted_at,
        complaint:complaints!customer_feedback_complaint_id_fkey(
          id,
          reference_number,
          department:departments(name),
          assigned_profile:profiles!complaints_assigned_to_fkey(full_name)
        )
      `)
      .not('submitted_at', 'is', null)
      .lte('rating', 2)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error || !rows) return [];

    return rows.map((r: any) => ({
      id: r.id,
      complaintId: r.complaint_id,
      referenceNumber: r.complaint?.reference_number || 'EH-Ref',
      rating: Number(r.rating) || 1,
      comment: r.comment || null,
      departmentName: r.complaint?.department?.name || null,
      assignedStaffName: r.complaint?.assigned_profile?.full_name || null,
      submittedAt: r.submitted_at,
    }));
  } catch (err) {
    console.error('[getLowSatisfactionCases Exception]:', err);
    return [];
  }
}

function getEmptyMetrics(): FeedbackAnalyticsMetrics {
  return {
    totalRequested: 0,
    totalSubmitted: 0,
    responseRate: 0,
    responseRateFormatted: '0%',
    avgRating: null,
    avgRatingFormatted: 'No data',
    satisfactionRate: 0,
    satisfactionRateFormatted: '0%',
    dissatisfactionRate: 0,
    dissatisfactionRateFormatted: '0%',
    lowSatisfactionCount: 0,
    ratingDistribution: [
      { stars: 5, label: 'Very Satisfied', count: 0, percentage: 0 },
      { stars: 4, label: 'Satisfied', count: 0, percentage: 0 },
      { stars: 3, label: 'Neutral', count: 0, percentage: 0 },
      { stars: 2, label: 'Dissatisfied', count: 0, percentage: 0 },
      { stars: 1, label: 'Very Dissatisfied', count: 0, percentage: 0 },
    ],
    departmentSatisfaction: [],
  };
}
