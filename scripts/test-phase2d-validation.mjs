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
console.log('PHASE 2D: END-TO-END SYSTEM VALIDATION & TEST SUITE');
console.log('====================================================\n');

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

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

async function runSuite() {
  console.log('--- TEST SUITE 1: CUSTOMER COMPLAINT SUBMISSION FLOW (NO ATTACHMENT) ---');
  let testComplaintId = null;
  let testRefNumber = null;

  try {
    const payload = {
      p_full_name: 'Adewale Johnson',
      p_email: 'adewale.johnson@example.com',
      p_phone: '+234 802 345 6789',
      p_subject: 'Inquiry regarding Phase 2 Site Visit',
      p_description: 'I scheduled a site inspection for Plot 12 on Saturday and want to confirm the assigned consultant.'
    };

    const { data, error } = await anonClient.rpc('submit_complaint', payload);

    assert(!error && data, 'submit_complaint RPC executes successfully', error?.message);
    assert(data?.id && typeof data.id === 'string', 'Complaint ID (UUID) is returned', data?.id);
    assert(
      data?.reference_number && /^EH-\d{4}-\d{5}$/.test(data.reference_number),
      `Reference number matches format EH-YYYY-XXXXX: "${data?.reference_number}"`
    );
    assert(data?.status === 'new', `Complaint default status is "new" (got "${data?.status}")`);
    assert(data?.created_at && !isNaN(Date.parse(data.created_at)), 'created_at is a valid timestamp');

    testComplaintId = data?.id;
    testRefNumber = data?.reference_number;
  } catch (err) {
    assert(false, 'Exception in Suite 1', err.message);
  }

  console.log('\n--- TEST SUITE 2: ATTACHMENT HANDLING & STORAGE INTEGRITY ---');
  try {
    if (testComplaintId) {
      // Test 1: Upload JPG simulated attachment
      const fakeJpgBuffer = Buffer.from('FAKE-JPEG-CONTENT-1234567890');
      const jpgPath = `complaints/${testComplaintId}/test-evidence-${Date.now()}.jpg`;

      const { data: uploadJpg, error: uploadJpgError } = await anonClient.storage
        .from('complaint-attachments')
        .upload(jpgPath, fakeJpgBuffer, { contentType: 'image/jpeg', upsert: false });

      assert(!uploadJpgError && uploadJpg?.path, 'JPG file uploads to private storage bucket', uploadJpgError?.message);

      // Link attachment via attach_complaint_file RPC
      const { data: attachRecord, error: attachDbError } = await anonClient.rpc('attach_complaint_file', {
        p_complaint_id: testComplaintId,
        p_file_name: 'receipt_payment.jpg',
        p_file_path: jpgPath,
        p_file_type: 'image/jpeg',
        p_file_size: fakeJpgBuffer.length
      });

      assert(!attachDbError && attachRecord?.id, 'attach_complaint_file RPC creates record linked to complaint', attachDbError?.message);
      assert(attachRecord?.complaint_id === testComplaintId, 'Attachment record correctly references complaint UUID');
      assert(attachRecord?.file_name === 'receipt_payment.jpg', 'Original file name is preserved in database');

      // Test 2: Upload PDF simulated attachment
      const fakePdfBuffer = Buffer.from('%PDF-1.4 Fake PDF Content');
      const pdfPath = `complaints/${testComplaintId}/survey-doc-${Date.now()}.pdf`;

      const { data: uploadPdf, error: uploadPdfError } = await anonClient.storage
        .from('complaint-attachments')
        .upload(pdfPath, fakePdfBuffer, { contentType: 'application/pdf', upsert: false });

      assert(!uploadPdfError && uploadPdf?.path, 'PDF file uploads to private storage bucket', uploadPdfError?.message);

      const { data: attachPdfRecord, error: attachPdfError } = await anonClient.rpc('attach_complaint_file', {
        p_complaint_id: testComplaintId,
        p_file_name: 'survey_plan.pdf',
        p_file_path: pdfPath,
        p_file_type: 'application/pdf',
        p_file_size: fakePdfBuffer.length
      });

      assert(!attachPdfError && attachPdfRecord?.id, 'PDF attachment record linked successfully', attachPdfError?.message);

      // Test 3: Upload PNG simulated attachment
      const fakePngBuffer = Buffer.from('FAKE-PNG-IMAGE-STREAM');
      const pngPath = `complaints/${testComplaintId}/screenshot-${Date.now()}.png`;

      const { data: uploadPng, error: uploadPngError } = await anonClient.storage
        .from('complaint-attachments')
        .upload(pngPath, fakePngBuffer, { contentType: 'image/png', upsert: false });

      assert(!uploadPngError && uploadPng?.path, 'PNG file uploads to private storage bucket', uploadPngError?.message);

      // Clean up test storage files
      await anonClient.storage.from('complaint-attachments').remove([jpgPath, pdfPath, pngPath]);
    }
  } catch (err) {
    assert(false, 'Exception in Suite 2', err.message);
  }

  console.log('\n--- TEST SUITE 3: VALIDATION & ERROR HANDLING ---');
  try {
    // 1. Missing full name
    const { error: errNoName } = await anonClient.rpc('submit_complaint', {
      p_full_name: '',
      p_phone: '+234 801 234 5678',
      p_subject: 'Test Subject',
      p_description: 'Test Description'
    });
    assert(!!errNoName, 'Missing Full Name is rejected by DB RPC validation', errNoName?.message);

    // 2. Missing phone number
    const { error: errNoPhone } = await anonClient.rpc('submit_complaint', {
      p_full_name: 'Test Name',
      p_phone: '   ',
      p_subject: 'Test Subject',
      p_description: 'Test Description'
    });
    assert(!!errNoPhone, 'Missing Phone Number is rejected by DB RPC validation', errNoPhone?.message);

    // 3. Missing subject
    const { error: errNoSubject } = await anonClient.rpc('submit_complaint', {
      p_full_name: 'Test Name',
      p_phone: '+234 801 234 5678',
      p_subject: '',
      p_description: 'Test Description'
    });
    assert(!!errNoSubject, 'Missing Subject is rejected by DB RPC validation', errNoSubject?.message);

    // 4. Missing description
    const { error: errNoDesc } = await anonClient.rpc('submit_complaint', {
      p_full_name: 'Test Name',
      p_phone: '+234 801 234 5678',
      p_subject: 'Test Subject',
      p_description: '  '
    });
    assert(!!errNoDesc, 'Missing Description is rejected by DB RPC validation', errNoDesc?.message);

    // 5. Invalid Foreign Key UUID for attachment
    const fakeComplaintId = '00000000-0000-0000-0000-000000000000';
    const { error: errOrphanAttach } = await anonClient.rpc('attach_complaint_file', {
      p_complaint_id: fakeComplaintId,
      p_file_name: 'orphan.png',
      p_file_path: 'complaints/fake/orphan.png',
      p_file_type: 'image/png',
      p_file_size: 1024
    });
    assert(!!errOrphanAttach, 'Orphan attachment with non-existent complaint_id is rejected', errOrphanAttach?.message);
  } catch (err) {
    assert(false, 'Exception in Suite 3', err.message);
  }

  console.log('\n--- TEST SUITE 4: SECURITY & ROW LEVEL SECURITY (RLS) POLICIES ---');
  try {
    // Test 1: Public SELECT on complaints table (RLS should block or return empty array)
    const { data: selectComplaints } = await anonClient
      .from('complaints')
      .select('*');

    assert(
      !selectComplaints || selectComplaints.length === 0,
      `Public client CANNOT SELECT all complaints (RLS active, returned ${selectComplaints?.length || 0} rows)`
    );

    // Test 2: Public UPDATE on complaints table
    const { data: updateData } = await anonClient
      .from('complaints')
      .update({ status: 'closed' })
      .eq('id', testComplaintId || '00000000-0000-0000-0000-000000000000')
      .select();

    assert(
      !updateData || updateData.length === 0,
      'Public client CANNOT UPDATE complaints directly (RLS active)'
    );

    // Test 3: Public DELETE on complaints table
    const { data: deleteData } = await anonClient
      .from('complaints')
      .delete()
      .eq('id', testComplaintId || '00000000-0000-0000-0000-000000000000')
      .select();

    assert(
      !deleteData || deleteData.length === 0,
      'Public client CANNOT DELETE complaints directly (RLS active)'
    );

    // Test 4: Public SELECT on complaint_attachments table
    const { data: selectAttachments } = await anonClient
      .from('complaint_attachments')
      .select('*');

    assert(
      !selectAttachments || selectAttachments.length === 0,
      `Public client CANNOT SELECT complaint_attachments (RLS active, returned ${selectAttachments?.length || 0} rows)`
    );

    // Test 5: Direct bucket listing without auth
    const { data: listBucket, error: listBucketErr } = await anonClient.storage
      .from('complaint-attachments')
      .list('');

    assert(
      !listBucket || listBucket.length === 0 || !!listBucketErr,
      'Public client CANNOT browse/list private storage bucket files directly'
    );
  } catch (err) {
    assert(false, 'Exception in Suite 4', err.message);
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite();
