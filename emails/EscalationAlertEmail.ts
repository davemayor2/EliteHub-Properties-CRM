import { renderEliteHubEmailHtml } from './templateBase';

export interface EscalationAlertEmailProps {
  referenceNumber: string;
  customerName: string;
  complaintSubject: string;
  priority: string;
  departmentName?: string | null;
  slaStatus: string;
  reason?: string | null;
  complaintUrl: string;
}

export function renderEscalationAlertEmail({
  referenceNumber,
  customerName,
  complaintSubject,
  priority,
  departmentName,
  slaStatus,
  reason,
  complaintUrl,
}: EscalationAlertEmailProps): { subject: string; html: string; text: string } {
  const subject = `⚠️ [ESCALATED] Complaint Requires Urgent Attention — ${referenceNumber}`;

  const messageBody = `
    Hello Administrator,<br><br>
    The following customer complaint has been <strong>ESCALATED</strong> and requires operational management attention:<br><br>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; margin: 16px 0; border-radius: 6px; font-size: 13.5px; color: #1e293b; line-height: 1.6;">
      <strong>Case Reference:</strong> ${referenceNumber}<br>
      <strong>Customer:</strong> ${customerName}<br>
      <strong>Subject:</strong> ${complaintSubject}<br>
      <strong>Priority:</strong> <span style="text-transform: uppercase; font-weight: 700; color: #b91c1c;">${priority}</span><br>
      <strong>Department:</strong> ${departmentName || 'General / Unassigned'}<br>
      <strong>SLA Status:</strong> <span style="color: #b91c1c; font-weight: 600;">${slaStatus}</span><br>
      ${reason ? `<strong>Escalation Reason:</strong> ${reason}<br>` : ''}
    </div>

    Please log in to the EliteHub Staff Portal to review the case details, coordinate with the assigned department specialist, or take necessary remediation steps.
  `;

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: 'Complaint Escalation Alert',
    subheading: 'Operational Case Escalation Notification',
    referenceNumber,
    messageBody,
    ctaText: 'Review Escalated Complaint',
    ctaUrl: complaintUrl,
    noteText: 'This is an automated internal alert sent to active administrators.',
  });

  const text = `COMPLAINT ESCALATION ALERT\n\nThe following complaint has been ESCALATED:\n\nReference: ${referenceNumber}\nCustomer: ${customerName}\nSubject: ${complaintSubject}\nPriority: ${priority.toUpperCase()}\nDepartment: ${departmentName || 'General / Unassigned'}\nSLA Status: ${slaStatus}\n${reason ? `Reason: ${reason}\n` : ''}\nDirect Workspace Link:\n${complaintUrl}\n\nPlease review immediately in the Staff Portal.`;

  return { subject, html, text };
}
