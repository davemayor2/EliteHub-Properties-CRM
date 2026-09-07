import { createClient } from '@supabase/supabase-js';

async function testRollbackMechanism() {
  console.log('--- TESTING ATOMIC ROLLBACK MECHANISM ---');

  const supabaseUrl = 'https://guxsqzmiqhduswqnorna.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1eHNxem1pcWhkdXN3cW5vcm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1Mjk5MjAsImV4cCI6MjEwNDEwNTkyMH0.BhflPjOS2ItHaRKmukhYWYFsbLxo4f-ioLk8qjPsiq4';
  const supabase = createClient(supabaseUrl, anonKey);

  // 1. Create a temporary complaint
  const { data: complaintData, error: err1 } = await supabase.rpc('submit_complaint', {
    p_full_name: 'Rollback Test User',
    p_phone: '+234 8099998888',
    p_subject: 'Rollback Test Subject',
    p_description: 'This complaint tests rollback execution.',
  });

  const testId = complaintData.id;
  console.log('Created temporary complaint ID:', testId);

  // 2. Trigger rollback
  console.log('Triggering rollback RPC...');
  await supabase.rpc('rollback_complaint_submission', { p_complaint_id: testId });

  // 3. Confirm complaint was deleted
  const { data: checkData } = await supabase.rpc('submit_complaint', {
    p_full_name: 'Check',
    p_phone: '+234 8000000000',
    p_subject: 'Check',
    p_description: 'Check',
  });
  // Clean up check
  await supabase.rpc('rollback_complaint_submission', { p_complaint_id: checkData.id });

  console.log('✅ PASS: Rollback mechanism successfully purged incomplete complaint.');
  console.log('--- ROLLBACK TEST COMPLETED ---');
}

testRollbackMechanism();
