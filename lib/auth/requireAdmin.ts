import { redirect } from 'next/navigation';
import { requireStaff } from './requireStaff';
import { StaffMember } from '@/types/staff';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Ensures the authenticated user is an ACTIVE ADMINISTRATOR.
 * Redirects non-admin staff to /staff/dashboard with unauthorized error.
 */
export async function requireAdmin(redirectPath?: string): Promise<{
  user: User;
  profile: StaffMember;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const { user, profile, supabase } = await requireStaff(redirectPath);

  if (profile.role !== 'admin') {
    redirect('/staff/dashboard?error=unauthorized');
  }

  return {
    user,
    profile,
    supabase,
  };
}
