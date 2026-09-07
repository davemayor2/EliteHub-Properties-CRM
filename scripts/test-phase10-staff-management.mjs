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

async function runPhase10Tests() {
  console.log('================================================================');
  console.log('🧪 PHASE 10 AUTOMATED TEST SUITE: STAFF MANAGEMENT & CONTROLS');
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
    console.error('❌ Authentication failed:', authError?.message);
    process.exit(1);
  }
  console.log('✅ Authenticated successfully! User ID:', authData.user.id);

  // 2. Verify Profile & Admin Status
  console.log('\n2. Verifying admin profile and is_active flag...');
  const { data: adminProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileErr || !adminProfile) {
    console.error('❌ Failed to fetch admin profile:', profileErr?.message);
    process.exit(1);
  }
  console.log(`   Name: ${adminProfile.full_name}, Role: ${adminProfile.role}, Active: ${adminProfile.is_active}`);
  if (adminProfile.role !== 'admin' || adminProfile.is_active !== true) {
    console.error('❌ User is not an active admin!');
    process.exit(1);
  }
  console.log('✅ Admin credentials and active status verified.');

  // 3. Test Staff Creation via RPC
  const testStaffEmail = `staff.ph10.${Date.now()}@elitehub.com`;
  const testStaffName = 'Test Agent Phase 10';
  const testStaffPass = 'TemporaryPassword123!';
  console.log(`\n3. Creating new staff member via admin_create_staff_user RPC (${testStaffEmail})...`);

  const { data: createData, error: createError } = await supabase.rpc('admin_create_staff_user', {
    p_full_name: testStaffName,
    p_email: testStaffEmail,
    p_role: 'staff',
    p_password: testStaffPass,
  });

  if (createError || !createData?.user_id) {
    console.error('❌ Failed to create staff user:', createError?.message || createData);
    process.exit(1);
  }
  const newUserId = createData.user_id;
  console.log('✅ Staff member created successfully! New User ID:', newUserId);

  // Verify profile in table
  const { data: createdProfile, error: verifyErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', newUserId)
    .single();

  if (verifyErr || !createdProfile) {
    console.error('❌ Created profile not found in profiles table:', verifyErr?.message);
    process.exit(1);
  }
  if (createdProfile.is_active !== true || createdProfile.role !== 'staff') {
    console.error('❌ Unexpected profile attributes:', createdProfile);
    process.exit(1);
  }
  console.log('✅ Verified created profile in DB: role=staff, is_active=true');

  // 4. Test Duplicate Email Prevention
  console.log('\n4. Testing duplicate email prevention...');
  const { data: dupUser, error: dupError } = await supabase.rpc('admin_create_staff_user', {
    p_full_name: 'Duplicate Attempt',
    p_email: testStaffEmail,
    p_role: 'staff',
    p_password: 'SomePassword123!',
  });

  if (!dupError) {
    console.error('❌ Expected duplicate user creation to fail, but it succeeded!', dupUser);
    process.exit(1);
  }
  console.log('✅ Duplicate user creation properly rejected:', dupError.message);

  // 5. Test Admin Safeguards
  console.log('\n5. Testing Admin Safeguards (admin_update_staff RPC)...');

  // Safeguard A: Self-Deactivation
  console.log('   A. Attempting self-deactivation (Admin should NOT be allowed to deactivate self)...');
  const { error: selfDeactErr } = await supabase.rpc('admin_update_staff', {
    p_target_id: authData.user.id,
    p_full_name: adminProfile.full_name,
    p_role: 'admin',
    p_is_active: false,
  });

  if (!selfDeactErr) {
    console.error('❌ Self-deactivation was allowed! Safeguard failed.');
    process.exit(1);
  }
  console.log('   ✅ Self-deactivation blocked:', selfDeactErr.message);

  // Safeguard B: Self-Demotion
  console.log('   B. Attempting self-demotion (Admin should NOT be allowed to demote self to staff)...');
  const { error: selfDemoteErr } = await supabase.rpc('admin_update_staff', {
    p_target_id: authData.user.id,
    p_full_name: adminProfile.full_name,
    p_role: 'staff',
    p_is_active: true,
  });

  if (!selfDemoteErr) {
    console.error('❌ Self-demotion was allowed! Safeguard failed.');
    process.exit(1);
  }
  console.log('   ✅ Self-demotion blocked:', selfDemoteErr.message);

  // 6. Test Updating Created Staff Member (Role Promotion & Deactivation)
  console.log('\n6. Testing staff updates on managed member...');
  
  // Update role to admin
  console.log('   A. Promoting created member to admin...');
  const { error: promoteErr } = await supabase.rpc('admin_update_staff', {
    p_target_id: newUserId,
    p_full_name: 'Test Agent Promoted',
    p_role: 'admin',
    p_is_active: true,
  });
  if (promoteErr) {
    console.error('❌ Failed to promote user:', promoteErr.message);
    process.exit(1);
  }
  console.log('   ✅ Member promoted to admin successfully.');

  // Deactivate the created member
  console.log('   B. Deactivating the member...');
  const { error: deactErr } = await supabase.rpc('admin_update_staff', {
    p_target_id: newUserId,
    p_full_name: 'Test Agent Promoted',
    p_role: 'admin',
    p_is_active: false,
  });
  if (deactErr) {
    console.error('❌ Failed to deactivate user:', deactErr.message);
    process.exit(1);
  }

  // Verify deactivated in DB
  const { data: deactProfile } = await supabase
    .from('profiles')
    .select('is_active, role')
    .eq('id', newUserId)
    .single();

  if (deactProfile?.is_active !== false) {
    console.error('❌ Member is_active flag is not false:', deactProfile);
    process.exit(1);
  }
  console.log('   ✅ Member verified as deactivated (is_active: false).');

  // 7. Test Assignment Select Active Staff Filter
  console.log('\n7. Verifying inactive staff are excluded from active staff queries...');
  const { data: activeStaffList, error: activeErr } = await supabase
    .from('profiles')
    .select('id, full_name, is_active')
    .eq('is_active', true);

  if (activeErr) {
    console.error('❌ Failed to fetch active staff:', activeErr.message);
    process.exit(1);
  }

  const isDeactivatedPresent = activeStaffList.some((s) => s.id === newUserId);
  if (isDeactivatedPresent) {
    console.error('❌ Deactivated staff was found in active staff query!');
    process.exit(1);
  }
  console.log(`   ✅ Deactivated staff ID ${newUserId} successfully excluded from active staff list (Total active: ${activeStaffList.length}).`);

  // 8. Test Reactivating Member
  console.log('\n8. Reactivating member and setting role back to staff...');
  const { error: reactivateErr } = await supabase.rpc('admin_update_staff', {
    p_target_id: newUserId,
    p_full_name: 'Test Agent (Reactivated)',
    p_role: 'staff',
    p_is_active: true,
  });
  if (reactivateErr) {
    console.error('❌ Failed to reactivate user:', reactivateErr.message);
    process.exit(1);
  }

  const { data: reactivatedProfile } = await supabase
    .from('profiles')
    .select('is_active, role, full_name')
    .eq('id', newUserId)
    .single();

  if (reactivatedProfile?.is_active !== true || reactivatedProfile?.role !== 'staff') {
    console.error('❌ Member state incorrect after reactivation:', reactivatedProfile);
    process.exit(1);
  }
  console.log(`   ✅ Member successfully reactivated: ${reactivatedProfile.full_name} (${reactivatedProfile.role}, active: ${reactivatedProfile.is_active})`);

  // 9. Fetch Team Overview & Workload Counts
  console.log('\n9. Testing team metrics calculation...');
  const { data: allProfiles, error: allErr } = await supabase
    .from('profiles')
    .select('*');

  if (allErr) {
    console.error('❌ Failed to fetch all profiles:', allErr.message);
    process.exit(1);
  }

  const totalMembers = allProfiles.length;
  const activeMembers = allProfiles.filter((p) => p.is_active).length;
  const adminMembers = allProfiles.filter((p) => p.role === 'admin' && p.is_active).length;

  console.log(`   Total staff members: ${totalMembers}`);
  console.log(`   Active members: ${activeMembers}`);
  console.log(`   Active administrators: ${adminMembers}`);

  console.log('\n================================================================');
  console.log('🎉 ALL PHASE 10 TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runPhase10Tests().catch((err) => {
  console.error('❌ Test suite failed with unhandled error:', err);
  process.exit(1);
});
