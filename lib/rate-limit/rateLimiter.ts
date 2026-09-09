import type { NextRequest } from 'next/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface ClientRateLimitRecord {
  timestamps: number[];
}

// In-memory store: Map<identifier, ClientRateLimitRecord>
const rateLimitStore = new Map<string, ClientRateLimitRecord>();

// Pre-configured rate limits for CRM endpoints
export const RATE_LIMIT_CONFIGS = {
  // Public complaint submission: max 5 complaints per 15 minutes per IP
  complaintSubmission: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  // Public complaint tracking page / token lookup: max 45 requests per minute per IP
  trackingLookup: {
    maxRequests: 45,
    windowMs: 60 * 1000,
  },
  // Customer conversation messages: max 12 messages per 5 minutes per IP
  customerMessages: {
    maxRequests: 12,
    windowMs: 5 * 60 * 1000,
  },
  // Customer feedback submission: max 5 submissions per 15 minutes per IP
  feedbackSubmission: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  // Public attachment signed URL downloads: max 40 requests per 5 minutes per IP
  attachmentDownload: {
    maxRequests: 40,
    windowMs: 5 * 60 * 1000,
  },
} as const;

/**
 * Extracts client IP address safely from standard request headers.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Return first IP if multiple proxies exist
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return '127.0.0.1';
}

/**
 * Checks and updates sliding window rate limit for an identifier (e.g. `complaints:192.168.1.1`).
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTimeMs: number;
} {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetTimeMs = oldestTimestamp + config.windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTimeMs,
    };
  }

  // Record this request
  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: config.maxRequests - record.timestamps.length,
    resetTimeMs: now + config.windowMs,
  };
}

/**
 * Periodic cleanup to prevent unbounded memory growth in long-running node processes.
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    // If no requests in the last 30 minutes, purge entry
    const activeTimestamps = record.timestamps.filter((ts) => ts > now - 30 * 60 * 1000);
    if (activeTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = activeTimestamps;
    }
  }
}

// Run cleanup every 10 minutes if running in a persistent runtime
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(cleanupExpiredEntries, 10 * 60 * 1000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}
