import React from 'react';
import { requireStaff } from '@/lib/auth/requireStaff';
import DashboardHeader from '@/components/staff/DashboardHeader';
import ComplaintTable from '@/components/staff/ComplaintTable';
import { ComplaintRecord } from '@/types/complaint';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complaints Directory | EliteHub Properties Staff Portal',
  description: 'Search, filter, and review all customer complaints submitted to EliteHub Properties Customer Care.',
};

export default async function ComplaintsPage() {
  // 1. Verify active staff member (redirects to /staff/deactivated if inactive)
  const { user, profile, supabase } = await requireStaff('/staff/complaints');

  // 3. Fetch all complaints from Supabase
  const { data: complaintsData, error: complaintsError } = await supabase
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false });

  if (complaintsError) {
    console.error('Failed to fetch complaints:', complaintsError);
  }

  const allComplaints: ComplaintRecord[] = (complaintsData || []) as ComplaintRecord[];

  return (
    <div className="complaints-page-container">
      {/* Top Header */}
      <DashboardHeader
        title="Complaints"
        subtitle="Manage, search, and filter incoming customer complaints and inquiries."
        profile={profile}
      />

      {/* Interactive Complaint Table with Search and Filtering */}
      <div className="staff-section-card complaints-directory-card">
        <ComplaintTable initialComplaints={allComplaints} />
      </div>
    </div>
  );
}
