import { Resend } from 'resend';
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

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.EMAIL_FROM;

console.log('==================================================');
console.log('EMAIL DELIVERY VERIFICATION — care@elitehubproperties.com');
console.log('==================================================\n');

console.log('Sender:', from);

async function sendTest(label, subject, html) {
  const result = await resend.emails.send({ from, to: 'delivered@resend.dev', subject, html });
  if (result.data?.id) {
    console.log(`✅ ${label} — Message ID: ${result.data.id}`);
  } else {
    console.error(`❌ ${label} — Error: ${result.error?.message}`);
  }
}

await sendTest(
  'Complaint Received Email',
  "We've Received Your Complaint — EH-2026-00001",
  '<div style="font-family:sans-serif;padding:24px;background:#f8fafc"><div style="background:#0B192C;padding:20px;border-bottom:3px solid #D4AF37"><span style="color:#fff;font-size:18px;font-weight:700">EliteHub Properties</span><span style="display:block;color:#D4AF37;font-size:11px;letter-spacing:0.1em">CUSTOMER CARE PORTAL</span></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:8px;margin-top:16px"><span style="background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 14px;border-radius:6px;font-weight:700;font-size:13px">Ref: EH-2026-00001</span><h1 style="color:#0f172a;margin:20px 0 10px">We\'ve Received Your Complaint</h1><p style="color:#334155;line-height:1.6">Thank you for contacting EliteHub Properties Customer Care. Your complaint has been received and our team will review it shortly.</p><a href="http://localhost:3000/track/testtoken" style="display:inline-block;background:#0B192C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;border-left:3px solid #D4AF37;margin-top:16px">Track Your Complaint</a></div></div>'
);

await sendTest(
  'Staff Response Email',
  'New Update Regarding Your Complaint — EH-2026-00001',
  '<div style="font-family:sans-serif;padding:24px;background:#f8fafc"><div style="background:#0B192C;padding:20px;border-bottom:3px solid #D4AF37"><span style="color:#fff;font-size:18px;font-weight:700">EliteHub Properties</span><span style="display:block;color:#D4AF37;font-size:11px;letter-spacing:0.1em">CUSTOMER CARE PORTAL</span></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:8px;margin-top:16px"><h1 style="color:#0f172a">You Have a New Update</h1><p style="color:#334155;line-height:1.6">Our customer care team has provided an update on your complaint.</p><a href="http://localhost:3000/track/testtoken" style="display:inline-block;background:#0B192C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;border-left:3px solid #D4AF37;margin-top:16px">View Update</a></div></div>'
);

await sendTest(
  'Status Update Email (Resolved)',
  'Your Complaint Has Been Resolved — EH-2026-00001',
  '<div style="font-family:sans-serif;padding:24px;background:#f8fafc"><div style="background:#0B192C;padding:20px;border-bottom:3px solid #D4AF37"><span style="color:#fff;font-size:18px;font-weight:700">EliteHub Properties</span><span style="display:block;color:#D4AF37;font-size:11px;letter-spacing:0.1em">CUSTOMER CARE PORTAL</span></div><div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:8px;margin-top:16px"><h1 style="color:#0f172a">Your Complaint Has Been Resolved</h1><p style="color:#334155;line-height:1.6">We believe your complaint has been resolved.</p><a href="http://localhost:3000/track/testtoken" style="display:inline-block;background:#0B192C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;border-left:3px solid #D4AF37;margin-top:16px">Track Your Complaint</a></div></div>'
);

console.log('\n==================================================');
console.log('Check your Resend dashboard: https://resend.com/emails');
console.log('==================================================\n');
