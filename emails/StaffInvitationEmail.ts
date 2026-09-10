import { renderEliteHubEmailHtml } from './templateBase';
import { StaffRole } from '@/types/staff';

export interface StaffInvitationEmailProps {
  fullName: string;
  email: string;
  role: StaffRole;
  setupUrl: string;
  password?: string;
}

export function renderStaffInvitationEmail({
  fullName,
  email,
  role,
  setupUrl,
  password,
}: StaffInvitationEmailProps): { subject: string; html: string } {
  const subject = 'Welcome to EliteHub CRM - Your Staff Account Credentials';
  const roleLabel = role === 'admin' ? 'Administrator' : 'Customer Care Agent';

  const credentialsBlock = password
    ? `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; margin: 20px 0; border-collapse: separate; overflow: hidden;">
  <tr>
    <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
      <span style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.06em;">Staff Login Credentials</span>
    </td>
  </tr>
  <tr>
    <td style="padding: 16px 20px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 130px; font-weight: 500;">Staff Portal:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${setupUrl}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Login Email:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Login Password:</td>
          <td style="padding: 6px 0;">
            <span style="display: inline-block; font-weight: 700; color: #0369a1; background-color: #e0f2fe; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 15px; border: 1px solid #bae6fd;">${password}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Assigned Role:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${roleLabel}</td>
        </tr>
      </table>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.4;">
        🔒 <em>Please save this password securely. You can change your password anytime after logging into your staff dashboard.</em>
      </p>
    </td>
  </tr>
</table>`
    : '';

  const messageBody = `Hello ${fullName},<br><br>You have been added to the <strong>EliteHub Properties Customer Care Team</strong> as a <strong>${roleLabel}</strong>.<br><br>Your staff account is ready for immediate access to the internal CRM dashboard to manage customer complaints and support tickets.${credentialsBlock}<br>Click the button below to sign in to your staff account with your credentials:`;

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: 'Welcome to EliteHub CRM',
    subheading: 'Internal Staff Account Activation & Credentials',
    referenceNumber: `ROLE: ${role.toUpperCase()}`,
    messageBody,
    ctaText: 'Sign In to Staff Portal',
    ctaUrl: setupUrl,
    noteText: 'For security reasons, do not share these credentials with anyone. If you were not expecting this invitation, please contact your systems administrator immediately.',
  });

  return { subject, html };
}

