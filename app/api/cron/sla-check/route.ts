import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processSlaBreaches } from '@/lib/sla/processSlaBreaches';

export async function GET(request: NextRequest) {
  return handleSlaCheck(request);
}

export async function POST(request: NextRequest) {
  return handleSlaCheck(request);
}

async function handleSlaCheck(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authorization:
    // 1. Bearer CRON_SECRET if configured, OR
    // 2. Authenticated staff/admin session
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = false;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Valid credentials or cron secret required.' },
        { status: 401 }
      );
    }

    const summary = await processSlaBreaches(supabase);

    return NextResponse.json({
      success: true,
      message: 'SLA verification cycle completed.',
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (err) {
    console.error('[API /api/cron/sla-check Exception]:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error during SLA check.' },
      { status: 500 }
    );
  }
}
