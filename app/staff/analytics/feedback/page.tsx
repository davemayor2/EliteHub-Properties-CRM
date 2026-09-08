import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/requireStaff';
import DashboardHeader from '@/components/staff/DashboardHeader';
import DateRangeFilter from '@/components/staff/analytics/DateRangeFilter';
import { DateRangeOption } from '@/lib/analytics/types';
import { getDateRangeBounds } from '@/lib/analytics/complaints';
import {
  getFeedbackAnalytics,
  getRecentFeedbackComments,
  getLowSatisfactionCases,
} from '@/lib/analytics/feedback';
import {
  Star,
  Smile,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ArrowRight,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customer Feedback & Service Quality | EliteHub CRM',
  description: 'Customer satisfaction ratings, feedback comments, department quality rankings, and low-satisfaction service recovery.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FeedbackAnalyticsPage({ searchParams }: PageProps) {
  const { user, profile, supabase } = await requireStaff('/staff/analytics/feedback');
  const isAdmin = profile.role === 'admin';

  // 1. Parse Date Range
  const resolvedSearchParams = await searchParams;
  const rawRange = resolvedSearchParams?.range;
  const validRanges: DateRangeOption[] = ['today', '7d', '30d', 'month', 'all'];
  const range: DateRangeOption =
    typeof rawRange === 'string' && validRanges.includes(rawRange as DateRangeOption)
      ? (rawRange as DateRangeOption)
      : 'all';

  const { label: rangeLabel } = getDateRangeBounds(range);

  // 2. Fetch feedback analytics concurrently
  const [feedbackMetrics, recentComments, lowSatisfactionCases] = await Promise.all([
    getFeedbackAnalytics(supabase, range),
    getRecentFeedbackComments(supabase, 8),
    getLowSatisfactionCases(supabase, 8),
  ]);

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-page-container command-center-container">
      {/* Page Header */}
      <DashboardHeader
        title="Customer Satisfaction & Quality"
        subtitle="Post-resolution satisfaction scores, customer comments, and service quality measurements."
        profile={profile}
      />

      {/* Date Range Filter Bar */}
      <div className="command-center-filter-row">
        <DateRangeFilter currentRange={range} />
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI 1: Avg Satisfaction Score */}
        <div className="staff-overview-card">
          <div className="overview-card-header">
            <span className="overview-card-label">Average Satisfaction</span>
            <div className="overview-icon-circle icon-circle-gold">
              <Star size={18} />
            </div>
          </div>
          <div className="overview-card-value text-amber-600">
            {feedbackMetrics.avgRatingFormatted}
          </div>
          <p className="overview-card-subtext">
            {feedbackMetrics.totalSubmitted > 0
              ? `Based on ${feedbackMetrics.totalSubmitted} verified rating${feedbackMetrics.totalSubmitted === 1 ? '' : 's'}`
              : 'No responses in selected period'}
          </p>
        </div>

        {/* KPI 2: Customer Satisfaction Rate */}
        <div className="staff-overview-card">
          <div className="overview-card-header">
            <span className="overview-card-label">Satisfaction Rate (4-5★)</span>
            <div className="overview-icon-circle icon-circle-emerald">
              <ThumbsUp size={18} />
            </div>
          </div>
          <div className="overview-card-value text-emerald-600">
            {feedbackMetrics.satisfactionRateFormatted}
          </div>
          <p className="overview-card-subtext">
            Percentage of customers satisfied or very satisfied
          </p>
        </div>

        {/* KPI 3: Survey Response Rate */}
        <div className="staff-overview-card">
          <div className="overview-card-header">
            <span className="overview-card-label">Response Rate</span>
            <div className="overview-icon-circle icon-circle-purple">
              <Smile size={18} />
            </div>
          </div>
          <div className="overview-card-value text-purple-700">
            {feedbackMetrics.responseRateFormatted}
          </div>
          <p className="overview-card-subtext">
            {feedbackMetrics.totalSubmitted} of {feedbackMetrics.totalRequested} surveys completed
          </p>
        </div>

        {/* KPI 4: Low Satisfaction Cases */}
        <div className="staff-overview-card">
          <div className="overview-card-header">
            <span className="overview-card-label">Low Satisfaction (1-2★)</span>
            <div className="overview-icon-circle icon-circle-red">
              <ThumbsDown size={18} />
            </div>
          </div>
          <div className="overview-card-value text-rose-600">
            {feedbackMetrics.lowSatisfactionCount}
          </div>
          <p className="overview-card-subtext">
            {feedbackMetrics.dissatisfactionRateFormatted} dissatisfaction rate
          </p>
        </div>
      </div>

      {/* ROW 2: Satisfaction Distribution & Department Rankings */}
      <div className="command-center-dual-grid mb-6">
        {/* Rating Distribution Card */}
        <div className="staff-section-card" role="region" aria-label="Satisfaction Rating Distribution">
          <div className="section-card-header">
            <div className="flex items-center gap-3">
              <div className="header-icon-pill icon-pill-gold">
                <Star size={18} />
              </div>
              <div>
                <h3 className="section-card-title">Satisfaction Distribution</h3>
                <p className="section-card-subtitle">
                  Customer rating breakdown ({rangeLabel.toLowerCase()})
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {feedbackMetrics.ratingDistribution.map((item) => (
              <div key={item.stars} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 font-bold text-slate-800">{item.stars}★</span>
                    <span className="text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-slate-900 font-bold">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.stars >= 4
                        ? 'bg-emerald-500'
                        : item.stars === 3
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Quality Rankings */}
        <div className="staff-section-card" role="region" aria-label="Department Satisfaction Rankings">
          <div className="section-card-header">
            <div className="flex items-center gap-3">
              <div className="header-icon-pill icon-pill-emerald">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="section-card-title">Department Service Quality</h3>
                <p className="section-card-subtitle">
                  Average resolution satisfaction by department
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            {feedbackMetrics.departmentSatisfaction.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No Department Data Yet</p>
                <p className="text-slate-500 mt-0.5">
                  Satisfaction scores by department will appear as customer feedback is submitted.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackMetrics.departmentSatisfaction.map((dept) => {
                  const isHigh = dept.avgRating >= 4.0;
                  const isMed = dept.avgRating >= 3.0 && dept.avgRating < 4.0;
                  return (
                    <div
                      key={dept.departmentId}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{dept.departmentName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {dept.totalResponses} response{dept.totalResponses === 1 ? '' : 's'} • {dept.satisfiedPercentage}% satisfied
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Star
                          size={14}
                          className={isHigh ? 'fill-emerald-500 text-emerald-500' : isMed ? 'fill-amber-400 text-amber-500' : 'fill-rose-500 text-rose-500'}
                        />
                        <span className={`text-sm font-bold ${isHigh ? 'text-emerald-700' : isMed ? 'text-amber-700' : 'text-rose-700'}`}>
                          {dept.avgRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400">/ 5</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: Low Satisfaction Review Queue */}
      <div id="low-satisfaction" className="staff-section-card border-rose-200/90 mb-6" role="region" aria-label="Low Satisfaction Review Queue">
        <div className="section-card-header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="header-icon-pill icon-pill-red">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="section-card-title">Low Satisfaction Review Queue</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {lowSatisfactionCases.length} Requiring Attention
                  </span>
                </div>
                <p className="section-card-subtitle">
                  Complaints rated 1★ or 2★ for administrative review and service recovery
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          {lowSatisfactionCases.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">No Low Satisfaction Complaints!</p>
              <p className="text-slate-500 mt-0.5">
                All customer satisfaction ratings are currently 3 stars or higher.
              </p>
            </div>
          ) : (
            <div className="table-responsive-container">
              <table className="staff-data-table" aria-label="Low satisfaction complaints table">
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Customer Feedback</th>
                    <th scope="col">Department</th>
                    <th scope="col">Assigned Staff</th>
                    <th scope="col">Submitted</th>
                    <th scope="col" className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowSatisfactionCases.map((c) => (
                    <tr key={c.id} className="bg-rose-50/30">
                      <td>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {c.referenceNumber}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 font-bold text-rose-700 text-xs">
                          <Star size={13} className="fill-rose-500 text-rose-500" />
                          <span>{c.rating} / 5</span>
                        </div>
                      </td>
                      <td>
                        <p className="text-xs text-slate-700 max-w-xs truncate" title={c.comment || 'No comment'}>
                          {c.comment ? `"${c.comment}"` : <span className="italic text-slate-400">No written comment</span>}
                        </p>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600">{c.departmentName || 'General'}</span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600">{c.assignedStaffName || 'Unassigned'}</span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-500">{formatDate(c.submittedAt)}</span>
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/staff/complaints/${c.complaintId}`}
                          className="action-btn action-view inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <Eye size={13} />
                          <span>Review</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ROW 4: Recent Customer Feedback Stream */}
      <div className="staff-section-card" role="region" aria-label="Recent Customer Comments Stream">
        <div className="section-card-header">
          <div className="flex items-center gap-3">
            <div className="header-icon-pill icon-pill-purple">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="section-card-title">Recent Customer Feedback Comments</h3>
              <p className="section-card-subtitle">
                Latest client reactions and thoughts on their complaint resolution
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {recentComments.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              <MessageSquare size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No Customer Comments Yet</p>
              <p className="text-slate-500 mt-0.5">
                Written customer remarks will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentComments.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-xs hover:border-slate-300 transition flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Link
                        href={`/staff/complaints/${item.complaintId}`}
                        className="font-mono text-xs font-bold text-slate-800 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <span>{item.referenceNumber}</span>
                        <ArrowRight size={11} />
                      </Link>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            className={s <= item.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      &ldquo;{item.comment}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-50">
                    <span>{item.departmentName || 'Customer Care'}</span>
                    <span>{formatDate(item.submittedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
