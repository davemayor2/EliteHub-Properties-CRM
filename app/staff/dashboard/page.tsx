import React from 'react';
import { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/requireStaff';
import DashboardHeader from '@/components/staff/DashboardHeader';
import DateRangeFilter from '@/components/staff/analytics/DateRangeFilter';
import OverviewMetricGrid from '@/components/staff/analytics/OverviewMetricGrid';
import ComplaintVolumeChart from '@/components/staff/analytics/ComplaintVolumeChart';
import StatusDistributionCard from '@/components/staff/analytics/StatusDistributionCard';
import PriorityDistributionCard from '@/components/staff/analytics/PriorityDistributionCard';
import ResolutionPerformanceCard from '@/components/staff/analytics/ResolutionPerformanceCard';
import StaffWorkloadCard from '@/components/staff/analytics/StaffWorkloadCard';
import UnassignedAlertBanner from '@/components/staff/analytics/UnassignedAlertBanner';
import RecentComplaintsWidget from '@/components/staff/analytics/RecentComplaintsWidget';
import RecentActivityWidget from '@/components/staff/analytics/RecentActivityWidget';
import SlaPerformanceCard from '@/components/staff/analytics/SlaPerformanceCard';
import NeedsAttentionWidget from '@/components/staff/analytics/NeedsAttentionWidget';
import CustomerSatisfactionCard from '@/components/staff/analytics/CustomerSatisfactionCard';
import {
  DateRangeOption,
  getDateRangeBounds,
  getDashboardOverviewMetrics,
  getComplaintVolumeTrends,
  getStatusDistribution,
  getPriorityDistribution,
  getResolutionPerformance,
  getSlaPerformanceMetrics,
  getFeedbackAnalytics,
  getStaffWorkload,
  getMyWorkload,
  getRecentActivity,
} from '@/lib/analytics';
import { ComplaintRecord } from '@/types/complaint';

export const metadata: Metadata = {
  title: 'Operational Command Center | EliteHub Properties Customer Care',
  description:
    'Live CRM analytics, real-time complaint volume trends, status distributions, team workload, and resolution performance.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StaffDashboardPage({ searchParams }: PageProps) {
  // 1. Verify active staff member (redirects to /staff/deactivated if inactive)
  const { user, profile, supabase } = await requireStaff('/staff/dashboard');
  const isAdmin = profile.role === 'admin';

  // 2. Parse Date Range from searchParams
  const resolvedSearchParams = await searchParams;
  const rawRange = resolvedSearchParams?.range;
  const validRanges: DateRangeOption[] = ['today', '7d', '30d', 'month', 'all'];
  const range: DateRangeOption =
    typeof rawRange === 'string' && validRanges.includes(rawRange as DateRangeOption)
      ? (rawRange as DateRangeOption)
      : 'all';

  const { label: rangeLabel } = getDateRangeBounds(range);

  // 3. Concurrently fetch all operational analytics
  const [
    overviewMetrics,
    volumeTrends,
    statusDist,
    priorityDist,
    resolutionPerf,
    slaPerf,
    feedbackMetrics,
    teamWorkload,
    myWorkload,
    recentComplaintsRes,
    activeComplaintsRes,
    recentActivity,
  ] = await Promise.all([
    getDashboardOverviewMetrics(supabase, range),
    getComplaintVolumeTrends(supabase, range),
    getStatusDistribution(supabase, range),
    getPriorityDistribution(supabase, range),
    getResolutionPerformance(supabase, range),
    getSlaPerformanceMetrics(supabase, range),
    getFeedbackAnalytics(supabase, range),
    isAdmin ? getStaffWorkload(supabase) : Promise.resolve([]),
    !isAdmin ? getMyWorkload(supabase, profile.id) : Promise.resolve(undefined),
    supabase
      .from('complaints')
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        department:departments(id, name, code),
        sla_policy:sla_policies(id, name, first_response_hours, resolution_hours)
      `)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('complaints')
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        department:departments(id, name, code),
        sla_policy:sla_policies(id, name, first_response_hours, resolution_hours)
      `)
      .not('status', 'in', '("resolved","closed")')
      .order('created_at', { ascending: false })
      .limit(50),
    getRecentActivity(supabase, 8),
  ]);

  const recentComplaints = (recentComplaintsRes.data || []) as ComplaintRecord[];
  const activeComplaints = (activeComplaintsRes.data || []) as ComplaintRecord[];

  return (
    <div className="dashboard-page-container command-center-container">
      {/* Top Header with Integrated Timeframe Filter */}
      <DashboardHeader
        title="Operational Command Center"
        subtitle="Real-time analytics, complaint volumes, team workload, and resolution performance."
        profile={profile}
      >
        <DateRangeFilter currentRange={range} />
      </DashboardHeader>

      {/* Operational Alert for Unassigned Complaints (Admins) */}
      {isAdmin && (
        <UnassignedAlertBanner unassignedCount={overviewMetrics.unassigned} />
      )}

      {/* Needs Attention / SLA Queue (if any active cases are overdue or escalated) */}
      <NeedsAttentionWidget complaints={activeComplaints} />

      {/* ROW 1 & ROW 2: Overview Metric Cards */}
      <OverviewMetricGrid
        metrics={overviewMetrics}
        selectedRangeLabel={rangeLabel}
      />

      {/* Service Quality, SLA & Resolution Performance Cards */}
      <div className="command-center-dual-grid">
        <CustomerSatisfactionCard
          metrics={feedbackMetrics}
          selectedRangeLabel={rangeLabel}
        />
        <SlaPerformanceCard
          metrics={slaPerf}
          selectedRangeLabel={rangeLabel}
        />
      </div>

      {/* Resolution Turnaround Speed */}
      <div className="w-full mb-6">
        <ResolutionPerformanceCard
          metrics={resolutionPerf}
          selectedRangeLabel={rangeLabel}
        />
      </div>

      {/* ROW 3: Complaint Volume Trend Chart */}
      <ComplaintVolumeChart
        data={volumeTrends}
        selectedRangeLabel={rangeLabel}
      />

      {/* ROW 4: Status & Priority Distributions */}
      <div className="command-center-dual-grid">
        <StatusDistributionCard
          distribution={statusDist}
          totalComplaints={overviewMetrics.total}
        />
        <PriorityDistributionCard
          distribution={priorityDist}
          totalComplaints={overviewMetrics.total}
        />
      </div>

      {/* ROW 5: Staff Workload */}
      <div className="w-full">
        <StaffWorkloadCard
          isAdmin={isAdmin}
          teamWorkload={teamWorkload}
          myWorkload={myWorkload}
          currentUserId={profile.id}
        />
      </div>

      {/* ROW 6: Recent Complaints & Recent Activity */}
      <div className="command-center-dual-grid align-start">
        <RecentComplaintsWidget complaints={recentComplaints} />
        <RecentActivityWidget activities={recentActivity} />
      </div>
    </div>
  );
}

