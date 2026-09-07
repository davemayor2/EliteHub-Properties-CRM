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
}: ComplaintReceivedEmailProps): { subject: string; html: string } {
  const subject = `We've Received Your Complaint — ${referenceNumber}`;
  const greeting = customerName ? `Hello ${customerName},<br><br>` : '';

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: "We've Received Your Complaint",
    subheading: 'EliteHub Properties Customer Care Confirmation',
    referenceNumber,
    messageBody: `${greeting}Thank you for contacting EliteHub Properties Customer Care. Your complaint has been successfully received and our team will review it as soon as possible.<br><br>Use the secure link below to track your complaint, view updates, and communicate with our customer care team without needing an account or password.`,
    ctaText: 'Track Your Complaint',
    ctaUrl: trackingUrl,
    noteText: 'Please keep this email for your records. The link provided above is your private access point to this complaint.',
  });

  return { subject, html };
}
