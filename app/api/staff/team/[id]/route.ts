import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminApi } from '@/lib/auth/apiAuth';
import { getStaffMemberById } from '@/lib/staff/getTeam';
import { updateStaffMember } from '@/lib/staff/updateStaff';
import { deleteStaffMember } from '@/lib/staff/deleteStaff';

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
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
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
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;

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

/**
 * DELETE /api/staff/team/[id]
 * Permanently deletes a staff member, unassigning active complaints safely.
 * Allows the email address to be cleanly re-invited in the future.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;

    const result = await deleteStaffMember(id, auth.user.id, auth.supabase);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to delete staff member.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member account successfully deleted.',
    });
  } catch (err) {
    console.error('[API /api/staff/team/[id] DELETE Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

