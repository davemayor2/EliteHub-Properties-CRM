/**
 * Automated Verification Script for Phase 16: Production Hardening, Security Audit & Performance Optimization
 * 
 * Verifies:
 * 1. Centralized API authentication & inactive staff lockout.
 * 2. Sliding window rate limiting functionality.
 * 3. Bot honeypot & timing defense mechanism.
 * 4. OWASP security headers in next.config.mjs.
 * 5. Application health check endpoint.
 * 6. Error boundaries, loading states, and 404 pages.
 * 7. Database index and RLS SQL migration.
 * 8. Centralized date formatting utilities.
 * 9. Front-end complaint table pagination.
 * 10. Production, security, and performance checklists.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { checkRateLimit } from '../lib/rate-limit/rateLimiter.ts';
import { formatDate, formatDateTime, formatRelativeTime, formatDurationHours } from '../lib/utils/date.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== PHASE 16: PRODUCTION HARDENING & SECURITY AUDIT TEST SUITE ===\n');

// -------------------------------------------------------------
// Test Group 1: API Authentication & Inactive Staff Lockout
// -------------------------------------------------------------
console.log('--- 1. API Authentication & Authorization Helpers ---');

const apiAuthPath = resolve('lib/auth/apiAuth.ts');
assert(existsSync(apiAuthPath), 'lib/auth/apiAuth.ts exists');
const apiAuthContent = readFileSync(apiAuthPath, 'utf8');

assert(apiAuthContent.includes('authenticateStaffApi'), 'authenticateStaffApi is exported');
assert(apiAuthContent.includes('authenticateAdminApi'), 'authenticateAdminApi is exported');
assert(apiAuthContent.includes('is_active === false'), 'Deactivated staff check is enforced');
assert(apiAuthContent.includes('role !== \'admin\''), 'Admin role check is enforced');

// Verify staff routes use authenticateStaffApi or authenticateAdminApi
const staffRoutesToCheck = [
  'app/api/staff/complaints/[id]/route.ts',
  'app/api/staff/complaints/[id]/activity/route.ts',
  'app/api/staff/complaints/[id]/messages/route.ts',
  'app/api/staff/complaints/[id]/notes/route.ts',
  'app/api/staff/complaints/[id]/escalate/route.ts',
  'app/api/staff/complaints/[id]/attachments/[attachmentId]/route.ts',
  'app/api/staff/complaints/[id]/attachments/[attachmentId]/url/route.ts',
  'app/api/staff/team/route.ts',
  'app/api/staff/team/[id]/route.ts',
  'app/api/staff/departments/route.ts',
  'app/api/staff/departments/[id]/route.ts',
  'app/api/staff/departments/[id]/members/route.ts',
  'app/api/staff/categories/route.ts',
  'app/api/staff/categories/[id]/route.ts',
  'app/api/staff/sla-policies/route.ts',
  'app/api/staff/sla-policies/[id]/route.ts',
  'app/api/cron/sla-check/route.ts',
];

for (const routeRel of staffRoutesToCheck) {
  const fullPath = resolve(routeRel);
  assert(existsSync(fullPath), `Route exists: ${routeRel}`);
  const content = readFileSync(fullPath, 'utf8');
  const usesAuth = content.includes('authenticateStaffApi') || 
                   content.includes('authenticateAdminApi') || 
                   content.includes('is_active');
  assert(usesAuth, `${routeRel} enforces active staff or admin authorization`);
}

// -------------------------------------------------------------
// Test Group 2: In-Memory Sliding Window Rate Limiting
// -------------------------------------------------------------
console.log('\n--- 2. Sliding Window Rate Limiting Engine ---');

const rateLimitPath = resolve('lib/rate-limit/rateLimiter.ts');
assert(existsSync(rateLimitPath), 'lib/rate-limit/rateLimiter.ts exists');

// Direct unit test of rate limiter
const testKey = `test:ip:${Date.now()}`;
const testConfig = { maxRequests: 3, windowMs: 1000 };

const r1 = checkRateLimit(testKey, testConfig);
assert(r1.allowed === true && r1.remaining === 2, 'Rate limiter allows 1st request');
const r2 = checkRateLimit(testKey, testConfig);
assert(r2.allowed === true && r2.remaining === 1, 'Rate limiter allows 2nd request');
const r3 = checkRateLimit(testKey, testConfig);
assert(r3.allowed === true && r3.remaining === 0, 'Rate limiter allows 3rd request');
const r4 = checkRateLimit(testKey, testConfig);
assert(r4.allowed === false && r4.remaining === 0, 'Rate limiter blocks 4th request (limit exceeded)');

// -------------------------------------------------------------
// Test Group 3: Bot Honeypot & Anti-Spam Protection
// -------------------------------------------------------------
console.log('\n--- 3. Anti-Spam & Bot Honeypot ---');

const complaintFormPath = resolve('components/ComplaintForm.tsx');
assert(existsSync(complaintFormPath), 'components/ComplaintForm.tsx exists');
const formContent = readFileSync(complaintFormPath, 'utf8');
assert(formContent.includes('name="website"'), 'ComplaintForm contains hidden website honeypot input');
assert(formContent.includes('formRenderTime'), 'ComplaintForm tracks formRenderTime');

const complaintRoutePath = resolve('app/api/complaints/route.ts');
const complaintRouteContent = readFileSync(complaintRoutePath, 'utf8');
assert(complaintRouteContent.includes('honeypot && honeypot.trim()'), 'Complaints API verifies honeypot is empty');
assert(complaintRouteContent.includes('renderTime && Date.now() - renderTime < 1200'), 'Complaints API rejects inhumanly rapid bot submissions');
assert(complaintRouteContent.includes('complaintSubmission'), 'Complaints API enforces rate limiting');

// -------------------------------------------------------------
// Test Group 4: OWASP Security Headers
// -------------------------------------------------------------
console.log('\n--- 4. HTTP Security Headers in next.config.mjs ---');

const nextConfigPath = resolve('next.config.mjs');
assert(existsSync(nextConfigPath), 'next.config.mjs exists');
const nextConfigContent = readFileSync(nextConfigPath, 'utf8');

assert(nextConfigContent.includes('X-Frame-Options') && nextConfigContent.includes('DENY'), 'X-Frame-Options: DENY is configured');
assert(nextConfigContent.includes('X-Content-Type-Options') && nextConfigContent.includes('nosniff'), 'X-Content-Type-Options: nosniff is configured');
assert(nextConfigContent.includes('Referrer-Policy'), 'Referrer-Policy header is configured');
assert(nextConfigContent.includes('Permissions-Policy'), 'Permissions-Policy header is configured');

// -------------------------------------------------------------
// Test Group 5: Health Check Endpoint
// -------------------------------------------------------------
console.log('\n--- 5. Health Check Endpoint ---');

const healthPath = resolve('app/api/health/route.ts');
assert(existsSync(healthPath), 'app/api/health/route.ts exists');
const healthContent = readFileSync(healthPath, 'utf8');
assert(healthContent.includes('status: isHealthy ? \'ok\' : \'degraded\''), 'Health check reports status ok/degraded');
assert(healthContent.includes('database: dbStatus'), 'Health check checks database reachability');

// -------------------------------------------------------------
// Test Group 6: Error Boundaries & 404 / Loading States
// -------------------------------------------------------------
console.log('\n--- 6. Error Boundaries & UX Resilience ---');

assert(existsSync(resolve('app/error.tsx')), 'app/error.tsx exists');
assert(existsSync(resolve('app/not-found.tsx')), 'app/not-found.tsx exists');
assert(existsSync(resolve('app/loading.tsx')), 'app/loading.tsx exists');
assert(existsSync(resolve('app/staff/error.tsx')), 'app/staff/error.tsx exists');
assert(existsSync(resolve('app/staff/loading.tsx')), 'app/staff/loading.tsx exists');

// -------------------------------------------------------------
// Test Group 7: Performance Indexes & Database Hardening SQL
// -------------------------------------------------------------
console.log('\n--- 7. Database Migration & RLS Audit ---');

const migrationPath = resolve('supabase/migrations/20260909120000_phase16_production_hardening.sql');
assert(existsSync(migrationPath), 'Phase 16 production hardening SQL exists');
const migrationContent = readFileSync(migrationPath, 'utf8');

assert(migrationContent.includes('idx_complaints_status_created_at'), 'Compound index on status + created_at created');
assert(migrationContent.includes('idx_complaints_assigned_status'), 'Index on assigned_to + status created');
assert(migrationContent.includes('idx_complaints_resolution_due_active'), 'Partial index on resolution_due_at created');
assert(migrationContent.includes('idx_complaints_first_response_due_active'), 'Partial index on first_response_due_at created');
assert(migrationContent.includes('ENABLE ROW LEVEL SECURITY'), 'RLS enabled across all tables');
assert(migrationContent.includes('Deny anonymous access to internal notes'), 'Anonymous access strictly denied to internal notes');

// -------------------------------------------------------------
// Test Group 8: Centralized Date Utilities
// -------------------------------------------------------------
console.log('\n--- 8. Centralized Date Formatting ---');

const dStr = '2026-09-09T14:30:00.000Z';
const formattedDate = formatDate(dStr);
assert(formattedDate.includes('Sep 9, 2026'), `formatDate outputs "Sep 9, 2026" (got: ${formattedDate})`);

const formattedDateTime = formatDateTime(dStr);
assert(formattedDateTime.includes('Sep 9, 2026'), `formatDateTime outputs date and time (got: ${formattedDateTime})`);

const relNow = formatRelativeTime(new Date().toISOString());
assert(relNow === 'Just now', `formatRelativeTime for now outputs "Just now" (got: ${relNow})`);

const duration = formatDurationHours(48);
assert(duration === '48h 00m', `formatDurationHours(48) outputs "48h 00m" (got: ${duration})`);

// -------------------------------------------------------------
// Test Group 9: Complaint Table Pagination
// -------------------------------------------------------------
console.log('\n--- 9. Complaint Table Pagination ---');

const tablePath = resolve('components/staff/ComplaintTable.tsx');
assert(existsSync(tablePath), 'components/staff/ComplaintTable.tsx exists');
const tableContent = readFileSync(tablePath, 'utf8');
assert(tableContent.includes('PAGE_SIZE = 25'), 'Page size set to 25');
assert(tableContent.includes('paginatedComplaints'), 'paginatedComplaints slice computed');
assert(tableContent.includes('table-pagination-controls'), 'Pagination controls rendered');

// -------------------------------------------------------------
// Test Group 10: Production Documentation Checklists
// -------------------------------------------------------------
console.log('\n--- 10. Production Documentation Checklists ---');

assert(existsSync(resolve('docs/PRODUCTION_CHECKLIST.md')), 'docs/PRODUCTION_CHECKLIST.md exists');
assert(existsSync(resolve('docs/SECURITY_CHECKLIST.md')), 'docs/SECURITY_CHECKLIST.md exists');
assert(existsSync(resolve('docs/PERFORMANCE_CHECKLIST.md')), 'docs/PERFORMANCE_CHECKLIST.md exists');

const envExamplePath = resolve('.env.example');
const envExampleContent = readFileSync(envExamplePath, 'utf8');
assert(envExampleContent.includes('CRON_SECRET'), '.env.example documents CRON_SECRET');

// Summary
console.log('\n=============================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('=============================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 16 PRODUCTION HARDENING CHECKS PASSED!\n');
}
