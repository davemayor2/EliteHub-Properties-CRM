import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi, authenticateAdminApi } from '@/lib/auth/apiAuth';
import { getDepartments, createDepartment } from '@/lib/departments/departments';

export async function GET() {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const departments = await getDepartments(supabase, true);
    return NextResponse.json({ success: true, departments });
  } catch (err) {
    console.error('[API /api/staff/departments GET Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const body = await request.json().catch(() => ({}));
    const result = await createDepartment(supabase, body);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Department created successfully.',
      department: result.data,
    });
  } catch (err) {
    console.error('[API /api/staff/departments POST Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
