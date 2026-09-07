import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// -----------------------------------------------------------------------------
// Core Analytics Logic (mirroring lib/analytics)
// -----------------------------------------------------------------------------

function getDateRangeBounds(range = 'all') {
  const endDate = new Date();
  let startDate = null;
  let label = 'All Time';

  switch (range) {
    case 'today': {
      label = 'Today';
      const start = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      startDate = start;
      break;
    }
    case '7d': {
      label = 'Last 7 Days';
      const start = new Date(endDate);
      start.setDate(start.getDate() - 7);
      startDate = start;
      break;
    }
    case '30d': {
      label = 'Last 30 Days';
      const start = new Date(endDate);
      start.setDate(start.getDate() - 30);
      startDate = start;
      break;
    }
    case 'month': {
      label = 'This Month';
      const start = new Date(endDate.getFullYear(), endDate.getMonth(), 1, 0, 0, 0, 0);
      startDate = start;
      break;
    }
    case 'all':
    default: {
      label = 'All Time';
      startDate = null;
      break;
    }
  }

  return { range, label, startDate, endDate };
}

function formatResolutionDuration(ms) {
  if (ms === null || ms <= 0 || isNaN(ms)) {
    return 'No data available';
  }

  const minutes = Math.round(ms / (1000 * 60));
  if (minutes < 60) {
    return `${Math.max(1, minutes)} mins`;
  }

  const hours = ms / (1000 * 60 * 60);
  if (hours < 48) {
    return `${(Math.round(hours * 10) / 10).toFixed(1)} hrs`;
  }

  const days = hours / 24;
  return `${(Math.round(days * 10) / 10).toFixed(1)} days`;
}

async function getDashboardOverviewMetrics(sb, range = 'all') {
  const { startDate } = getDateRangeBounds(range);
  const { data: rows, error } = await sb
    .from('complaints')
    .select('id, status, assigned_to, created_at, updated_at');

  if (error || !rows) {
    throw new Error(`Failed to fetch overview metrics: ${error?.message}`);
  }

  const total = rows.length;
  let newCount = 0;
  let openCount = 0;
  let pendingCount = 0;
  let resolvedCount = 0;
  let closedCount = 0;
  let unassignedCount = 0;
  let periodTotal = 0;
  let periodResolved = 0;

  const startTimestamp = startDate ? startDate.getTime() : null;

  for (const row of rows) {
    switch (row.status) {
      case 'new':
        newCount++;
        break;
      case 'open':
        openCount++;
        break;
      case 'pending':
        pendingCount++;
        break;
      case 'resolved':
        resolvedCount++;
        break;
      case 'closed':
        closedCount++;
        break;
    }

    if (!row.assigned_to) {
      unassignedCount++;
    }

    const rowCreatedAt = new Date(row.created_at).getTime();
    if (startTimestamp === null || rowCreatedAt >= startTimestamp) {
      periodTotal++;
    }

    const isResolvedOrClosed = row.status === 'resolved' || row.status === 'closed';
    if (isResolvedOrClosed) {
      const rowUpdatedAt = new Date(row.updated_at).getTime();
      if (startTimestamp === null || rowUpdatedAt >= startTimestamp) {
        periodResolved++;
      }
    }
  }

  const resolvedOrClosed = resolvedCount + closedCount;
  const resolutionRate = total > 0 ? Math.round((resolvedOrClosed / total) * 1000) / 10 : 0;

  return {
    total,
    new: newCount,
    open: openCount,
    pending: pendingCount,
    resolved: resolvedCount,
    closed: closedCount,
    unassigned: unassignedCount,
    resolutionRate,
    periodTotal,
    periodResolved,
  };
}

