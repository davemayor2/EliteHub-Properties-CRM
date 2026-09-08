import { resend, getEmailFrom, getTrackingUrl, getCareNotificationEmail, getAppUrl } from '@/lib/resend';
import { renderComplaintReceivedEmail } from '@/emails/ComplaintReceivedEmail';
import { renderStaffResponseEmail } from '@/emails/StaffResponseEmail';
import { renderStatusUpdateEmail } from '@/emails/StatusUpdateEmail';
import { renderNewComplaintAlertEmail } from '@/emails/NewComplaintAlertEmail';
import { renderEscalationAlertEmail } from '@/emails/EscalationAlertEmail';
import { ComplaintStatus } from '@/types/complaint';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  skipped?: boolean;
  error?: string;
}

/**
 * Validates recipient email address format.
 */
function isValidEmail(email?: string | null): email is string {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * 1. Sends complaint receipt confirmation email to the customer.
 */
export async function sendComplaintReceivedEmail(params: {
  to?: string | null;
  referenceNumber: string;
  trackingToken: string;
  customerName?: string;
}): Promise<EmailSendResult> {
  const { to, referenceNumber, trackingToken, customerName } = params;

  if (!isValidEmail(to)) {
    console.log(`[Email Service]: Skipped complaint received email (no valid email provided for ${referenceNumber}).`);
    return { success: true, skipped: true };
  }

  if (!resend) {
    console.warn('[Email Service]: RESEND_API_KEY not configured. Email skipped.');
    return { success: false, error: 'Email service unconfigured' };
  }

  try {
    const trackingUrl = getTrackingUrl(trackingToken);
    const { subject, html, text } = renderComplaintReceivedEmail({
      referenceNumber,
      trackingUrl,
      customerName,
    });

    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: to.trim(),
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`[Email Service Error - Complaint Received]: Failed to send to ${to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email Service]: Complaint confirmation sent to ${to} (${referenceNumber}, id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown email sending failure';
    console.error(`[Email Service Exception - Complaint Received]:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * 2. Sends notification when a staff member posts a response.
 */
export async function sendStaffResponseEmail(params: {
  to?: string | null;
  referenceNumber: string;
  trackingToken: string;
  customerName?: string;
}): Promise<EmailSendResult> {
  const { to, referenceNumber, trackingToken, customerName } = params;

  if (!isValidEmail(to)) {
    console.log(`[Email Service]: Skipped staff response email (no valid email for ${referenceNumber}).`);
    return { success: true, skipped: true };
  }

  if (!resend) {
    console.warn('[Email Service]: RESEND_API_KEY not configured. Email skipped.');
    return { success: false, error: 'Email service unconfigured' };
  }

  try {
    const trackingUrl = getTrackingUrl(trackingToken);
    const { subject, html, text } = renderStaffResponseEmail({
      referenceNumber,
      trackingUrl,
      customerName,
    });

    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: to.trim(),
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`[Email Service Error - Staff Response]: Failed to send to ${to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email Service]: Staff response notification sent to ${to} (${referenceNumber}, id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown email sending failure';
    console.error(`[Email Service Exception - Staff Response]:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * 3. Sends notification when complaint status changes.
 */
export async function sendStatusUpdateEmail(params: {
  to?: string | null;
  referenceNumber: string;
  trackingToken: string;
  newStatus: ComplaintStatus;
  customerName?: string;
}): Promise<EmailSendResult> {
  const { to, referenceNumber, trackingToken, newStatus, customerName } = params;

  if (!isValidEmail(to)) {
    console.log(`[Email Service]: Skipped status update email (no valid email for ${referenceNumber}).`);
    return { success: true, skipped: true };
  }

  if (!resend) {
    console.warn('[Email Service]: RESEND_API_KEY not configured. Email skipped.');
    return { success: false, error: 'Email service unconfigured' };
  }

  try {
    const trackingUrl = getTrackingUrl(trackingToken);
    const { subject, html } = renderStatusUpdateEmail({
      referenceNumber,
      trackingUrl,
      newStatus,
      customerName,
    });

    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: to.trim(),
      subject,
      html,
    });

    if (error) {
      console.error(`[Email Service Error - Status Update]: Failed to send to ${to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email Service]: Status update (${newStatus}) sent to ${to} (${referenceNumber}, id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown email sending failure';
    console.error(`[Email Service Exception - Status Update]:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * 4. Sends new complaint alert email to the internal care team inbox (e.g. care@elitehubproperties.com).
 */
export async function sendNewComplaintAlertToCare(params: {
  complaintId: string;
  referenceNumber: string;
  trackingToken: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  subject: string;
  description: string;
  to?: string;
}): Promise<EmailSendResult> {
  const {
    complaintId,
    referenceNumber,
    trackingToken,
    customerName,
    customerEmail,
    customerPhone,
    subject: complaintSubject,
    description: complaintDescription,
    to = getCareNotificationEmail(),
  } = params;

  if (!isValidEmail(to)) {
    console.log(`[Email Service]: Skipped care alert email (invalid recipient ${to}).`);
    return { success: true, skipped: true };
  }

  if (!resend) {
    console.warn('[Email Service]: RESEND_API_KEY not configured. Care alert skipped.');
    return { success: false, error: 'Email service unconfigured' };
  }

  try {
    const appUrl = getAppUrl();
    const staffPortalUrl = `${appUrl}/staff/complaints/${complaintId}`;
    const customerTrackingUrl = getTrackingUrl(trackingToken);

    const { subject, html } = renderNewComplaintAlertEmail({
      referenceNumber,
      customerName,
      customerEmail,
      customerPhone,
      complaintSubject,
      complaintDescription,
      staffPortalUrl,
      customerTrackingUrl,
    });

    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: to.trim(),
      subject,
      html,
    });

    if (error) {
      console.error(`[Email Service Error - Care Alert]: Failed to send to ${to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email Service]: New complaint alert sent to care inbox ${to} (${referenceNumber}, id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown email sending failure';
    console.error(`[Email Service Exception - Care Alert]:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * 5. Sends complaint escalation alert email to administrators.
 */
export async function sendEscalationAlertEmail(params: {
  recipients: string[];
  complaintId: string;
  referenceNumber: string;
  customerName: string;
  complaintSubject: string;
  priority: string;
  departmentName?: string | null;
  slaStatus: string;
  reason?: string | null;
}): Promise<EmailSendResult> {
  const {
    recipients,
    complaintId,
    referenceNumber,
    customerName,
    complaintSubject,
    priority,
    departmentName,
    slaStatus,
    reason,
  } = params;

  const validRecipients = recipients.filter(isValidEmail);

  if (validRecipients.length === 0) {
    console.log(`[Email Service]: Skipped escalation alert (no valid admin recipients for ${referenceNumber}).`);
    return { success: true, skipped: true };
  }

  if (!resend) {
    console.warn('[Email Service]: RESEND_API_KEY not configured. Escalation alert skipped.');
    return { success: false, error: 'Email service unconfigured' };
  }

  try {
    const appUrl = getAppUrl();
    const complaintUrl = `${appUrl}/staff/complaints/${complaintId}`;

    const { subject, html, text } = renderEscalationAlertEmail({
      referenceNumber,
      customerName,
      complaintSubject,
      priority,
      departmentName,
      slaStatus,
      reason,
      complaintUrl,
    });

    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: validRecipients,
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`[Email Service Error - Escalation Alert]: Failed to send for ${referenceNumber}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email Service]: Escalation alert sent for ${referenceNumber} to ${validRecipients.length} admins (id: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown email sending failure';
    console.error(`[Email Service Exception - Escalation Alert]:`, errMsg);
    return { success: false, error: errMsg };
  }
}

