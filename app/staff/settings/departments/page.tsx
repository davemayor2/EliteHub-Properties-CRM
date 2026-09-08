import React from 'react';
import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import DashboardHeader from '@/components/staff/DashboardHeader';
import DepartmentTable from '@/components/staff/departments/DepartmentTable';
import { getDepartments } from '@/lib/departments/departments';
import { StaffProfileRecord } from '@/types/complaint';

export const metadata: Metadata = {
  title: 'Departments | EliteHub Properties Staff Portal',
  description: 'Manage departments responsible for handling customer complaints and automated routing.',
};

export default async function DepartmentsSettingsPage() {
  // 1. Verify authenticated admin (redirects to /staff/dashboard if not an active admin)
  const { user, profile, supabase } = await requireAdmin('/staff/settings/departments');

  // 2. Fetch departments and active staff concurrently
  const [departments, staffResponse] = await Promise.all([
    getDepartments(supabase, true),
    supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .order('full_name', { ascending: true }),
  ]);

  const allStaff: StaffProfileRecord[] = (staffResponse.data || []) as StaffProfileRecord[];

  return (
    <div className="settings-page-container">
      {/* Top Header */}
      <DashboardHeader
        title="Departments"
        subtitle="Manage departments responsible for handling customer complaints and intelligent routing."
        profile={profile}
      />

      {/* Interactive Departments Management Table */}
      <DepartmentTable
        initialDepartments={departments}
        allStaff={allStaff}
      />
    </div>
  );
}
