import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { escalateComplaint } from '@/lib/sla/escalation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: complaintId } = await params;
    const supabase = await createClient();

    // 1. Verify authenticated staff user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : null;

    // 2. Perform escalation
    const result = await escalateComplaint(supabase, complaintId, {
      actorId: user.id,
      actorType: 'staff',
      reason,
      isAuto: false,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API Escalate POST Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
