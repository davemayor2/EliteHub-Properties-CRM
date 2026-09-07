import fs from 'fs';
import path from 'path';

async function testAttachmentSuite() {
  console.log('====================================================');
  console.log('STARTING PHASE 2C: ATTACHMENT UPLOAD TEST SUITE');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:3000';

  // Helper function to submit multipart/form-data
  async function submitForm({ fullName, email, phone, subject, description, fileBuffer, fileName, fileMime }) {
    const formData = new FormData();
    if (fullName !== undefined) formData.append('fullName', fullName);
    if (email !== undefined) formData.append('email', email);
    if (phone !== undefined) formData.append('phone', phone);
    if (subject !== undefined) formData.append('subject', subject);
    if (description !== undefined) formData.append('description', description);

    if (fileBuffer && fileName) {
      const blob = new Blob([fileBuffer], { type: fileMime || 'application/octet-stream' });
      formData.append('attachment', blob, fileName);
    }

    const res = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    return { status: res.status, data: json };
  }

  // 1. Submit complaint without attachment
  console.log('Scenario 1: Submit complaint without attachment...');
  const res1 = await submitForm({
    fullName: 'David Adeleke',
    phone: '+234 8011223344',
    subject: 'Complaint Without Attachment',
    description: 'Testing submission with no file attached.'
  });
  console.log('Status:', res1.status, '| Reference:', res1.data.referenceNumber);
  if (res1.status === 200 && res1.data.success && !res1.data.attachmentPath) {
    console.log('✅ Scenario 1 PASSED: Complaint submitted cleanly without attachment.\n');
  } else {
    console.error('❌ Scenario 1 FAILED\n');
  }

  // 2. Submit complaint with JPG
  console.log('Scenario 2: Submit complaint with JPG...');
  const jpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const res2 = await submitForm({
    fullName: 'Blessing Okoro',
    phone: '+234 8022334455',
    subject: 'Water seepage photo',
    description: 'Attached JPG photo showing the leak in the bathroom.',
    fileBuffer: jpgBuffer,
    fileName: 'leakage_photo.jpg',
    fileMime: 'image/jpeg'
  });
  console.log('Status:', res2.status, '| Ref:', res2.data.referenceNumber, '| Attachment Path:', res2.data.attachmentPath);
  if (res2.status === 200 && res2.data.success && res2.data.attachmentPath?.endsWith('-leakage_photo.jpg')) {
    console.log('✅ Scenario 2 PASSED: JPG uploaded and linked successfully.\n');
  } else {
    console.error('❌ Scenario 2 FAILED\n');
  }

  // 3. Submit complaint with PNG
  console.log('Scenario 3: Submit complaint with PNG...');
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const res3 = await submitForm({
    fullName: 'Chidi Mokeme',
    phone: '+234 8033445566',
    subject: 'Receipt screenshot',
    description: 'Attached PNG payment receipt.',
    fileBuffer: pngBuffer,
    fileName: 'payment_receipt.png',
    fileMime: 'image/png'
  });
  console.log('Status:', res3.status, '| Ref:', res3.data.referenceNumber, '| Attachment Path:', res3.data.attachmentPath);
  if (res3.status === 200 && res3.data.success && res3.data.attachmentPath?.endsWith('-payment_receipt.png')) {
    console.log('✅ Scenario 3 PASSED: PNG uploaded and linked successfully.\n');
  } else {
    console.error('❌ Scenario 3 FAILED\n');
  }

  // 4. Submit complaint with JPEG
  console.log('Scenario 4: Submit complaint with JPEG...');
  const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]);
  const res4 = await submitForm({
    fullName: 'Kolawole Sanusi',
    phone: '+234 8044556677',
    subject: 'Cracked Tile JPEG',
    description: 'Attached JPEG photo of cracked floor tiles.',
    fileBuffer: jpegBuffer,
    fileName: 'tile_crack.jpeg',
    fileMime: 'image/jpeg'
  });
  console.log('Status:', res4.status, '| Ref:', res4.data.referenceNumber, '| Attachment Path:', res4.data.attachmentPath);
  if (res4.status === 200 && res4.data.success && res4.data.attachmentPath?.endsWith('-tile_crack.jpeg')) {
    console.log('✅ Scenario 4 PASSED: JPEG uploaded and linked successfully.\n');
  } else {
    console.error('❌ Scenario 4 FAILED\n');
  }

  // 5. Submit complaint with PDF
  console.log('Scenario 5: Submit complaint with PDF...');
  const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const res5 = await submitForm({
    fullName: 'Zainab Abubakar',
    phone: '+234 8055667788',
    subject: 'Survey Plan Document',
    description: 'Attached survey plan PDF for verification.',
    fileBuffer: pdfBuffer,
    fileName: 'survey_plan.pdf',
    fileMime: 'application/pdf'
  });
  console.log('Status:', res5.status, '| Ref:', res5.data.referenceNumber, '| Attachment Path:', res5.data.attachmentPath);
  if (res5.status === 200 && res5.data.success && res5.data.attachmentPath?.endsWith('-survey_plan.pdf')) {
    console.log('✅ Scenario 5 PASSED: PDF uploaded and linked successfully.\n');
  } else {
    console.error('❌ Scenario 5 FAILED\n');
  }

  // 6. Reject unsupported file types (.txt, .exe, .zip)
  console.log('Scenario 6: Reject unsupported file types (.txt)...');
  const textBuffer = Buffer.from('Unsupported text file content');
  const res6 = await submitForm({
    fullName: 'Suspicious Submitter',
    phone: '+234 8066778899',
    subject: 'Attempting invalid file',
    description: 'Submitting .txt file.',
    fileBuffer: textBuffer,
    fileName: 'notes.txt',
    fileMime: 'text/plain'
  });
  console.log('Status:', res6.status, '| Message:', res6.data.message, '| Error:', res6.data.errors?.attachment);
  if (res6.status === 400 && res6.data.errors?.attachment?.includes('Unsupported file type')) {
    console.log('✅ Scenario 6 PASSED: Unsupported file type rejected with HTTP 400.\n');
  } else {
    console.error('❌ Scenario 6 FAILED\n');
  }

  // 7. Reject files larger than 10MB
  console.log('Scenario 7: Reject files larger than 10MB...');
  const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
  const res7 = await submitForm({
    fullName: 'Oversized Uploader',
    phone: '+234 8077889900',
    subject: 'File too large',
    description: 'Submitting 11MB file.',
    fileBuffer: oversizedBuffer,
    fileName: 'huge_document.pdf',
    fileMime: 'application/pdf'
  });
  console.log('Status:', res7.status, '| Message:', res7.data.message, '| Error:', res7.data.errors?.attachment);
  if (res7.status === 400 && res7.data.errors?.attachment?.includes('exceeds the maximum limit')) {
    console.log('✅ Scenario 7 PASSED: File > 10MB rejected with HTTP 400.\n');
  } else {
    console.error('❌ Scenario 7 FAILED\n');
  }

  console.log('====================================================');
  console.log('ALL ATTACHMENT SUITE SCENARIOS COMPLETED');
  console.log('====================================================');
}

testAttachmentSuite();
