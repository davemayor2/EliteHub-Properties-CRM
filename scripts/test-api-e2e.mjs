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

loadEnv();

console.log('====================================================');
console.log('PHASE 2D: API ENDPOINT E2E & CLIENT INTEGRATION TEST');
console.log('====================================================\n');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

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

async function runApiTests() {
  console.log(`Target Base URL: ${BASE_URL}\n`);

  // 1. Test POST /api/complaints with JSON payload (No Attachment)
  console.log('--- TEST 1: POST /api/complaints JSON Payload ---');
  try {
    const res = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Folake Adebayo',
        email: 'folake.adebayo@example.com',
        phone: '+234 813 456 7890',
        subject: 'Service Charge Allocation Query',
        description: 'I would like a detailed breakdown of the Q3 estate service charge invoice received yesterday.'
      })
    });

    const data = await res.json();
    assert(res.status === 200 && data.success === true, 'JSON submission succeeds with status 200', JSON.stringify(data));
    assert(data.referenceNumber && /^EH-\d{4}-\d{5}$/.test(data.referenceNumber), `Reference number format verified: ${data.referenceNumber}`);
    assert(data.id && typeof data.id === 'string', `UUID generated: ${data.id}`);
  } catch (err) {
    assert(false, 'Exception in Test 1', err.message);
  }

  // 2. Test POST /api/complaints with FormData + File Attachment
  console.log('\n--- TEST 2: POST /api/complaints FormData with PDF Attachment ---');
  try {
    const formData = new FormData();
    formData.append('fullName', 'Emeka Nwosu');
    formData.append('email', 'emeka.nwosu@example.com');
    formData.append('phone', '+234 705 678 9012');
    formData.append('subject', 'Payment Receipt Verification');
    formData.append('description', 'Attached is the bank transfer receipt for plot reservation confirmation.');

    const pdfBlob = new Blob(['%PDF-1.4 Simulated PDF Document Content'], { type: 'application/pdf' });
    formData.append('attachment', pdfBlob, 'bank_transfer_receipt.pdf');

    const res = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    assert(res.status === 200 && data.success === true, 'FormData + PDF submission succeeds with status 200', JSON.stringify(data));
    assert(!!data.attachmentPath && data.attachmentPath.startsWith('complaints/'), `Attachment uploaded to storage path: ${data.attachmentPath}`);
    assert(!!data.attachmentId, `Attachment database record created with ID: ${data.attachmentId}`);
  } catch (err) {
    assert(false, 'Exception in Test 2', err.message);
  }

  // 3. Test Validation Rejections
  console.log('\n--- TEST 3: Validation Error Handling ---');
  try {
    // Missing required fields
    const resEmpty = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: '', phone: '', subject: '', description: '' })
    });
    const dataEmpty = await resEmpty.json();
    assert(resEmpty.status === 400 && dataEmpty.success === false, 'Empty payload rejected with status 400');
    assert(!!dataEmpty.errors?.fullName, 'Error message for missing fullName present');
    assert(!!dataEmpty.errors?.phone, 'Error message for missing phone present');
    assert(!!dataEmpty.errors?.subject, 'Error message for missing subject present');
    assert(!!dataEmpty.errors?.description, 'Error message for missing description present');

    // Invalid email format
    const resBadEmail = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Tunde Bakare',
        email: 'not-a-valid-email',
        phone: '+234 809 123 4567',
        subject: 'Valid Subject',
        description: 'Valid Description'
      })
    });
    const dataBadEmail = await resBadEmail.json();
    assert(resBadEmail.status === 400 && !!dataBadEmail.errors?.email, 'Invalid email rejected with user-friendly error');

    // Invalid phone number
    const resBadPhone = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Tunde Bakare',
        phone: '123',
        subject: 'Valid Subject',
        description: 'Valid Description'
      })
    });
    const dataBadPhone = await resBadPhone.json();
    assert(resBadPhone.status === 400 && !!dataBadPhone.errors?.phone, 'Short/invalid phone number rejected');
  } catch (err) {
    assert(false, 'Exception in Test 3', err.message);
  }

  // 4. Test Unsupported Attachment Type
  console.log('\n--- TEST 4: Unsupported Attachment Rejection ---');
  try {
    const formData = new FormData();
    formData.append('fullName', 'Ibrahim Musa');
    formData.append('phone', '+234 808 765 4321');
    formData.append('subject', 'Malicious File Test');
    formData.append('description', 'Testing upload of unsupported file extension.');

    const exeBlob = new Blob(['Simulated executable content'], { type: 'application/x-msdownload' });
    formData.append('attachment', exeBlob, 'malware.exe');

    const res = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    assert(res.status === 400 && data.success === false, 'Executable file upload rejected with status 400');
    assert(!!data.errors?.attachment, `Attachment rejection message: "${data.errors?.attachment}"`);
  } catch (err) {
    assert(false, 'Exception in Test 4', err.message);
  }

  // 5. Test Rapid Concurrent Submissions
  console.log('\n--- TEST 5: Rapid Concurrent Submissions (Race Condition & ID Uniqueness) ---');
  try {
    const concurrentCount = 5;
    const promises = Array.from({ length: concurrentCount }, (_, i) =>
      fetch(`${BASE_URL}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `Concurrent User ${i + 1}`,
          phone: `+234 800 000 000${i + 1}`,
          subject: `Concurrent Complaint ${i + 1}`,
          description: `Testing database sequence integrity under simultaneous load (${i + 1}).`
        })
      }).then((r) => r.json())
    );

    const results = await Promise.all(promises);
    const refNumbers = results.map((r) => r.referenceNumber);
    const uniqueRefs = new Set(refNumbers);

    assert(
      results.every((r) => r.success === true),
      `All ${concurrentCount} concurrent submissions succeeded with status 200`
    );
    assert(
      uniqueRefs.size === concurrentCount,
      `All ${concurrentCount} generated reference numbers are strictly unique: ${Array.from(uniqueRefs).join(', ')}`
    );
  } catch (err) {
    assert(false, 'Exception in Test 5', err.message);
  }

  console.log('\n====================================================');
  console.log(`TOTAL API TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runApiTests();
