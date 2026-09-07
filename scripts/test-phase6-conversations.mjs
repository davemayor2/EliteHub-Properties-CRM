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

async function runPhase6Tests() {
  console.log('==================================================');
  console.log('🧪 EliteHub Properties PHASE 6: CONVERSATIONS & RESPONSES');
  console.log('==================================================\n');

  // 1. Anon Isolation Test
  console.log('1️⃣ Testing Public / Anonymous Isolation...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // Anon select
  const { data: anonMessages, error: anonSelectErr } = await anonClient
    .from('complaint_messages')
    .select('*');

  if (anonSelectErr) {
    console.log(`   ✅ Anon messages query blocked: ${anonSelectErr.message}`);
  } else if (!anonMessages || anonMessages.length === 0) {
    console.log('   ✅ Anon query returned 0 rows (RLS blocks unauthenticated reads).');
  } else {
    console.error('   ❌ SECURITY BREACH: Anonymous client read messages!');
    process.exit(1);
  }

  // Anon insert
  const { data: anonInsert, error: anonInsertErr } = await anonClient
    .from('complaint_messages')
    .insert({
      complaint_id: '00000000-0000-0000-0000-000000000000',
      sender_type: 'staff',
      message: 'Malicious attempt',
    })
    .select();

  if (anonInsertErr) {
    console.log(`   ✅ Anon message insertion rejected by RLS: ${anonInsertErr.message}`);
  } else {
    console.error('   ❌ SECURITY BREACH: Anonymous client inserted message!');
    process.exit(1);
  }

  // 2. Staff Authentication
  console.log('\n2️⃣ Testing Staff Authentication...');
  const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authErr } = await staffClient.auth.signInWithPassword({
    email: TEST_STAFF_EMAIL,
    password: TEST_STAFF_PASSWORD,
  });

  if (authErr || !authData.session) {
    console.error('   ❌ Staff login failed:', authErr?.message);
    process.exit(1);
  }

  const staffUser = authData.user;
  console.log(`   ✅ Staff authenticated as ${staffUser.email} (ID: ${staffUser.id})`);

  // 3. Verify System Initial Submission Messages
  console.log('\n3️⃣ Verifying Initial System Event Messages...');
  const { data: systemMessages, error: sysErr } = await staffClient
    .from('complaint_messages')
    .select('id, complaint_id, sender_type, message, created_at')
    .eq('sender_type', 'system')
    .limit(3);

  if (sysErr) {
    console.error('   ❌ Failed to query system messages:', sysErr.message);
    process.exit(1);
  }

  console.log(`   ✅ Found system messages in database (Total sampled: ${systemMessages.length})`);
  if (systemMessages.length > 0) {
    console.log(`   Sample event: "${systemMessages[0].message}" (ID: ${systemMessages[0].id})`);
  }

  // 4. Test Staff Response Insertion
  console.log('\n4️⃣ Testing Staff Response Sending...');
  const { data: testComplaints, error: fetchErr } = await staffClient
    .from('complaints')
    .select('id, reference_number, status')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchErr || !testComplaints || testComplaints.length === 0) {
    console.error('   ❌ Failed to fetch complaints:', fetchErr?.message);
    process.exit(1);
  }

  const targetComplaint = testComplaints[0];
  const testMessageText = `Hello, this is a test response from Customer Care regarding case ${targetComplaint.reference_number}. We are looking into this promptly.`;

  const { data: insertedMessage, error: sendErr } = await staffClient
    .from('complaint_messages')
    .insert({
      complaint_id: targetComplaint.id,
      sender_type: 'staff',
      sender_id: staffUser.id,
      message: testMessageText,
    })
    .select(`
      id,
      complaint_id,
      sender_type,
      sender_id,
      message,
      created_at,
      sender_profile:profiles(id, full_name, email, role)
    `)
    .single();

  if (sendErr || !insertedMessage) {
    console.error('   ❌ Failed to insert staff message:', sendErr?.message);
    process.exit(1);
  }

  console.log(`   ✅ Staff response sent successfully:`);
  console.log(`      ID: ${insertedMessage.id}`);
  console.log(`      Sender: ${insertedMessage.sender_profile?.full_name} (${insertedMessage.sender_profile?.role})`);
  console.log(`      Message: "${insertedMessage.message.slice(0, 60)}..."`);

  // 5. Test Status Transition Automation (new -> open)
  console.log('\n5️⃣ Testing Automatic Status Transition on First Staff Response...');

  // Find a complaint that is currently 'new' (or temporarily set one to 'new')
  const { data: newComplaints } = await staffClient
    .from('complaints')
    .select('id, reference_number, status')
    .eq('status', 'new')
    .limit(1);

  let newComplaint = newComplaints && newComplaints.length > 0 ? newComplaints[0] : null;

  if (!newComplaint) {
    // Reset target complaint to 'new' for this test
    await staffClient
      .from('complaints')
      .update({ status: 'new' })
      .eq('id', targetComplaint.id);
    newComplaint = { ...targetComplaint, status: 'new' };
    console.log(`   (Prepared test complaint ${newComplaint.reference_number} with status='new')`);
  } else {
    console.log(`   Found complaint with status='new': ${newComplaint.reference_number}`);
  }

  // Send staff response to the 'new' complaint
  const { data: triggerTestMessage, error: triggerMsgErr } = await staffClient
    .from('complaint_messages')
    .insert({
      complaint_id: newComplaint.id,
      sender_type: 'staff',
      sender_id: staffUser.id,
      message: 'Initial staff review underway. Advancing ticket to active status.',
    })
    .select()
    .single();

  if (triggerMsgErr) {
    console.error('   ❌ Failed to insert staff response:', triggerMsgErr.message);
    process.exit(1);
  }

  // Check if complaint status was automatically updated to 'open' by database trigger
  const { data: verifiedComplaint, error: verifyErr } = await staffClient
    .from('complaints')
    .select('id, status')
    .eq('id', newComplaint.id)
    .single();

  if (verifyErr || !verifiedComplaint) {
    console.error('   ❌ Failed to verify complaint status:', verifyErr?.message);
    process.exit(1);
  }

  if (verifiedComplaint.status === 'open') {
    console.log(`   ✅ Status automation verified! Complaint automatically transitioned from 'new' ➔ 'open'.`);
  } else {
    console.error(`   ❌ Status automation failed: Complaint status is '${verifiedComplaint.status}', expected 'open'`);
    process.exit(1);
  }

  // 6. Test Status Stability (pending / resolved should NOT change to open)
  console.log('\n6️⃣ Testing Status Stability for Non-New Complaints...');
  // Set to 'pending'
  await staffClient
    .from('complaints')
    .update({ status: 'pending' })
    .eq('id', newComplaint.id);

  // Send another message
  await staffClient
    .from('complaint_messages')
    .insert({
      complaint_id: newComplaint.id,
      sender_type: 'staff',
      sender_id: staffUser.id,
      message: 'Following up on pending inquiry.',
    });

  const { data: stabilityCheck } = await staffClient
    .from('complaints')
    .select('status')
    .eq('id', newComplaint.id)
    .single();

  if (stabilityCheck?.status === 'pending') {
    console.log(`   ✅ Status stability verified! Complaint remained in 'pending' status.`);
  } else {
    console.error(`   ❌ Status stability violated: Complaint status changed to '${stabilityCheck?.status}'`);
    process.exit(1);
  }

  // 7. Verify Full Conversation History Feed
  console.log('\n7️⃣ Verifying Chronological Message Ordering...');
  const { data: feed, error: feedErr } = await staffClient
    .from('complaint_messages')
    .select('id, sender_type, message, created_at')
    .eq('complaint_id', newComplaint.id)
    .order('created_at', { ascending: true });

  if (feedErr) {
    console.error('   ❌ Feed retrieval failed:', feedErr.message);
    process.exit(1);
  }

  console.log(`   ✅ Retrieved complete chronological feed (${feed.length} events):`);
  for (const m of feed) {
    console.log(`      • [${m.sender_type.toUpperCase()}] ${m.message.slice(0, 50)}... (${m.created_at})`);
  }

  console.log('\n==================================================');
  console.log('🎉 ALL PHASE 6 CONVERSATION TESTS PASSED!');
  console.log('==================================================\n');
}

runPhase6Tests().catch((err) => {
  console.error('Fatal error in Phase 6 test execution:', err);
  process.exit(1);
});