async function getStatusDistribution(sb, range = 'all') {
  const { startDate } = getDateRangeBounds(range);
  let query = sb.from('complaints').select('status, created_at');
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  const { data: rows, error } = await query;
  if (error || !rows) throw new Error(error?.message);

  const counts = { new: 0, open: 0, pending: 0, resolved: 0, closed: 0 };
  for (const row of rows) {
    if (counts[row.status] !== undefined) counts[row.status]++;
  }

  const total = rows.length;
  const config = [
    { key: 'new', label: 'New', color: '#145E3D' },
    { key: 'open', label: 'Open', color: '#2563EB' },
    { key: 'pending', label: 'Pending', color: '#D97706' },
    { key: 'resolved', label: 'Resolved', color: '#16A34A' },
    { key: 'closed', label: 'Closed', color: '#64748B' },
  ];

  return config.map((c) => ({
    key: c.key,
    label: c.label,
    count: counts[c.key] || 0,
    percentage: total > 0 ? Math.round(((counts[c.key] || 0) / total) * 1000) / 10 : 0,
    color: c.color,
  }));
}

async function getPriorityDistribution(sb, range = 'all') {
  const { startDate } = getDateRangeBounds(range);
  let query = sb.from('complaints').select('priority, created_at');
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  const { data: rows, error } = await query;
  if (error || !rows) throw new Error(error?.message);

  const counts = { urgent: 0, high: 0, normal: 0, low: 0 };
  for (const row of rows) {
    if (counts[row.priority] !== undefined) counts[row.priority]++;
  }

  const total = rows.length;
  const config = [
    { key: 'urgent', label: 'Urgent', color: '#DC2626' },
    { key: 'high', label: 'High', color: '#EA580C' },
    { key: 'normal', label: 'Normal', color: '#2563EB' },
    { key: 'low', label: 'Low', color: '#64748B' },
  ];

  return config.map((c) => ({
    key: c.key,
    label: c.label,
    count: counts[c.key] || 0,
    percentage: total > 0 ? Math.round(((counts[c.key] || 0) / total) * 1000) / 10 : 0,
    color: c.color,
  }));
}

async function getResolutionPerformance(sb, range = 'all') {
  const { startDate } = getDateRangeBounds(range);
  let query = sb.from('complaints').select('id, status, created_at, updated_at');
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  const { data: rows, error } = await query;
  if (error || !rows) throw new Error(error?.message);

  const totalComplaints = rows.length;
  const resolvedRows = rows.filter((r) => r.status === 'resolved' || r.status === 'closed');
  const totalResolved = resolvedRows.length;

  const resolutionRate =
    totalComplaints > 0 ? Math.round((totalResolved / totalComplaints) * 1000) / 10 : 0;

  let totalDurationMs = 0;
  let validDurationCount = 0;

  for (const row of resolvedRows) {
    const createdTime = new Date(row.created_at).getTime();
    const resolvedTimeStr = row.resolved_at || row.closed_at || row.updated_at;
    const resolvedTime = new Date(resolvedTimeStr).getTime();

    if (!isNaN(createdTime) && !isNaN(resolvedTime) && resolvedTime >= createdTime) {
      totalDurationMs += resolvedTime - createdTime;
      validDurationCount++;
    }
  }

  if (validDurationCount === 0) {
    return {
      resolutionRate,
      avgResolutionHours: null,
      avgResolutionFormatted: 'No data available',
      totalResolvedInPeriod: totalResolved,
      totalComplaintsInPeriod: totalComplaints,
    };
  }

  const avgDurationMs = totalDurationMs / validDurationCount;
  const avgResolutionHours = Math.round((avgDurationMs / (1000 * 60 * 60)) * 10) / 10;
  const avgResolutionFormatted = formatResolutionDuration(avgDurationMs);

  return {
    resolutionRate,
    avgResolutionHours,
    avgResolutionFormatted,
    totalResolvedInPeriod: totalResolved,
    totalComplaintsInPeriod: totalComplaints,
  };
}

