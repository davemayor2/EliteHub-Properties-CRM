import React from 'react';
import { requireStaff } from '@/lib/auth/requireStaff';
import DashboardHeader from '@/components/staff/DashboardHeader';
import StatsCardGrid from '@/components/staff/StatsCard';
import RecentComplaints from '@/components/staff/RecentComplaints';
import { ComplaintStats, ComplaintRecord } from '@/types/complaint';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | EliteHub Properties Customer Care Staff Portal',
  description: 'Complaint metrics, real-time volume, and recent customer care submissions.',
};

export default async function StaffDashboardPage() {
  // 1. Verify active staff member (redirects to /staff/deactivated if inactive)
  const { user, profile, supabase } = await requireStaff('/staff/dashboard');

  // 3. Fetch complaint statistics and recent complaints concurrently
  const [statsResponse, recentResponse] = await Promise.all([
    // Fetch stats via RPC or direct counts
    supabase.rpc('get_complaint_statistics'),
    // Fetch recent 10 complaints sorted by newest first
    supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const rawStats = statsResponse.data || {};
  const stats: ComplaintStats = {
    total: Number(rawStats.total || 0),
    new: Number(rawStats.new || 0),
    open: Number(rawStats.open || 0),
    pending: Number(rawStats.pending || 0),
    resolved: Number(rawStats.resolved || 0),
    closed: Number(rawStats.closed || 0),
  };

  const recentComplaints: ComplaintRecord[] = (recentResponse.data || []) as ComplaintRecord[];

  return (
    <div className="dashboard-page-container">
      {/* Top Header */}
      <DashboardHeader
        title="Dashboard"
        profile={profile}
      />

      {/* Statistics Cards Grid */}
      <StatsCardGrid stats={stats} />

      {/* Recent Complaints Section */}
      <RecentComplaints complaints={recentComplaints} />
    </div>
  );
}
