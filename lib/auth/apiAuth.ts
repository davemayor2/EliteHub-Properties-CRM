import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StaffMember } from '@/types/staff';
import { User } from '@supabase/supabase-js';

export type ApiAuthSuccess = {
  user: User;
  profile: StaffMember;
  supabase: Awaited<ReturnType<typeof createClient>>;
  errorResponse?: never;
};

export type ApiAuthFailure = {
  user?: never;
  profile?: never;
  supabase?: never;
  errorResponse: NextResponse;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

/**
 * Authenticates that the requesting user is a logged-in, ACTIVE staff member.
 * Returns 401 Unauthorized if no session, or 403 Forbidden if deactivated.
 */
export async function authenticateStaffApi(): Promise<ApiAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'Unauthorized. Valid staff session required.' },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'Unauthorized. Staff profile not found.' },
        { status: 401 }
      ),
    };
  }

  // Strictly block deactivated staff accounts
  if (profile.is_active === false) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'Access denied: Staff account has been deactivated.' },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    profile: profile as StaffMember,
    supabase,
  };
}

/**
 * Authenticates that the requesting user is an ACTIVE ADMINISTRATOR.
 * Returns 401 if unauthenticated, 403 if deactivated or non-admin.
 */
export async function authenticateAdminApi(): Promise<ApiAuthResult> {
  const staffAuth = await authenticateStaffApi();

  if (staffAuth.errorResponse) {
    return staffAuth;
  }

  if (staffAuth.profile.role !== 'admin') {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'Access denied: Administrator privileges required.' },
        { status: 403 }
      ),
    };
  }

  return staffAuth;
}
