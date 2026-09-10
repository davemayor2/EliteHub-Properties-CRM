import React from 'react';
import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getTeamMembers } from '@/lib/staff/getTeam';
import DashboardHeader from '@/components/staff/DashboardHeader';
import TeamWorkspace from '@/components/staff/team/TeamWorkspace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Team Management | EliteHub Properties Staff Portal',
  description: 'Manage staff access and administrative roles.',
};

export default async function TeamManagementPage() {
  // Enforce server-side active admin authorization
  const { profile, supabase } = await requireAdmin('/staff/team');

  // Fetch all staff members with complaint assignment metrics and login status
  const team = await getTeamMembers({}, supabase);

  return (
    <div className="team-page-container">
      <DashboardHeader
        title="Team Management"
        subtitle="Manage staff access and administrative roles."
        profile={profile}
      />

      <TeamWorkspace initialTeam={team} />
    </div>
  );
}
