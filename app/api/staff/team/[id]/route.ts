import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStaffMemberById } from '@/lib/staff/getTeam';
import { updateStaffMember } from '@/lib/staff/updateStaff';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/team/[id]
 * Retrieves full details and assignment metrics for a specific staff member.
 * Restricted strictly to active administrators.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

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

    const staff = await getStaffMemberById(id);

    if (!staff) {
      return NextResponse.json({ success: false, message: 'Staff member not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, staff });
  } catch (err) {
    console.error('[API /api/staff/team/[id] GET Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/staff/team/[id]
 * Updates full name, role, or active status of a staff member.
 * Enforces all administrative safeguards.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

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

    const result = await updateStaffMember(id, {
      full_name: body.full_name,
      role: body.role,
      is_active: body.is_active,
    });

    if (!result.success || !result.staff) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to update staff member.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, staff: result.staff });
  } catch (err) {
    console.error('[API /api/staff/team/[id] PATCH Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
