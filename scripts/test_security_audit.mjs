import { createClient } from '@supabase/supabase-js';

async function testSecurityAudit() {
  console.log('--- SECURITY AUDIT: TESTING PUBLIC/ANONYMOUS ACCESS ---');

  const supabaseUrl = 'https://guxsqzmiqhduswqnorna.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1eHNxem1pcWhkdXN3cW5vcm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjk5MjAsImV4cCI6MjEwNDEwNTkyMH0.BhflPjOS2ItHaRKmukhYWYFsbLxo4f-ioLk8qjPsiq4';

  const anonClient = createClient(supabaseUrl, anonKey);

  // 1. Attempt to list complaints anonymously
  console.log('1. Testing anonymous SELECT on complaints table...');
  const { data: complaints, error: complaintsError } = await anonClient
    .from('complaints')
    .select('*');
  console.log('Complaints returned:', complaints?.length ?? 0);
  if ((complaints?.length ?? 0) === 0) {
    console.log('✅ PASS: Anonymous users cannot read any complaints records.');
  } else {
    console.error('❌ FAIL: Anonymous users read complaints!');
  }

  // 2. Attempt to list complaint_attachments anonymously
  console.log('\n2. Testing anonymous SELECT on complaint_attachments table...');
  const { data: attachments, error: attachError } = await anonClient
    .from('complaint_attachments')
    .select('*');
  console.log('Attachments returned:', attachments?.length ?? 0);
  if ((attachments?.length ?? 0) === 0) {
    console.log('✅ PASS: Anonymous users cannot read complaint_attachments records.');
  } else {
    console.error('❌ FAIL: Anonymous users read attachments!');
  }

  // 3. Attempt to list files in the private bucket
  console.log('\n3. Testing anonymous storage listing on bucket "complaint-attachments"...');
  const { data: files, error: listError } = await anonClient
    .storage
    .from('complaint-attachments')
    .list('complaints');
  console.log('Storage files returned:', files?.length ?? 0, '| Error:', listError?.message);
  if (!files || files.length === 0) {
    console.log('✅ PASS: Anonymous users cannot list or browse storage bucket objects.');
  } else {
    console.error('❌ FAIL: Anonymous users listed storage objects!');
  }

  // 4. Attempt to download a private file anonymously via public URL
  console.log('\n4. Testing anonymous download via public URL on private bucket...');
  const samplePath = 'complaints/c77b2fb6-7173-4dda-815f-a9352e1b3e18/89537f6a-9294-40a0-a6aa-bb1f4f33fb1c-survey_plan.pdf';
  const { data: pubUrlData } = anonClient.storage.from('complaint-attachments').getPublicUrl(samplePath);
  const downloadRes = await fetch(pubUrlData.publicUrl);
  console.log('HTTP Status from public URL download attempt:', downloadRes.status);
  if (downloadRes.status === 400 || downloadRes.status === 403 || downloadRes.status === 404) {
    console.log('✅ PASS: Public URL download blocked (HTTP', downloadRes.status, ') because bucket is private.');
  } else {
    console.error('❌ FAIL: File accessible publicly!');
  }

  console.log('\n--- SECURITY AUDIT COMPLETED ---');
}

testSecurityAudit();