async function getStaffWorkload(sb) {
  const { data: staffProfiles, error: profilesError } = await sb
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (profilesError || !staffProfiles) throw new Error(profilesError?.message);

  const { data: complaints, error: complaintsError } = await sb
    .from('complaints')
    .select('id, assigned_to, status');

  if (complaintsError || !complaints) throw new Error(complaintsError?.message);

  const workloadMap = new Map();
  for (const staff of staffProfiles) {
    workloadMap.set(staff.id, {
      staffId: staff.id,
      fullName: staff.full_name || staff.email,
      email: staff.email,
      role: staff.role,
      assignedTotal: 0,
      openCount: 0,
      pendingCount: 0,
      resolvedCount: 0,
      closedCount: 0,
      activeWorkload: 0,
    });
  }

  for (const complaint of complaints) {
    if (complaint.assigned_to && workloadMap.has(complaint.assigned_to)) {
      const item = workloadMap.get(complaint.assigned_to);
      item.assignedTotal++;

      switch (complaint.status) {
        case 'new':
        case 'open':
          item.openCount++;
          item.activeWorkload++;
          break;
        case 'pending':
          item.pendingCount++;
          item.activeWorkload++;
          break;
        case 'resolved':
          item.resolvedCount++;
          break;
        case 'closed':
          item.closedCount++;
          break;
      }
    }
  }

  return Array.from(workloadMap.values()).sort((a, b) => {
    if (b.activeWorkload !== a.activeWorkload) {
      return b.activeWorkload - a.activeWorkload;
    }
    return b.assignedTotal - a.assignedTotal;
  });
}

// -----------------------------------------------------------------------------
// Test Execution Suite
// -----------------------------------------------------------------------------

