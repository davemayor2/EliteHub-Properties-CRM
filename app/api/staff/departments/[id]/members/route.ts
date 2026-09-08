import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const members = await getDepartmentMembers(supabase, id);
    return NextResponse.json({ success: true, members });
  } catch (err) {
    console.error('[API /api/staff/departments/[id]/members GET Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: departmentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || !profile.is_active) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required.' },
        { status: 403 }
      );
    }

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
    const { id: departmentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || !profile.is_active) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required.' },
        { status: 403 }
      );
    }

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
