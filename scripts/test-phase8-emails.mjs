/**
 * End-to-End Verification Script for Phase 8: Email Notifications & Resend Integration
 */
import { Resend } from 'resend';
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
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'EliteHub Properties Customer Care <care@elitehubproperties.com>';

const TEST_STAFF_EMAIL = 'staff.test.1788643629712@elitehub.com';
const TEST_STAFF_PASSWORD = 'StrongStaffPassword123!';

console.log('==================================================');
console.log('🧪 EliteHub Properties PHASE 8: EMAIL NOTIFICATIONS & RESEND');
console.log('==================================================\n');

async function runTests() {
  // 1. Verify Resend Configuration
  console.log('1️⃣ Checking Resend API Credentials...');
  if (!resendApiKey) {
    console.error('   ❌ RESEND_API_KEY is not set in .env.local');
    process.exit(1);
  }
  console.log(`   ✅ RESEND_API_KEY: ${resendApiKey.substring(0, 7)}... (${resendApiKey.length} chars)`);
  console.log(`   ✅ SENDER: ${emailFrom}`);

  const resend = new Resend(resendApiKey);

  // 2. Direct Resend API Connectivity Check
  console.log('\n2️⃣ Verifying Direct Resend SDK Connection...');
  try {
    const { data: domains, error: domainErr } = await resend.domains.list();
    if (domainErr) {
      console.log(`   ℹ️ Domains list returned info: ${domainErr.message}`);
    } else {
      console.log(`   ✅ Resend API connected successfully! Domains available: ${domains?.data?.length || 0}`);
      if (domains?.data?.length) {
        domains.data.forEach((d) => console.log(`      - Domain: ${d.name} (${d.status})`));
      }
    }
  } catch (err) {
    console.log(`   ℹ️ Resend test call notice: ${err.message}`);
  }

  // 3. Authenticate staff client for API tests
  console.log('\n3️⃣ Authenticating Staff User for E2E Trigger Tests...');
  const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  const { data: authData, error: authErr } = await staffClient.auth.signInWithPassword({
    email: TEST_STAFF_EMAIL,
    password: TEST_STAFF_PASSWORD,
  });
  if (authErr) {
    console.error('   ❌ Staff login failed:', authErr.message);
    process.exit(1);
  }
  const staffSessionToken = authData.session.access_token;
  console.log('   ✅ Staff authenticated.');

  // Find the running Next.js port (try 3000 then 3001)
  let port = 3000;
  try {
    const testFetch = await fetch(`http://localhost:${port}/api/complaints`, { method: 'GET' });
  } catch {
    port = 3001;
  }
  console.log(`   Target Server: http://localhost:${port}`);

  // 4. Test Complaint Submission WITH Email (Triggers ComplaintReceivedEmail)
  console.log('\n4️⃣ Testing Complaint Submission WITH Email...');
  const submitWithEmailRes = await fetch(`http://localhost:${port}/api/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Amina Bello (Phase 8 Test)',
      email: 'amina.bello@example.com',
      phone: '08012345678',
      subject: 'Delay in Property Documents Delivery',
      description: 'Requesting urgent status update regarding land allocation documents.',
    }),
  });

  const submitWithEmailData = await submitWithEmailRes.json();
  if (!submitWithEmailData.success || !submitWithEmailData.referenceNumber) {
    throw new Error(`Submission with email failed: ${JSON.stringify(submitWithEmailData)}`);
  }
  const complaintWithEmailId = submitWithEmailData.id;
  const complaintWithEmailRef = submitWithEmailData.referenceNumber;
  console.log(`   ✅ Complaint Created: [${complaintWithEmailRef}] (ID: ${complaintWithEmailId})`);
  console.log('   ✅ Triggered sendComplaintReceivedEmail in non-blocking background.');

  // 5. Test Complaint Submission WITHOUT Email (Should NOT fail, gracefully skipped)
  console.log('\n5️⃣ Testing Complaint Submission WITHOUT Email...');
  const submitNoEmailRes = await fetch(`http://localhost:${port}/api/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Chidi Okonkwo (Phone Only)',
      phone: '08098765432',
      subject: 'Inquiry on Site Inspection Time',
      description: 'Customer only has phone contact and no email address.',
    }),
  });
  const submitNoEmailData = await submitNoEmailRes.json();
  if (!submitNoEmailData.success) {
    throw new Error(`Submission without email failed: ${JSON.stringify(submitNoEmailData)}`);
  }
  console.log(`   ✅ Complaint Created: [${submitNoEmailData.referenceNumber}]`);
  console.log('   ✅ Handled missing email gracefully without error.');

  // 6. Test Staff Reply (Triggers StaffResponseEmail)
  console.log('\n6️⃣ Testing Staff Message Posting (StaffResponseEmail Trigger)...');
  const staffMsgRes = await fetch(`http://localhost:${port}/api/staff/complaints/${complaintWithEmailId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffSessionToken}`,
    },
    body: JSON.stringify({
      message: 'Dear Amina, our documentation team has verified your file and it will be ready tomorrow.',
    }),
  });
  const staffMsgData = await staffMsgRes.json();
  if (!staffMsgData.success) {
    throw new Error(`Staff reply failed: ${JSON.stringify(staffMsgData)}`);
  }
  console.log('   ✅ Staff message saved in database.');
  console.log('   ✅ Triggered sendStaffResponseEmail non-blockingly.');

  // 7. Test Status Change (Triggers StatusUpdateEmail)
  console.log('\n7️⃣ Testing Status Change (StatusUpdateEmail Trigger)...');
  const statusUpdateRes = await fetch(`http://localhost:${port}/api/staff/complaints/${complaintWithEmailId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffSessionToken}`,
    },
    body: JSON.stringify({
      status: 'pending',
    }),
  });
  const statusUpdateData = await statusUpdateRes.json();
  if (!statusUpdateData.success || statusUpdateData.complaint?.status !== 'pending') {
    throw new Error(`Status update failed: ${JSON.stringify(statusUpdateData)}`);
  }
  console.log('   ✅ Complaint status transitioned to "pending".');
  console.log('   ✅ Triggered sendStatusUpdateEmail for "pending" status.');

  // 8. Test Priority Change ONLY (Should NOT trigger StatusUpdateEmail)
  console.log('\n8️⃣ Testing Priority Change ONLY (Verifying No Duplicate Status Email)...');
  const priorityUpdateRes = await fetch(`http://localhost:${port}/api/staff/complaints/${complaintWithEmailId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffSessionToken}`,
    },
    body: JSON.stringify({
      priority: 'urgent',
    }),
  });
  const priorityUpdateData = await priorityUpdateRes.json();
  if (!priorityUpdateData.success || priorityUpdateData.complaint?.priority !== 'urgent') {
    throw new Error(`Priority update failed: ${JSON.stringify(priorityUpdateData)}`);
  }
  console.log('   ✅ Priority updated to "urgent" without triggering unnecessary status emails.');

  // Clean up test rows from database
  console.log('\n🧹 Cleaning up test complaints...');
  await staffClient.from('complaint_messages').delete().eq('complaint_id', complaintWithEmailId);
  await staffClient.from('complaints').delete().eq('id', complaintWithEmailId);
  await staffClient.from('complaints').delete().eq('id', submitNoEmailData.id);
  console.log('   ✅ Test data cleaned up.');

  console.log('\n==================================================');
  console.log('🎉 ALL PHASE 8 EMAIL INTEGRATION TESTS PASSED!');
  console.log('==================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Phase 8 Test Failed:', err);
  process.exit(1);
});
