import { renderEliteHubEmailHtml } from './templateBase';
import { StaffRole } from '@/types/staff';

export interface StaffInvitationEmailProps {
  fullName: string;
  email: string;
  role: StaffRole;
  setupUrl: string;
}

export function renderStaffInvitationEmail({
  fullName,
  role,
  setupUrl,
}: StaffInvitationEmailProps): { subject: string; html: string } {
  const subject = 'You Have Been Invited to EliteHub Customer Care CRM';
  const roleLabel = role === 'admin' ? 'Administrator' : 'Customer Care Agent';

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: 'Welcome to EliteHub CRM',
    subheading: 'Internal Staff Account Invitation',
    referenceNumber: `ROLE: ${role.toUpperCase()}`,
    messageBody: `Hello ${fullName},<br><br>You have been invited to join the <strong>EliteHub Properties Customer Care Team</strong> as a <strong>${roleLabel}</strong>.<br><br>To activate your staff account and configure your secure password, click the button below. Once your password is set, you will be able to access the internal staff dashboard and manage customer complaints.`,
    ctaText: 'Accept Invitation & Set Password',
    ctaUrl: setupUrl,
    noteText: 'For security reasons, do not share this invitation link with anyone. If you were not expecting this invitation, please contact your systems administrator immediately.',
  });

  return { subject, html };
}
