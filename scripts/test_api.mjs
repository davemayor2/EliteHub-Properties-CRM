async function runTests() {
  console.log('--- STARTING COMPLAINT SUBMISSION API TESTS ---\n');

  // Test 1: Valid submission with all fields
  console.log('Test 1: Valid submission with all fields...');
  try {
    const res1 = await fetch('http://localhost:3000/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Adebayo Johnson',
        email: 'adebayo.johnson@example.com',
        phone: '+234 8012345678',
        subject: 'Delay in Property Document Delivery',
        description: 'I completed payment for Plot 45 two weeks ago and have not received the deed of assignment.'
      }),
    });
    const data1 = await res1.json();
    console.log('Status:', res1.status);
    console.log('Response:', data1);
    if (res1.status === 200 && data1.success && data1.referenceNumber?.startsWith('EH-')) {
      console.log('✅ Test 1 PASSED: Successfully created complaint with ref:', data1.referenceNumber);
    } else {
      console.error('❌ Test 1 FAILED');
    }
  } catch (err) {
    console.error('❌ Test 1 ERROR:', err);
  }

  // Test 2: Valid submission without optional email
  console.log('\nTest 2: Valid submission without optional email...');
  try {
    const res2 = await fetch('http://localhost:3000/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Fatima Bello',
        phone: '+234 8098765432',
        subject: 'Inquiry regarding inspection schedule',
        description: 'I need to reschedule the physical site inspection for tomorrow.'
      }),
    });
    const data2 = await res2.json();
    console.log('Status:', res2.status);
    console.log('Response:', data2);
    if (res2.status === 200 && data2.success && data2.referenceNumber?.startsWith('EH-')) {
      console.log('✅ Test 2 PASSED: Successfully created complaint without email:', data2.referenceNumber);
    } else {
      console.error('❌ Test 2 FAILED');
    }
  } catch (err) {
    console.error('❌ Test 2 ERROR:', err);
  }

  // Test 3: Missing required fields
  console.log('\nTest 3: Missing required fields (should return 400)...');
  try {
    const res3 = await fetch('http://localhost:3000/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: '',
        phone: '',
        subject: '',
        description: ''
      }),
    });
    const data3 = await res3.json();
    console.log('Status:', res3.status);
    console.log('Response:', data3);
    if (res3.status === 400 && !data3.success && data3.errors?.fullName && data3.errors?.phone) {
      console.log('✅ Test 3 PASSED: Correctly returned 400 with field errors');
    } else {
      console.error('❌ Test 3 FAILED');
    }
  } catch (err) {
    console.error('❌ Test 3 ERROR:', err);
  }

  // Test 4: Invalid email format
  console.log('\nTest 4: Invalid email format (should return 400)...');
  try {
    const res4 = await fetch('http://localhost:3000/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Emeka Okonkwo',
        email: 'invalid-email-format',
        phone: '+234 8033334444',
        subject: 'Payment verification',
        description: 'Please verify my bank transfer receipt.'
      }),
    });
    const data4 = await res4.json();
    console.log('Status:', res4.status);
    console.log('Response:', data4);
    if (res4.status === 400 && !data4.success && data4.errors?.email) {
      console.log('✅ Test 4 PASSED: Correctly rejected invalid email format');
    } else {
      console.error('❌ Test 4 FAILED');
    }
  } catch (err) {
    console.error('❌ Test 4 ERROR:', err);
  }

  // Test 5: Field manipulation / tampering attempt
  console.log('\nTest 5: Client attempting to inject status=closed, reference_number=FORGED-001...');
  try {
    const res5 = await fetch('http://localhost:3000/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Hacker Tamperer',
        phone: '+234 8011112222',
        subject: 'Attempting to inject fields',
        description: 'Should be saved with status new and real sequence ref.',
        status: 'closed',
        reference_number: 'FORGED-99999',
        priority: 'urgent'
      }),
    });
    const data5 = await res5.json();
    console.log('Status:', res5.status);
    console.log('Response:', data5);
    if (res5.status === 200 && data5.success && data5.referenceNumber?.startsWith('EH-') && data5.referenceNumber !== 'FORGED-99999') {
      console.log('✅ Test 5 PASSED: Server ignored tampered fields, assigned real ref:', data5.referenceNumber);
    } else {
      console.error('❌ Test 5 FAILED');
    }
  } catch (err) {
    console.error('❌ Test 5 ERROR:', err);
  }

  console.log('\n--- API TESTS COMPLETED ---');
}

runTests();
