import React from 'react';
import { createClient } from '@/lib/supabase/server';
import SidebarWrapper from '@/components/staff/SidebarWrapper';
import { Profile } from '@/types/profile';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If unauthenticated (e.g. on login page), render children directly
  if (!user) {
    return <>{children}</>;
  }

  // Retrieve staff profile and new complaints count for live badge
  const [{ data: profile }, { count: newCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'new'),
  ]);

  // If user profile is deactivated, render children directly without dashboard sidebar
  if (profile?.is_active === false) {
    return <>{children}</>;
  }

  const userProfile: Profile = profile || {
    id: user.id,
    full_name: user.user_metadata?.full_name || 'Staff Member',
    email: user.email || '',
    role: (user.user_metadata?.role as 'admin' | 'staff') || 'staff',
    is_active: profile?.is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <SidebarWrapper profile={userProfile} newComplaintsCount={newCount || 0}>
      {children}
    </SidebarWrapper>
  );
}
