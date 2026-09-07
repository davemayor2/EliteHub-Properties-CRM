import { renderEliteHubEmailHtml } from './templateBase';

export interface ComplaintReceivedEmailProps {
  referenceNumber: string;
  trackingUrl: string;
  customerName?: string;
}

export function renderComplaintReceivedEmail({
  referenceNumber,
  trackingUrl,
  customerName,
}: ComplaintReceivedEmailProps): { subject: string; html: string; text: string } {
  const subject = `[Confirmed] We've Received Your Complaint — Ref: ${referenceNumber}`;
  const greeting = customerName ? `Hello ${customerName},<br><br>` : 'Hello,<br><br>';
  const textGreeting = customerName ? `Hello ${customerName},\n\n` : 'Hello,\n\n';

  const messageBody = `
    ${greeting}Thank you for contacting EliteHub Properties Customer Care. Your complaint has been successfully registered under reference number <strong>${referenceNumber}</strong>, and our care team is already reviewing the details.<br><br>
    You can track the resolution progress, review responses from our specialists, and post replies securely without needing an account or password via your private portal link below.<br><br>
    <div style="background-color: #f8fafc; border-left: 4px solid #F9A430; padding: 14px 16px; margin: 18px 0; border-radius: 6px; font-size: 13.5px; color: #334155; line-height: 1.5;">
      <strong>📬 Important Delivery Note:</strong><br>
      To ensure you do not miss any future case updates or responses from our team, please add <strong>care@elitehubproperties.com</strong> to your safe senders or contacts list. If this or future emails ever arrive in your <strong>Spam or Junk folder</strong>, please open the message and click <strong>"Report Not Spam"</strong> (or move it to your Primary Inbox).
    </div>
  `;

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: "We've Received Your Complaint",
    subheading: 'EliteHub Properties Customer Care Official Confirmation',
    referenceNumber,
    messageBody,
    ctaText: 'Track Your Complaint Online',
    ctaUrl: trackingUrl,
    noteText: 'Please keep this email for your records. The link provided above is your private access point to your complaint timeline.',
  });

  const text = `${textGreeting}Thank you for contacting EliteHub Properties Customer Care. Your complaint has been successfully received under reference number ${referenceNumber}.\n\nOur team is currently reviewing your submission and will provide updates as soon as possible.\n\nTrack your complaint securely online (no password needed):\n${trackingUrl}\n\nIMPORTANT DELIVERY NOTE:\nTo ensure our updates reach your inbox, please add care@elitehubproperties.com to your address book. If this email was delivered to your Spam or Junk folder, please mark it as "Not Spam" or move it to your Primary Inbox.\n\nBest regards,\nEliteHub Properties Customer Care Team\ncare@elitehubproperties.com`;

  return { subject, html, text };
}
