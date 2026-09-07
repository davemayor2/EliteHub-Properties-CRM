import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

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

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'EliteHub Properties Customer Care <care@elitehubproperties.com>';
const careEmail = process.env.CARE_NOTIFICATION_EMAIL || 'care@elitehubproperties.com';

console.log('Testing Care Notification configuration...');
console.log('Resend Key present:', !!resendApiKey);
console.log('From Address:', emailFrom);
console.log('Care Team Notification Inbox:', careEmail);

if (!resendApiKey) {
  console.error('❌ Missing RESEND_API_KEY');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

async function testCareNotification() {
  const testRef = `EH-TEST-${Date.now().toString().slice(-4)}`;
  console.log(`\nDispatching test new complaint alert to ${careEmail} (${testRef})...`);

  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to: careEmail,
    subject: `[New Complaint Test] ${testRef} — Plumbing leak in Unit 4B`,
    html: `
      <h2>New Complaint Received (Care Team Alert Test)</h2>
      <p><strong>Reference:</strong> ${testRef}</p>
      <p><strong>Customer:</strong> Test Tenant</p>
      <p><strong>Phone:</strong> +234 801 234 5678</p>
      <p><strong>Email:</strong> tenant@example.com</p>
      <p><strong>Subject:</strong> Plumbing leak in Unit 4B</p>
      <p><strong>Status:</strong> New</p>
      <hr>
      <p>This verifies care@elitehubproperties.com receives alert notifications on every new complaint.</p>
    `,
  });

  if (error) {
    console.error('❌ Failed to dispatch email:', error);
    process.exit(1);
  }

  console.log('✅ Email successfully sent to care inbox! Resend ID:', data?.id);
}

testCareNotification().catch((err) => {
  console.error('❌ Error during test:', err);
  process.exit(1);
});
