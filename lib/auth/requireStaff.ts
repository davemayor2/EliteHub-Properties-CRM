import { redirect } from 'next/navigation';
import { requireUser } from './requireUser';
import { StaffMember } from '@/types/staff';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Ensures the authenticated user has a valid and ACTIVE staff profile.
 * If user is deactivated, redirects to /staff/deactivated.
 */
export async function requireStaff(redirectPath?: string): Promise<{
  user: User;
  profile: StaffMember;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const { user, supabase } = await requireUser(redirectPath);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    redirect('/staff/login?error=profile_not_found');
  }

  // Deactivated user check
  if (profile.is_active === false) {
    redirect('/staff/deactivated');
  }

  return {
    user,
    profile: profile as StaffMember,
    supabase,
  };
}
