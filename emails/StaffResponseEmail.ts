import { renderEliteHubEmailHtml } from './templateBase';

export interface StaffResponseEmailProps {
  referenceNumber: string;
  trackingUrl: string;
  customerName?: string;
}

export function renderStaffResponseEmail({
  referenceNumber,
  trackingUrl,
  customerName,
}: StaffResponseEmailProps): { subject: string; html: string; text: string } {
  const subject = `[Update] New Response to Your Complaint — Ref: ${referenceNumber}`;
  const greeting = customerName ? `Hello ${customerName},<br><br>` : 'Hello,<br><br>';
  const textGreeting = customerName ? `Hello ${customerName},\n\n` : 'Hello,\n\n';

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: 'You Have a New Update',
    subheading: 'EliteHub Properties Customer Care Response',
    referenceNumber,
    messageBody: `${greeting}Our customer care team has posted a new update regarding your complaint (Ref: <strong>${referenceNumber}</strong>).<br><br>Please click the button below to view the message securely in your private tracking portal and submit a response if needed.<br><br><div style="background-color: #f8fafc; border-left: 4px solid #F9A430; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #475569; line-height: 1.5;"><strong>Delivery Reminder:</strong> If our messages ever arrive in your <strong>Spam or Junk folder</strong>, please mark them as <strong>"Not Spam"</strong> and add <strong>care@elitehubproperties.com</strong> to your contacts list.</div>`,
    ctaText: 'View Update Online',
    ctaUrl: trackingUrl,
    noteText: 'To keep your personal information secure, the full conversation history is hosted privately in your tracking portal.',
  });

  const text = `${textGreeting}Our customer care team has posted a new update regarding your complaint (${referenceNumber}).\n\nPlease view the update securely online:\n${trackingUrl}\n\nDelivery Reminder: Please add care@elitehubproperties.com to your safe senders list or contacts. If this email landed in your Spam or Junk folder, please mark it as "Not Spam" so you don't miss future updates.\n\nBest regards,\nEliteHub Properties Customer Care Team\ncare@elitehubproperties.com`;

  return { subject, html, text };
}