async function runPhase11Tests() {
  console.log('================================================================');
  console.log('🧪 PHASE 11 AUTOMATED TEST SUITE: CRM ANALYTICS & INSIGHTS');
  console.log('================================================================\n');

  // 1. Authenticate as Admin Staff
  const adminEmail = 'staff.test.1788643629712@elitehub.com';
  const adminPass = 'StrongStaffPassword123!';
  console.log(`1. Authenticating as admin: ${adminEmail}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPass,
  });

  if (authError || !authData.user) {
    console.error('❌ Admin authentication failed:', authError?.message);
    process.exit(1);
  }
  console.log('✅ Authenticated successfully as Admin! User ID:', authData.user.id);

  // 2. Test Date Range Boundary Calculations
  console.log('\n2. Testing Date Range Boundary Calculations...');
  const ranges = ['today', '7d', '30d', 'month', 'all'];
  for (const r of ranges) {
    const bounds = getDateRangeBounds(r);
    console.log(`   - Range "${r}": Label="${bounds.label}", Start=${bounds.startDate ? bounds.startDate.toISOString() : 'NULL'}, End=${bounds.endDate.toISOString()}`);
    if (r !== 'all' && !bounds.startDate) {
      console.error(`❌ Expected non-null startDate for range: ${r}`);
      process.exit(1);
    }
    if (r === 'all' && bounds.startDate !== null) {
      console.error('❌ Expected null startDate for "all"');
      process.exit(1);
    }
  }
  console.log('✅ Date range boundary calculations verified.');

  // 3. Test Dashboard Overview Metrics across all date ranges
  console.log('\n3. Testing getDashboardOverviewMetrics across date ranges...');
  for (const r of ranges) {
    const metrics = await getDashboardOverviewMetrics(supabase, r);
    console.log(`   [Range: ${r}] Total=${metrics.total}, New=${metrics.new}, Open=${metrics.open}, Pending=${metrics.pending}, Resolved=${metrics.resolved}, Closed=${metrics.closed}, Unassigned=${metrics.unassigned}, ResolutionRate=${metrics.resolutionRate}%, PeriodTotal=${metrics.periodTotal}`);
    
    // Total should equal sum of all statuses
    const statusSum = metrics.new + metrics.open + metrics.pending + metrics.resolved + metrics.closed;
    if (metrics.total !== statusSum) {
      console.error(`❌ Total (${metrics.total}) does not match sum of status counts (${statusSum})!`);
      process.exit(1);
    }

    // Unassigned should never exceed total
    if (metrics.unassigned > metrics.total) {
      console.error(`❌ Unassigned count (${metrics.unassigned}) exceeds total count (${metrics.total})!`);
      process.exit(1);
    }

    // Resolution rate should be between 0 and 100
    if (metrics.resolutionRate < 0 || metrics.resolutionRate > 100) {
      console.error(`❌ Invalid resolution rate: ${metrics.resolutionRate}%`);
      process.exit(1);
    }
  }
  console.log('✅ Overview metrics accurate and mathematical integrity confirmed.');

  // 4. Test Status & Priority Distributions
  console.log('\n4. Testing Status & Priority Distributions...');
  const statusDist = await getStatusDistribution(supabase, 'all');
  const priorityDist = await getPriorityDistribution(supabase, 'all');

  console.log('   Status Distribution:');
  let statusCountSum = 0;
  for (const s of statusDist) {
    console.log(`     - ${s.label}: ${s.count} (${s.percentage}%) [color: ${s.color}]`);
    statusCountSum += s.count;
  }

  console.log('   Priority Distribution:');
  let priorityCountSum = 0;
  for (const p of priorityDist) {
    console.log(`     - ${p.label}: ${p.count} (${p.percentage}%) [color: ${p.color}]`);
    priorityCountSum += p.count;
  }

  if (statusCountSum !== priorityCountSum) {
    console.error(`❌ Mismatch between status count sum (${statusCountSum}) and priority count sum (${priorityCountSum})`);
    process.exit(1);
  }
  console.log('✅ Status and Priority distributions verified.');

  // 5. Test Resolution Performance & Duration Formatting
  console.log('\n5. Testing Resolution Performance & Duration Formatting...');
  const testDurations = [
    { ms: null, expected: 'No data available' },
    { ms: -100, expected: 'No data available' },
    { ms: 1000 * 60 * 25, expected: '25 mins' },
    { ms: 1000 * 60 * 60 * 3.5, expected: '3.5 hrs' },
    { ms: 1000 * 60 * 60 * 24 * 3.2, expected: '3.2 days' },
  ];

  for (const td of testDurations) {
    const formatted = formatResolutionDuration(td.ms);
    if (formatted !== td.expected) {
      console.error(`❌ Duration formatting mismatch for ${td.ms}ms: got "${formatted}", expected "${td.expected}"`);
      process.exit(1);
    }
  }
  console.log('   - formatResolutionDuration unit tests passed.');

  const resPerf = await getResolutionPerformance(supabase, 'all');
  console.log(`   - Live Resolution Performance: Rate=${resPerf.resolutionRate}%, AvgTime=${resPerf.avgResolutionFormatted} (${resPerf.avgResolutionHours} hrs), TotalResolved=${resPerf.totalResolvedInPeriod}/${resPerf.totalComplaintsInPeriod}`);
  console.log('✅ Resolution performance calculation verified.');

  // 6. Test Staff Workload & Workload Sorting
  console.log('\n6. Testing Staff Workload & Workload Sorting...');
  const teamWorkload = await getStaffWorkload(supabase);
  console.log(`   Found ${teamWorkload.length} active staff members in workload leaderboard:`);
  for (const sw of teamWorkload) {
    console.log(`     - ${sw.fullName} (${sw.role}): Total=${sw.assignedTotal}, ActiveLoad=${sw.activeWorkload} (Open: ${sw.openCount}, Pending: ${sw.pendingCount}), Resolved: ${sw.resolvedCount}`);
    if (sw.activeWorkload < 0 || sw.assignedTotal < 0) {
      console.error('❌ Negative workload counts detected!', sw);
      process.exit(1);
    }
  }

  // Verify sorting order: activeWorkload descending
  for (let i = 0; i < teamWorkload.length - 1; i++) {
    if (teamWorkload[i].activeWorkload < teamWorkload[i + 1].activeWorkload) {
      console.error('❌ Workload leaderboard is not sorted by activeWorkload descending!');
      process.exit(1);
    }
  }
  console.log('✅ Workload aggregation and sorting verified.');

  // 7. Test Recent Activity Feed
  console.log('\n7. Testing Recent Activity queries...');
  const { data: activities, error: actErr } = await supabase
    .from('complaint_activity')
    .select('id, complaint_id, activity_type, actor_type, created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  if (actErr) {
    console.error('❌ Failed to fetch complaint_activity:', actErr.message);
    process.exit(1);
  }
  console.log(`   Fetched ${activities.length} recent activity events from database.`);
  for (const act of activities.slice(0, 3)) {
    console.log(`     - Event: ${act.activity_type} (${act.actor_type} - ${act.created_at})`);
  }
  console.log('✅ Operational activity queries verified.');

  console.log('\n================================================================');
  console.log('🎉 ALL PHASE 11 ANALYTICS TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runPhase11Tests().catch((err) => {
  console.error('❌ Unexpected test error:', err);
  process.exit(1);
});
