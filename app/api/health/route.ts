import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * GET /api/health
 * Lightweight application health check.
 * Verifies system availability and database reachability without exposing sensitive credentials.
 */
export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';

  try {
    // Lightweight database query probe
    const { error } = await supabaseServer
      .from('complaints')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST205') {
      dbStatus = 'degraded';
      console.warn('[Health Check Warning]: Database query failed:', error.message);
    }
  } catch (dbErr) {
    dbStatus = 'unreachable';
    console.error('[Health Check Exception]:', dbErr);
  }

  const responseTimeMs = Date.now() - startTime;
  const isHealthy = dbStatus === 'healthy';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'elitehub-customer-care-crm',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      latencyMs: responseTimeMs,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
