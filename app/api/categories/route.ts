import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getActivePublicCategories } from '@/lib/categories/categories';

export async function GET() {
  try {
    const categories = await getActivePublicCategories(supabaseServer);
    return NextResponse.json({ success: true, categories });
  } catch (err) {
    console.error('[API /api/categories GET Error]:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch complaint categories.' },
      { status: 500 }
    );
  }
}
