import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTeamMembers } from '@/lib/staff/getTeam';
import { createStaffMember } from '@/lib/staff/createStaff';
import { StaffRole, StaffStatus } from '@/types/staff';

/**
 * GET /api/staff/team
 * Retrieves the list of staff members with search, role, and status filters.
 * Restricted strictly to active administrators.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated active admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.is_active === false) {
      return NextResponse.json(
        { success: false, message: 'Access denied: Administrator privileges required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = (searchParams.get('role') || 'all') as 'all' | StaffRole;
    const status = (searchParams.get('status') || 'all') as 'all' | StaffStatus;

    const team = await getTeamMembers({ search, role, status });

    return NextResponse.json({ success: true, team });
  } catch (err) {
    console.error('[API /api/staff/team GET Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/staff/team
 * Creates and invites a new staff member.
 * Restricted strictly to active administrators.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated active admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.is_active === false) {
      return NextResponse.json(
        { success: false, message: 'Access denied: Administrator privileges required.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const result = await createStaffMember({
      full_name: body.full_name,
      email: body.email,
      role: body.role || 'staff',
    });

    if (!result.success || !result.staff) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to create staff member.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, staff: result.staff });
  } catch (err) {
    console.error('[API /api/staff/team POST Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
