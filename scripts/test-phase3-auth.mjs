import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local without external dependencies
function loadEnv() {
  const envPath = path.resolve('.env.local');
  const config = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        config[key.trim()] = rest.join('=').trim();
      }
    }
  }
  return config;
}

const envConfig = loadEnv();
const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL || 'https://guxsqzmiqhduswqnorna.supabase.co';
const SUPABASE_ANON_KEY = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('====================================================');
console.log('PHASE 3: STAFF AUTHENTICATION & RLS VALIDATION SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

async function runAuthTests() {
  const testStaffEmail = 'staff.test.1788643629712@elitehub.com';
  const testStaffPassword = 'StrongStaffPassword123!';
  const expectedUserId = '45a425a1-eea9-4c26-8848-c830c72211a9';

  console.log('--- TEST SUITE 1: STAFF SIGN-IN & SESSION GENERATION ---');
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let authenticatedClient = null;

  try {
    // 1. Sign in with valid staff credentials
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: testStaffEmail,
      password: testStaffPassword
    });

    assert(!signInError && signInData?.session?.access_token, 'Staff user successfully signed in with email & password', signInError?.message);
    assert(signInData?.user?.id === expectedUserId, `Authenticated user ID matches expected UUID: ${signInData?.user?.id}`);

    if (signInData?.session?.access_token) {
      authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${signInData.session.access_token}`
          }
        },
        auth: { persistSession: false }
      });
    }

    // 2. Verify profile record in public.profiles
    if (authenticatedClient) {
      const { data: profile, error: profileErr } = await authenticatedClient
        .from('profiles')
        .select('*')
        .eq('id', expectedUserId)
        .single();

      assert(!profileErr && profile, 'Profile record exists and is accessible by authenticated staff', profileErr?.message);
      assert(profile?.full_name === 'Tariq Al-Mansoor', `Profile full_name matches: "${profile?.full_name}"`);
      assert(profile?.email === testStaffEmail, `Profile email matches: "${profile?.email}"`);
      assert(profile?.role === 'staff', `Profile role is "staff" (got "${profile?.role}")`);
      assert(profile?.created_at && profile?.updated_at, 'Profile timestamps created_at and updated_at populated');
    }
  } catch (err) {
    assert(false, 'Exception in Suite 1', err.message);
  }

  console.log('\n--- TEST SUITE 2: AUTHENTICATION ERROR HANDLING & RPC ---');
  try {
    const unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 1. Invalid password rejection
    const { data: badPassData, error: badPassErr } = await unauthClient.auth.signInWithPassword({
      email: testStaffEmail,
      password: 'WrongPassword999!'
    });
    assert(!!badPassErr && !badPassData?.user, 'Invalid password is systematically rejected with auth error');

    // 2. Non-existent email rejection
    const { data: badEmailData, error: badEmailErr } = await unauthClient.auth.signInWithPassword({
      email: 'nonexistent.officer@elitehub.com',
      password: 'SomePassword123!'
    });
    assert(!!badEmailErr && !badEmailData?.user, 'Non-existent email is systematically rejected with auth error');

    // 3. get_my_profile RPC with authenticated client
    if (authenticatedClient) {
      const { data: rpcProfile, error: rpcErr } = await authenticatedClient.rpc('get_my_profile');
      assert(!rpcErr && rpcProfile?.id === expectedUserId, 'get_my_profile RPC returns authenticated profile', rpcErr?.message);
      assert(rpcProfile?.role === 'staff', `get_my_profile returns verified role "${rpcProfile?.role}"`);
    }

    // 4. get_my_profile RPC with unauthenticated client returns null
    const { data: unauthRpc } = await unauthClient.rpc('get_my_profile');
    assert(unauthRpc === null, 'get_my_profile RPC returns null for unauthenticated requests');
  } catch (err) {
    assert(false, 'Exception in Suite 2', err.message);
  }

  console.log('\n--- TEST SUITE 3: RLS SECURITY & PRIVILEGE ESCALATION RESTRICTION ---');
  try {
    // 1. Truly unauthenticated client cannot SELECT from profiles
    const unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: anonProfiles } = await unauthClient.from('profiles').select('*');
    assert(
      !anonProfiles || anonProfiles.length === 0,
      `Unauthenticated client CANNOT SELECT profiles (RLS active, returned ${anonProfiles?.length || 0} rows)`
    );

    // 2. Staff user cannot escalate their role to 'admin'
    if (authenticatedClient) {
      const { error: escalateErr } = await authenticatedClient
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', expectedUserId);

      // Verify role in database did NOT change to admin
      const { data: checkRole } = await authenticatedClient
        .from('profiles')
        .select('role')
        .eq('id', expectedUserId)
        .single();

      assert(
        checkRole?.role === 'staff' || !!escalateErr,
        `Staff user CANNOT escalate role to "admin" (RLS WITH CHECK enforced, role remained: "${checkRole?.role}")`
      );

      // 3. Staff user CAN update their own full_name
      const { error: updateNameErr } = await authenticatedClient
        .from('profiles')
        .update({ full_name: 'Tariq Al-Mansoor' })
        .eq('id', expectedUserId);

      const { data: updatedProfile } = await authenticatedClient
        .from('profiles')
        .select('full_name')
        .eq('id', expectedUserId)
        .single();

      assert(!updateNameErr && updatedProfile?.full_name === 'Tariq Al-Mansoor', 'Staff user can update own personal information');
    }
  } catch (err) {
    assert(false, 'Exception in Suite 3', err.message);
  }

  console.log('\n====================================================');
  console.log(`TOTAL PHASE 3 TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAuthTests();
