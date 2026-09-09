import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi, authenticateAdminApi } from '@/lib/auth/apiAuth';
import {
  getDepartmentMembers,
  addStaffToDepartment,
  removeStaffFromDepartment,
} from '@/lib/departments/departments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await params;
    const members = await getDepartmentMembers(supabase, id);
    return NextResponse.json({ success: true, members });
  } catch (err) {
    console.error('[API /api/staff/departments/[id]/members GET Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id: departmentId } = await params;

    const body = await request.json().catch(() => ({}));
    const { staffId } = body;

    if (!staffId) {
      return NextResponse.json(
        { success: false, message: 'staffId is required.' },
        { status: 400 }
      );
    }

    // Ensure staff member exists and is active
    const { data: targetStaff, error: staffErr } = await supabase
      .from('profiles')
      .select('id, is_active')
      .eq('id', staffId)
      .single();

    if (staffErr || !targetStaff || !targetStaff.is_active) {
      return NextResponse.json(
        { success: false, message: 'Selected staff account is inactive or not found.' },
        { status: 400 }
      );
    }

    const result = await addStaffToDepartment(supabase, staffId, departmentId);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member added to department successfully.',
    });
  } catch (err) {
    console.error('[API /api/staff/departments/[id]/members POST Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id: departmentId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json(
        { success: false, message: 'staffId query parameter is required.' },
        { status: 400 }
      );
    }

    const result = await removeStaffFromDepartment(supabase, staffId, departmentId);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member removed from department successfully.',
    });
  } catch (err) {
    console.error('[API /api/staff/departments/[id]/members DELETE Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
