import { renderEliteHubEmailHtml } from './templateBase';

export interface NewComplaintAlertEmailProps {
  referenceNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  complaintSubject: string;
  complaintDescription: string;
  staffPortalUrl: string;
  customerTrackingUrl: string;
}

export function renderNewComplaintAlertEmail({
  referenceNumber,
  customerName,
  customerEmail,
  customerPhone,
  complaintSubject,
  complaintDescription,
  staffPortalUrl,
  customerTrackingUrl,
}: NewComplaintAlertEmailProps): { subject: string; html: string } {
  const subject = `[New Complaint] ${referenceNumber} — ${complaintSubject}`;

  const cleanDescription =
    complaintDescription.length > 300
      ? `${complaintDescription.substring(0, 300)}...`
      : complaintDescription;

  const detailsHtml = `
    A new complaint has just been submitted to the EliteHub Properties Customer Care Portal.<br><br>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.6;">
      <strong>Customer:</strong> ${escapeHtml(customerName)}<br>
      <strong>Email:</strong> ${customerEmail ? escapeHtml(customerEmail) : '<span style="color: #94a3b8;">Not provided</span>'}<br>
      <strong>Phone:</strong> ${escapeHtml(customerPhone)}<br>
      <strong>Subject:</strong> ${escapeHtml(complaintSubject)}<br>
      <strong>Summary:</strong> <em>"${escapeHtml(cleanDescription)}"</em>
    </div>
    Please review this complaint in the staff dashboard, assign it to a team member, or post an initial response.
  `;

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: 'New Complaint Received',
    subheading: 'EliteHub Properties Internal Staff Alert',
    referenceNumber,
    messageBody: detailsHtml,
    ctaText: 'Open in Staff Portal',
    ctaUrl: staffPortalUrl,
    noteText: `Customer tracking portal link: <a href="${escapeHtml(customerTrackingUrl)}" style="color: #2563eb; text-decoration: underline;">${escapeHtml(customerTrackingUrl)}</a>`,
  });

  return { subject, html };
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
