import { ComplaintStatus } from '@/types/complaint';
import { renderEliteHubEmailHtml } from './templateBase';

export interface StatusUpdateEmailProps {
  referenceNumber: string;
  trackingUrl: string;
  newStatus: ComplaintStatus;
  customerName?: string;
}

interface StatusConfig {
  subject: (ref: string) => string;
  heading: string;
  message: string;
}

const STATUS_CONFIGS: Record<ComplaintStatus, StatusConfig> = {
  open: {
    subject: (ref) => `Your Complaint Is Being Reviewed — ${ref}`,
    heading: 'Your Complaint Is Being Reviewed',
    message: 'Our customer care team is currently reviewing your complaint.',
  },
  pending: {
    subject: (ref) => `Action Required Regarding Your Complaint — ${ref}`,
    heading: 'Action Required Regarding Your Complaint',
    message: 'We are awaiting additional information or action before we can proceed.',
  },
  resolved: {
    subject: (ref) => `Your Complaint Has Been Resolved — ${ref}`,
    heading: 'Your Complaint Has Been Resolved',
    message: 'We believe your complaint has been resolved.',
  },
  closed: {
    subject: (ref) => `Your Complaint Has Been Closed — ${ref}`,
    heading: 'Your Complaint Has Been Closed',
    message: 'Your complaint has been closed.',
  },
  new: {
    subject: (ref) => `We Have Received Your Complaint — ${ref}`,
    heading: 'Complaint Received',
    message: 'We have received your complaint.',
  },
};

export function renderStatusUpdateEmail({
  referenceNumber,
  trackingUrl,
  newStatus,
  customerName,
}: StatusUpdateEmailProps): { subject: string; html: string } {
  const config = STATUS_CONFIGS[newStatus] || STATUS_CONFIGS.open;
  const subject = config.subject(referenceNumber);
  const greeting = customerName ? `Hello ${customerName},<br><br>` : '';

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: config.heading,
    subheading: 'Status Update Notification',
    referenceNumber,
    messageBody: `${greeting}${config.message}<br><br>You can track the ongoing progress, view timeline updates, or communicate with our support specialists directly in your secure tracking portal.`,
    ctaText: 'Track Your Complaint',
    ctaUrl: trackingUrl,
    noteText: 'Please visit your tracking portal for further details and to respond if additional information is required.',
  });

  return { subject, html };
}
