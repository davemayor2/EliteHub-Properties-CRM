import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi, authenticateAdminApi } from '@/lib/auth/apiAuth';
import { updateCategory, getCategoryById } from '@/lib/categories/categories';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const { id } = await params;
    const category = await getCategoryById(supabase, id);
    if (!category) {
      return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, category });
  } catch (err) {
    console.error('[API /api/staff/categories/[id] GET Error]:', err);
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
    const result = await updateCategory(supabase, id, body);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully.',
      category: result.data,
    });
  } catch (err) {
    console.error('[API /api/staff/categories/[id] PATCH Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
