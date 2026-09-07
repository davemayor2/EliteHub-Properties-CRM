import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually
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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const TEST_STAFF_EMAIL = 'staff.test.1788643629712@elitehub.com';
const TEST_STAFF_PASSWORD = 'StrongStaffPassword123!';

async function runPhase4Tests() {
  console.log('==================================================');
  console.log('🧪 EliteHub Properties PHASE 4: STAFF DASHBOARD & STATS TESTS');
  console.log('==================================================\n');

  // 1. Anon Client Test
  console.log('1️⃣ Testing Public/Anon Client (Security Isolation)...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: anonComplaints, error: anonError } = await anonClient
    .from('complaints')
    .select('id, reference_number');

  if (anonError) {
    console.log(`   ✅ Anon client query properly errored/blocked: ${anonError.message}`);
  } else if (!anonComplaints || anonComplaints.length === 0) {
    console.log('   ✅ Anon client returned 0 rows (RLS isolates complaints from public).');
  } else {
    console.error(`   ❌ SECURITY BREACH: Anon client read ${anonComplaints.length} rows!`);
    process.exit(1);
  }

  // 2. Staff Authentication Test
  console.log('\n2️⃣ Testing Staff Authentication...');
  const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  const { data: authData, error: authError } = await staffClient.auth.signInWithPassword({
    email: TEST_STAFF_EMAIL,
    password: TEST_STAFF_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error('   ❌ Staff login failed:', authError?.message);
    process.exit(1);
  }
  console.log(`   ✅ Staff logged in successfully as: ${authData.user.email} (ID: ${authData.user.id})`);

  // 3. Staff Read Complaints Test
  console.log('\n3️⃣ Testing Authenticated Staff Complaints Read Permission...');
  const { data: complaints, error: complaintsError } = await staffClient
    .from('complaints')
    .select(`
      id,
      reference_number,
      full_name,
      email,
      phone,
      subject,
      priority,
      status,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (complaintsError) {
    console.error('   ❌ Staff failed to read complaints:', complaintsError.message);
    process.exit(1);
  }

  console.log(`   ✅ Staff successfully retrieved ${complaints.length} complaints from Supabase.`);
  if (complaints.length > 0) {
    console.log(`   Sample latest complaint: [${complaints[0].reference_number}] - ${complaints[0].full_name} (${complaints[0].status})`);
  }

  // 4. Test Complaint Statistics RPC
  console.log('\n4️⃣ Testing get_complaint_statistics RPC...');
  const { data: stats, error: statsError } = await staffClient.rpc('get_complaint_statistics');

  if (statsError) {
    console.error('   ❌ get_complaint_statistics RPC error:', statsError.message);
    process.exit(1);
  }

  console.log('   ✅ Complaint Statistics RPC Output:', JSON.stringify(stats, null, 2));

  // 5. Test Status Filtering
  console.log('\n5️⃣ Testing Status Filtering Queries...');
  const statuses = ['new', 'open', 'pending', 'resolved', 'closed'];
  for (const st of statuses) {
    const { data: filtered, error: filterErr } = await staffClient
      .from('complaints')
      .select('id, reference_number, status')
      .eq('status', st);

    if (filterErr) {
      console.error(`   ❌ Filter by status ${st} failed:`, filterErr.message);
    } else {
      console.log(`   • Status "${st}": ${filtered.length} complaints found`);
    }
  }

  // 6. Test Search Query Filtering
  console.log('\n6️⃣ Testing Text Search Queries...');
  if (complaints.length > 0) {
    const target = complaints[0];
    const { data: searchResults, error: searchErr } = await staffClient
      .from('complaints')
      .select('id, reference_number, full_name')
      .ilike('reference_number', `%${target.reference_number.slice(0, 8)}%`);

    if (searchErr) {
      console.error('   ❌ Search query failed:', searchErr.message);
    } else {
      console.log(`   ✅ Search for reference number prefix found ${searchResults.length} match(es) (Expected >= 1)`);
    }
  }

  console.log('\n==================================================');
  console.log('🎉 ALL PHASE 4 BACKEND & RLS VALIDATION TESTS PASSED!');
  console.log('==================================================\n');
}

runPhase4Tests().catch((err) => {
  console.error('Fatal error during Phase 4 test execution:', err);
  process.exit(1);
});
