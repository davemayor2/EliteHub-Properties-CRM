import { createClient } from '@supabase/supabase-js';
import assert from 'assert';
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://guxsqzmiqhduswqnorna.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseAnonKey);

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFICATION: STAFF DIRECTORY, STATUS TRACKING & PASSWORDS');
  console.log('================================================================\n');

  // 1. Authenticate as Admin
  console.log('1. Authenticating as admin staff...');
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: 'staff.test.1788643629712@elitehub.com',
    password: 'StrongStaffPassword123!',
  });

  assert(!authError, `Admin auth failed: ${authError?.message}`);
  assert(authData?.user, 'User object missing');
  console.log(`✅ Authenticated successfully as ${authData.user.email}`);

  // 2. Query profiles with authenticated client
  console.log('\n2. Testing authenticated query on profiles table...');
  const { data: profiles, error: profError } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  assert(!profError, `Failed to query profiles: ${profError?.message}`);
  assert(profiles && profiles.length > 0, 'Profiles should NOT be empty for authenticated admin');
  console.log(`✅ Successfully retrieved ${profiles.length} staff profiles (WAS PREVIOUSLY 0)!`);

  // 3. Query complaint messages to check activity
  console.log('\n3. Checking active sender activity...');
  const { data: messages } = await client.from('complaint_messages').select('sender_id');
  const activeSenders = new Set((messages || []).map((m) => m.sender_id).filter(Boolean));
  console.log(`   Found ${activeSenders.size} active sender(s) in messages`);

  // 4. Test enrichment and status classification
  console.log('\n4. Evaluating member statuses (Active vs Awaiting First Login)...');
  const enriched = profiles.map((p) => {
    const isTouched = new Date(p.updated_at).getTime() - new Date(p.created_at).getTime() > 10000;
    const hasLoggedIn = activeSenders.has(p.id) || isTouched;
    const status = !p.is_active ? 'inactive' : hasLoggedIn ? 'active' : 'awaiting_login';
    return {
      id: p.id,
      name: p.full_name,
      email: p.email,
      role: p.role,
      is_active: p.is_active,
      status,
      hasLoggedIn,
    };
  });

  const activeCount = enriched.filter((m) => m.status === 'active').length;
  const awaitingCount = enriched.filter((m) => m.status === 'awaiting_login').length;
  const inactiveCount = enriched.filter((m) => m.status === 'inactive').length;

  console.log(`   📊 Total Staff: ${enriched.length}`);
  console.log(`   🟢 Active Members: ${activeCount}`);
  console.log(`   🟡 Awaiting First Login: ${awaitingCount}`);
  console.log(`   ⚪ Inactive Accounts: ${inactiveCount}`);

  assert(activeCount >= 2, 'Should have at least 2 active members');
  assert(awaitingCount >= 3, 'Should have at least 3 awaiting first login members');

  // Verify specific users
  const davidInvite = enriched.find((m) => m.email === 'davidthamayor@gmail.com');
  assert(davidInvite, 'David Ololade Ola-John should exist in directory');
  assert.strictEqual(davidInvite.status, 'awaiting_login', 'David should be in awaiting_login status');
  console.log(`✅ Verified: ${davidInvite.name} (${davidInvite.email}) is classified as "${davidInvite.status}"`);

  const tariqAdmin = enriched.find((m) => m.email === 'staff.test.1788643629712@elitehub.com');
  assert(tariqAdmin, 'Tariq should exist in directory');
  assert.strictEqual(tariqAdmin.status, 'active', 'Tariq should be in active status');
  console.log(`✅ Verified: ${tariqAdmin.name} (${tariqAdmin.email}) is classified as "${tariqAdmin.status}"`);

  // 5. Test Email Template with Password
  console.log('\n5. Testing StaffInvitationEmail rendering with temporary password...');
  const { renderStaffInvitationEmail } = await import('../emails/StaffInvitationEmail.ts');
  const emailResult = renderStaffInvitationEmail({
    fullName: 'David Ololade Ola-John',
    email: 'davidthamayor@gmail.com',
    role: 'staff',
    setupUrl: 'https://care.elitehubproperties.com/staff/login?email=davidthamayor%40gmail.com',
    password: 'Elite#TestPass2026!',
  });

  assert(emailResult.subject.includes('Credentials'), 'Subject should mention credentials');
  assert(emailResult.html.includes('Elite#TestPass2026!'), 'Email HTML must contain the temporary password');
  assert(emailResult.html.includes('davidthamayor@gmail.com'), 'Email HTML must contain the email address');
  assert(emailResult.html.includes('Staff Login Credentials'), 'Email HTML must contain the credentials box header');
  assert(emailResult.html.includes('Sign In to Staff Portal'), 'Email HTML must contain the direct portal CTA');
  console.log('✅ Staff invitation email template successfully verified with password included!');

  console.log('\n================================================================');
  console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
