import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComplaintActivity } from '@/lib/activity';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/complaints/[id]/activity
 * Fetches the audit activity timeline for a complaint.
 * Restricted strictly to authenticated staff.
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

    const activity = await getComplaintActivity(id);

    return NextResponse.json({ success: true, activity });
  } catch (err) {
    console.error('[API /api/staff/complaints/[id]/activity GET Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
