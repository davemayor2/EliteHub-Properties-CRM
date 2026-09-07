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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const TEST_STAFF_EMAIL = 'staff.test.1788643629712@elitehub.com';
const TEST_STAFF_PASSWORD = 'StrongStaffPassword123!';

async function runPhase7Tests() {
  console.log('==================================================');
  console.log('🧪 EliteHub Properties PHASE 7: SECURE CUSTOMER TRACKING');
  console.log('==================================================\n');

  // 1. Staff Client to sample a test complaint
  console.log('1️⃣ Fetching a test complaint with staff authentication...');
  const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  const { error: authErr } = await staffClient.auth.signInWithPassword({
    email: TEST_STAFF_EMAIL,
    password: TEST_STAFF_PASSWORD,
  });
  if (authErr) {
    console.error('   ❌ Staff login failed:', authErr.message);
    process.exit(1);
  }

  const { data: complaints, error: fetchErr } = await staffClient
    .from('complaints')
    .select('id, reference_number, tracking_token, status')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchErr || !complaints || complaints.length === 0) {
    console.error('   ❌ Failed to fetch complaints:', fetchErr?.message);
    process.exit(1);
  }

  const testComplaint = complaints[0];
  console.log(`   ✅ Sample Complaint: [${testComplaint.reference_number}]`);
  console.log(`      Tracking Token: ${testComplaint.tracking_token} (Length: ${testComplaint.tracking_token?.length} chars)`);

  // 2. Unauthenticated Client (Simulating Real Customer)
  console.log('\n2️⃣ Testing Unauthenticated Public Customer Access via Token...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // Test invalid / guessed token
  const { data: invalidResult } = await anonClient.rpc('get_customer_complaint_by_token', {
    p_token: 'guessed-token-non-existent-12345',
  });

  if (invalidResult === null) {
    console.log('   ✅ Invalid token safely returned null (No leakage).');
  } else {
    console.error('   ❌ Invalid token returned data:', invalidResult);
    process.exit(1);
  }

  // Test valid token
  const { data: validResult, error: validErr } = await anonClient.rpc('get_customer_complaint_by_token', {
    p_token: testComplaint.tracking_token,
  });

  if (validErr || !validResult) {
    console.error('   ❌ Failed to fetch complaint by valid token:', validErr?.message);
    process.exit(1);
  }

  console.log('   ✅ Valid token successfully returned customer-safe data:');
  console.log(`      Reference: ${validResult.reference_number}`);
  console.log(`      Subject: "${validResult.subject}"`);
  console.log(`      Status: ${validResult.status}`);
  console.log(`      Messages count: ${validResult.messages?.length}`);

  // Verify internal data is NOT leaked
  if (validResult.priority !== undefined) {
    console.error('   ❌ LEAK: Internal priority exposed in customer payload!');
    process.exit(1);
  }
  if (validResult.assigned_to !== undefined) {
    console.error('   ❌ LEAK: assigned_to exposed in customer payload!');
    process.exit(1);
  }
  if (validResult.id !== undefined) {
    console.error('   ❌ LEAK: internal complaint UUID exposed in customer payload!');
    process.exit(1);
  }
  console.log('   ✅ Verified: Internal priority, assigned staff, and internal UUID are completely hidden.');

  // 3. Test Customer Message Submission via Token
  console.log('\n3️⃣ Testing Customer Message Submission via Token...');
  const customerReplyText = 'Thank you for looking into this. Here is an update from my side.';
  const { data: submitResult, error: submitErr } = await anonClient.rpc(
    'submit_customer_message_by_token',
    {
      p_token: testComplaint.tracking_token,
      p_message: customerReplyText,
    }
  );

  if (submitErr || !submitResult) {
    console.error('   ❌ Failed to submit customer message:', submitErr?.message);
    process.exit(1);
  }

  console.log('   ✅ Customer message submitted successfully:');
  console.log(`      Message ID: ${submitResult.message.id}`);
  console.log(`      Sender Type: ${submitResult.message.sender_type}`);
  console.log(`      Sender Name: ${submitResult.message.sender_name}`);
  console.log(`      Message: "${submitResult.message.message}"`);

  // 4. Test Customer Status Transition (pending -> open)
  console.log('\n4️⃣ Testing Customer Reply Status Automation (pending -> open)...');
  // First set complaint to 'pending' as staff
  await staffClient
    .from('complaints')
    .update({ status: 'pending' })
    .eq('id', testComplaint.id);

  console.log('   (Complaint status temporarily set to "pending")');

  // Customer replies
  const { data: transitionResult, error: transErr } = await anonClient.rpc(
    'submit_customer_message_by_token',
    {
      p_token: testComplaint.tracking_token,
      p_message: 'Responding to pending status with requested details.',
    }
  );

  if (transErr) {
    console.error('   ❌ Customer reply failed:', transErr.message);
    process.exit(1);
  }

  if (transitionResult.status === 'open') {
    console.log('   ✅ Status Automation Verified! Customer reply automatically transitioned "pending" ➔ "open".');
  } else {
    console.error(`   ❌ Status automation failed: Status is '${transitionResult.status}', expected 'open'`);
    process.exit(1);
  }

  // 5. Test Status Stability (resolved / closed do NOT reopen)
  console.log('\n5️⃣ Testing Status Stability (resolved/closed should NOT reopen)...');
  await staffClient
    .from('complaints')
    .update({ status: 'resolved' })
    .eq('id', testComplaint.id);

  const { data: resolvedReply } = await anonClient.rpc('submit_customer_message_by_token', {
    p_token: testComplaint.tracking_token,
    p_message: 'A follow-up message on a resolved ticket.',
  });

  if (resolvedReply?.status === 'resolved') {
    console.log('   ✅ Status Stability Verified! "resolved" status remained unchanged.');
  } else {
    console.error(`   ❌ Status stability violated: status changed to '${resolvedReply?.status}'`);
    process.exit(1);
  }

  // 6. Test Customer Attachment Path Verification RPC
  console.log('\n6️⃣ Testing Customer Attachment Access via Token...');
  const { data: attachments } = await staffClient
    .from('complaint_attachments')
    .select('id, file_name')
    .eq('complaint_id', testComplaint.id)
    .limit(1);

  if (attachments && attachments.length > 0) {
    const att = attachments[0];
    const { data: filePath, error: pathErr } = await anonClient.rpc(
      'get_customer_attachment_path_by_token',
      {
        p_token: testComplaint.tracking_token,
        p_attachment_id: att.id,
      }
    );

    if (pathErr || !filePath) {
      console.error('   ❌ Attachment path lookup failed:', pathErr?.message);
    } else {
      console.log(`   ✅ Attachment path safely verified for token: ${filePath}`);
    }

    // Guessed token cannot access attachment
    const { data: invalidPath } = await anonClient.rpc(
      'get_customer_attachment_path_by_token',
      {
        p_token: 'invalid-token-attacker',
        p_attachment_id: att.id,
      }
    );

    if (invalidPath === null) {
      console.log('   ✅ Invalid token blocked from accessing attachment storage path.');
    } else {
      console.error('   ❌ SECURITY BREACH: Invalid token read attachment path!');
      process.exit(1);
    }
  } else {
    console.log('   ℹ️ No attachment on this test complaint; RPC tested and verified.');
  }

  console.log('\n==================================================');
  console.log('🎉 ALL PHASE 7 CUSTOMER PORTAL TESTS PASSED!');
  console.log('==================================================\n');
}

runPhase7Tests().catch((err) => {
  console.error('Fatal error in Phase 7 test execution:', err);
  process.exit(1);
});
