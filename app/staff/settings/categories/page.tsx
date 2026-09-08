import React from 'react';
import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import DashboardHeader from '@/components/staff/DashboardHeader';
import CategoryTable from '@/components/staff/categories/CategoryTable';
import { getCategories } from '@/lib/categories/categories';
import { getDepartments } from '@/lib/departments/departments';

export const metadata: Metadata = {
  title: 'Complaint Categories | EliteHub Properties Staff Portal',
  description: 'Manage complaint categories and departmental mappings for customer classification.',
};

export default async function CategoriesSettingsPage() {
  // 1. Verify authenticated admin
  const { user, profile, supabase } = await requireAdmin('/staff/settings/categories');

  // 2. Fetch categories (including inactive) and departments concurrently
  const [categories, departments] = await Promise.all([
    getCategories(supabase, { includeInactive: true }),
    getDepartments(supabase, true),
  ]);

  return (
    <div className="settings-page-container">
      {/* Top Header */}
      <DashboardHeader
        title="Complaint Categories"
        subtitle="Manage the categories customers can select when submitting complaints and map them to departments."
        profile={profile}
      />

      {/* Interactive Categories Management Table */}
      <CategoryTable
        initialCategories={categories}
        departments={departments}
      />
    </div>
  );
}
