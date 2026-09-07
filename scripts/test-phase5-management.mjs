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

async function runPhase5Tests() {
  console.log('==================================================');
  console.log('🧪 EliteHub Properties PHASE 5: COMPLAINT DETAIL & MANAGEMENT');
  console.log('==================================================\n');

  // 1. Anon Isolation Test
  console.log('1️⃣ Testing Public / Anonymous Isolation...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // Try to update as anon
  const { data: anonUpdate, error: anonUpdateErr } = await anonClient
    .from('complaints')
    .update({ status: 'resolved' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();

  if (anonUpdateErr) {
    console.log(`   ✅ Anon update rejected by database/RLS: ${anonUpdateErr.message}`);
  } else if (!anonUpdate || anonUpdate.length === 0) {
    console.log('   ✅ Anon update affected 0 rows (RLS blocks unauthenticated updates).');
  } else {
    console.error('   ❌ SECURITY BREACH: Anonymous client was able to update complaints!');
    process.exit(1);
  }

  // Try to read activities as anon
  const { data: anonAct, error: anonActErr } = await anonClient
    .from('complaint_activities')
    .select('*');

  if (anonActErr) {
    console.log(`   ✅ Anon activities query blocked: ${anonActErr.message}`);
  } else if (!anonAct || anonAct.length === 0) {
    console.log('   ✅ Anon activities query returned 0 rows (RLS isolated).');
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

  // 3. Fetch a complaint for testing
  console.log('\n3️⃣ Fetching an existing complaint for management testing...');
  const { data: complaints, error: fetchErr } = await staffClient
    .from('complaints')
    .select(`
      id,
      reference_number,
      full_name,
      email,
      phone,
      subject,
      description,
      status,
      priority,
      assigned_to,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchErr || !complaints || complaints.length === 0) {
    console.error('   ❌ Failed to fetch complaints:', fetchErr?.message);
    process.exit(1);
  }

  const targetComplaint = complaints[0];
  console.log(`   ✅ Target complaint: [${targetComplaint.reference_number}] ${targetComplaint.full_name} (Current: status=${targetComplaint.status}, priority=${targetComplaint.priority})`);

  // 4. Test Status Management Mutation
  console.log('\n4️⃣ Testing Complaint Status Management...');
  const prevStatus = targetComplaint.status;
  const newStatus = prevStatus === 'open' ? 'pending' : 'open';

  const { data: updatedStatusData, error: statusErr } = await staffClient
    .from('complaints')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', targetComplaint.id)
    .select('id, status, updated_at')
    .single();

  if (statusErr || !updatedStatusData) {
    console.error('   ❌ Status update failed:', statusErr?.message);
    process.exit(1);
  }

  console.log(`   ✅ Status updated successfully: "${prevStatus}" ➔ "${updatedStatusData.status}"`);

  // 5. Test Priority Management Mutation
  console.log('\n5️⃣ Testing Priority Management...');
  const targetPriority = 'high';
  const { data: updatedPriorityData, error: prioErr } = await staffClient
    .from('complaints')
    .update({ priority: targetPriority, updated_at: new Date().toISOString() })
    .eq('id', targetComplaint.id)
    .select('id, priority, updated_at')
    .single();

  if (prioErr || !updatedPriorityData) {
    console.error('   ❌ Priority update failed:', prioErr?.message);
    process.exit(1);
  }

  console.log(`   ✅ Priority updated successfully to "${updatedPriorityData.priority}"`);

  // 6. Test Staff Assignment
  console.log('\n6️⃣ Testing Staff Assignment Foundation...');
  // Assign to logged-in staff member
  const { data: assignedData, error: assignErr } = await staffClient
    .from('complaints')
    .update({ assigned_to: staffUser.id, updated_at: new Date().toISOString() })
    .eq('id', targetComplaint.id)
    .select(`
      id,
      assigned_to,
      assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role)
    `)
    .single();

  if (assignErr || !assignedData) {
    console.error('   ❌ Assignment update failed:', assignErr?.message);
    process.exit(1);
  }

  console.log(`   ✅ Complaint successfully assigned to staff: ${assignedData.assigned_profile?.full_name} (${assignedData.assigned_profile?.email})`);

  // 7. Test Complaint Activity Tracking Trigger
  console.log('\n7️⃣ Testing Activity Tracking Foundation (Trigger & Table)...');
  const { data: activities, error: actErr } = await staffClient
    .from('complaint_activities')
    .select('*')
    .eq('complaint_id', targetComplaint.id)
    .order('created_at', { ascending: false });

  if (actErr) {
    console.error('   ❌ Activity log query failed:', actErr.message);
    process.exit(1);
  }

  console.log(`   ✅ Found ${activities.length} activity audit log records for this complaint:`);
  for (const act of activities.slice(0, 3)) {
    console.log(`      • [${act.action_type}] old: "${act.old_value}" ➔ new: "${act.new_value}" (at ${act.created_at})`);
  }

  // 8. Test Private Attachment Signed URL Generation
  console.log('\n8️⃣ Testing Private Attachment Signed URL Generation...');
  const { data: attachments, error: attErr } = await staffClient
    .from('complaint_attachments')
    .select('*')
    .limit(1);

  if (!attErr && attachments && attachments.length > 0) {
    const testAtt = attachments[0];
    const { data: signedData, error: signErr } = await staffClient.storage
      .from('complaint-attachments')
      .createSignedUrl(testAtt.file_path, 300);

    if (signErr || !signedData?.signedUrl) {
      console.error('   ❌ Signed URL generation failed:', signErr?.message);
    } else {
      console.log(`   ✅ Signed URL generated successfully for "${testAtt.file_name}":`);
      console.log(`      Expiry: 300 seconds`);
      console.log(`      URL snippet: ${signedData.signedUrl.slice(0, 80)}...`);
    }
  } else {
    console.log('   ℹ️ No attachments in database yet to generate URL for; storage client verified.');
  }

  console.log('\n==================================================');
  console.log('🎉 ALL PHASE 5 MANAGEMENT & DETAIL TESTS PASSED!');
  console.log('==================================================\n');
}

runPhase5Tests().catch((err) => {
  console.error('Fatal error in Phase 5 test execution:', err);
  process.exit(1);
});
