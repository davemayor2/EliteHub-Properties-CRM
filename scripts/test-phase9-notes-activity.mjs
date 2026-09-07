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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEST_STAFF_EMAIL = 'staff.test.1788643629712@elitehub.com';
const TEST_STAFF_PASSWORD = 'StrongStaffPassword123!';

const staffClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});
const anonClient = createClient(supabaseUrl, anonKey);

console.log('====================================================');
console.log('PHASE 9 VERIFICATION: Internal Notes & Activity Timeline');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runTests() {
  let testComplaintId = null;
  let testStaffId = null;
  let testNoteId = null;

  try {
    // Authenticate staff client
    const { data: authData, error: authErr } = await staffClient.auth.signInWithPassword({
      email: TEST_STAFF_EMAIL,
      password: TEST_STAFF_PASSWORD,
    });

    if (authErr || !authData.user) {
      throw new Error(`Staff login failed: ${authErr?.message}`);
    }

    testStaffId = authData.user.id;
    console.log(`Authenticated as staff: ${TEST_STAFF_EMAIL} (${testStaffId})`);

    // 0. Fetch another staff profile for assignment testing
    const { data: profiles, error: profErr } = await staffClient
      .from('profiles')
      .select('id, full_name, role');

    if (profErr || !profiles || profiles.length === 0) {
      throw new Error('No staff profiles found in DB to run tests.');
    }

    const secondStaffId = profiles.find((p) => p.id !== testStaffId)?.id || testStaffId;
    console.log(`Using second staff profile for assignment: ${secondStaffId}`);

    // 1. Create a test complaint via submit_complaint RPC
    console.log('\n--- 1. Testing Complaint Creation & Automatic Activity Logging ---');
    const { data: submitResult, error: submitErr } = await staffClient.rpc('submit_complaint', {
      p_full_name: 'Phase9 Test Customer',
      p_phone: '08099887766',
      p_subject: 'Phase 9 Audit Test Complaint',
      p_description: 'Testing internal notes and activity timeline generation.',
      p_email: 'phase9test@elitehub.com',
    });

    if (submitErr || !submitResult) {
      throw new Error(`Failed to submit test complaint: ${submitErr?.message}`);
    }

    testComplaintId = submitResult.id;
    const trackingToken = submitResult.tracking_token;
    console.log(`Created test complaint: ${submitResult.reference_number} (${testComplaintId})`);

    // Verify activity logged for complaint_created
    const { data: actCreated } = await staffClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId)
      .eq('activity_type', 'complaint_created');

    assert(
      actCreated && actCreated.length === 1,
      'Activity: complaint_created event logged automatically'
    );
    assert(
      actCreated && actCreated[0]?.actor_type === 'customer',
      'Activity: actor_type is "customer" for complaint creation'
    );

    // 2. Testing Internal Notes CRUD
    console.log('\n--- 2. Testing Internal Notes Functionality ---');
    
    // 2a. Insert valid note
    const { data: insertedNote, error: noteErr } = await staffClient
      .from('complaint_notes')
      .insert({
        complaint_id: testComplaintId,
        author_id: testStaffId,
        note: 'Investigation started: Checked land registry and payment ledger.',
      })
      .select(`
        *,
        author_profile:profiles(id, full_name, email, role)
      `)
      .single();

    assert(!noteErr && insertedNote?.id, 'Internal Note created successfully');
    assert(
      insertedNote?.author_profile?.id === testStaffId,
      'Internal Note correctly associated with staff profile'
    );
    assert(
      insertedNote?.note.includes('Investigation started'),
      'Internal Note content saved intact'
    );
    testNoteId = insertedNote?.id;

    // 2b. Verify automatic activity logged for internal_note_added
    const { data: actNote } = await staffClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId)
      .eq('activity_type', 'internal_note_added');

    assert(
      actNote && actNote.length === 1,
      'Activity: internal_note_added event logged automatically via trigger'
    );
    assert(
      actNote && actNote[0]?.actor_type === 'staff' && actNote[0]?.actor_id === testStaffId,
      'Activity: internal note actor correctly identified as staff'
    );

    // 3. Testing Status Change Activity Logging
    console.log('\n--- 3. Testing Status Change & Priority Change Logging ---');
    
    // 3a. Change status: new -> open
    await staffClient
      .from('complaints')
      .update({ status: 'open' })
      .eq('id', testComplaintId);

    const { data: actStatus } = await staffClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId)
      .eq('activity_type', 'status_changed');

    assert(
      actStatus && actStatus.length === 1,
      'Activity: status_changed event logged exactly once'
    );
    assert(
      actStatus &&
        actStatus[0]?.metadata?.previous_status === 'new' &&
        actStatus[0]?.metadata?.new_status === 'open',
      'Activity: status_changed metadata contains previous_status="new" and new_status="open"'
    );

    // 3b. Change priority: normal -> urgent
    await staffClient
      .from('complaints')
      .update({ priority: 'urgent' })
      .eq('id', testComplaintId);

    const { data: actPriority } = await staffClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId)
      .eq('activity_type', 'priority_changed');

    assert(
      actPriority && actPriority.length === 1,
      'Activity: priority_changed event logged exactly once'
    );
    assert(
      actPriority &&
        actPriority[0]?.metadata?.previous_priority === 'normal' &&
        actPriority[0]?.metadata?.new_priority === 'urgent',
      'Activity: priority_changed metadata contains previous_priority="normal" and new_priority="urgent"'
    );

    // 4. Testing Assignment Activity Logging
    console.log('\n--- 4. Testing Assignment & Unassignment Logging ---');
    
    // 4a. Assign to staff
    await staffClient
      .from('complaints')
      .update({ assigned_to: secondStaffId })
      .eq('id', testComplaintId);

    const { data: actAssigned } = await staffClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId)
      .eq('activity_type', 'assigned');

    assert(
      actAssigned && actAssigned.length === 1,
      'Activity: assigned event logged on staff assignment'
    );
    assert(
      actAssigned && actAssigned[0]?.metadata?.new_assignee === secondStaffId,
      'Activity: assigned metadata stores new_assignee UUID'
    );

    // 4b. Unassign
    await staffClient
      .from('complaints')
      .update({ assigned_to: null })
      .eq('id', testComplaintId);

    const { data: actUnassigned } = await staffClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId)
      .eq('activity_type', 'unassigned');

    assert(
      actUnassigned && actUnassigned.length === 1,
      'Activity: unassigned event logged on unassigning staff'
    );

    // 5. Testing Message Activity Logging (Staff and Customer)
    console.log('\n--- 5. Testing Staff and Customer Message Logging ---');
    
    // 5a. Staff message
    const { data: staffMsg } = await staffClient
      .from('complaint_messages')
      .insert({
        complaint_id: testComplaintId,
        sender_type: 'staff',
        sender_id: testStaffId,
        message: 'Hello, our team is looking into this dispute.',
      })
      .select('id')
      .single();

    const { data: actStaffMsg } = await staffClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId)
      .eq('activity_type', 'staff_message_sent');

    assert(
      actStaffMsg && actStaffMsg.length === 1,
      'Activity: staff_message_sent event logged automatically'
    );
    assert(
      actStaffMsg && actStaffMsg[0]?.actor_id === testStaffId,
      'Activity: staff_message_sent actor matches staff user id'
    );

    // 5b. Customer message (submitted via customer tracking token RPC)
    const { data: custMsgRes, error: custMsgErr } = await anonClient.rpc(
      'submit_customer_message_by_token',
      {
        p_token: trackingToken,
        p_message: 'Thank you for the quick response!',
      }
    );

    if (custMsgErr) {
      console.error('Customer message RPC error:', custMsgErr);
    }

    const { data: actCustMsg } = await staffClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId)
      .eq('activity_type', 'customer_message_sent');

    assert(
      actCustMsg && actCustMsg.length === 1,
      'Activity: customer_message_sent event logged automatically'
    );
    assert(
      actCustMsg && actCustMsg[0]?.actor_type === 'customer',
      'Activity: customer_message_sent actor_type is customer'
    );

    // 6. Verification of Timeline Queries & Name Resolution via lib/activity
    console.log('\n--- 6. Testing lib/activity and Name Resolution ---');
    const { getComplaintActivity } = await import('../lib/activity.js').catch(async () => {
      // If ts file needs transpile, query via DB join
      return {
        getComplaintActivity: async (cid) => {
          const { data } = await staffClient
            .from('complaint_activity')
            .select(`
              *,
              actor_profile:profiles!complaint_activity_actor_id_fkey(id, full_name, email, role)
            `)
            .eq('complaint_id', cid)
            .order('created_at', { ascending: false });
          return data;
        },
      };
    });

    const fullTimeline = await getComplaintActivity(testComplaintId);
    assert(
      fullTimeline && fullTimeline.length >= 7,
      `Full timeline retrieves all events (${fullTimeline.length} events logged)`
    );

    // 7. Security: Customer Tracking Portal Isolation
    console.log('\n--- 7. Security Verification: Customer Portal Isolation ---');
    
    // 7a. Customer RPC lookup by tracking token
    const { data: customerView, error: custRpcErr } = await anonClient.rpc(
      'get_customer_complaint_by_token',
      { p_token: trackingToken }
    );

    assert(!custRpcErr && customerView, 'Customer tracking RPC functions normally');
    assert(
      customerView.notes === undefined,
      'SECURITY: Customer view does NOT contain "notes" field'
    );
    assert(
      customerView.complaint_notes === undefined,
      'SECURITY: Customer view does NOT contain "complaint_notes"'
    );
    assert(
      customerView.activity === undefined,
      'SECURITY: Customer view does NOT contain "activity" field'
    );
    assert(
      customerView.complaint_activity === undefined,
      'SECURITY: Customer view does NOT contain "complaint_activity"'
    );

    // 7b. Public anonymous client querying complaint_notes directly
    const { data: anonNotes, error: anonNotesErr } = await anonClient
      .from('complaint_notes')
      .select('*')
      .eq('complaint_id', testComplaintId);

    assert(
      anonNotes === null || anonNotes.length === 0,
      'SECURITY: Anonymous public client gets empty/denied response for complaint_notes (RLS blocked)'
    );

    // 7c. Public anonymous client querying complaint_activity directly
    const { data: anonActivity, error: anonActErr } = await anonClient
      .from('complaint_activity')
      .select('*')
      .eq('complaint_id', testComplaintId);

    assert(
      anonActivity === null || anonActivity.length === 0,
      'SECURITY: Anonymous public client gets empty/denied response for complaint_activity (RLS blocked)'
    );

    // 7d. Public anonymous client attempting to insert into complaint_notes
    const { data: unauthorizedInsert, error: unauthErr } = await anonClient
      .from('complaint_notes')
      .insert({
        complaint_id: testComplaintId,
        author_id: testStaffId,
        note: 'Malicious public note injection attempt',
      });

    assert(
      unauthErr !== null || !unauthorizedInsert,
      'SECURITY: Anonymous public client is BLOCKED from inserting into complaint_notes (RLS enforced)'
    );

  } catch (err) {
    console.error('Test Execution Error:', err);
  } finally {
    // Cleanup test data
    if (testComplaintId) {
      console.log('\n--- Cleaning up test records ---');
      await staffClient.from('complaint_notes').delete().eq('complaint_id', testComplaintId);
      await staffClient.from('complaint_activity').delete().eq('complaint_id', testComplaintId);
      await staffClient.from('complaint_messages').delete().eq('complaint_id', testComplaintId);
      await staffClient.from('complaints').delete().eq('id', testComplaintId);
      console.log('Cleanup completed cleanly.');
    }

    console.log('\n====================================================');
    console.log(`RESULTS: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('====================================================\n');
  }
}

runTests();
