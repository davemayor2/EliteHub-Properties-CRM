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
}: StaffResponseEmailProps): { subject: string; html: string } {
  const subject = `New Update Regarding Your Complaint — ${referenceNumber}`;
  const greeting = customerName ? `Hello ${customerName},<br><br>` : '';

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: 'You Have a New Update',
    subheading: 'EliteHub Properties Customer Care Response',
    referenceNumber,
    messageBody: `${greeting}Our customer care team has provided an update regarding your complaint.<br><br>Please click the button below to view the message securely in your tracking portal and post a reply if needed.`,
    ctaText: 'View Update',
    ctaUrl: trackingUrl,
    noteText: 'To keep your personal information private, the full message content is available securely within your tracking portal.',
  });

  return { subject, html };
}
