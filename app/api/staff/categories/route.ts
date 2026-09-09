import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaffApi, authenticateAdminApi } from '@/lib/auth/apiAuth';
import { getCategories, createCategory } from '@/lib/categories/categories';

export async function GET() {
  try {
    const auth = await authenticateStaffApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const categories = await getCategories(supabase, { includeInactive: true });
    return NextResponse.json({ success: true, categories });
  } catch (err) {
    console.error('[API /api/staff/categories GET Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdminApi();
    if (auth.errorResponse) return auth.errorResponse;
    const { supabase } = auth;

    const body = await request.json().catch(() => ({}));
    const result = await createCategory(supabase, body);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Category created successfully.',
      category: result.data,
    });
  } catch (err) {
    console.error('[API /api/staff/categories POST Error]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
