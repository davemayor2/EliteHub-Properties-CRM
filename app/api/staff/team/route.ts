import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminApi } from '@/lib/auth/apiAuth';
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
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;

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
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;

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
