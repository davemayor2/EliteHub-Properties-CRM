import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi, authenticateAdminApi } from '@/lib/auth/apiAuth';
import { updateDepartment, getDepartmentById } from '@/lib/departments/departments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await params;
    const department = await getDepartmentById(supabase, id);
    if (!department) {
      return NextResponse.json({ success: false, message: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, department });
  } catch (err) {
    console.error('[API /api/staff/departments/[id] GET Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const result = await updateDepartment(supabase, id, body);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Department updated successfully.',
      department: result.data,
    });
  } catch (err) {
    console.error('[API /api/staff/departments/[id] PATCH Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
