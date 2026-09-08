import { renderEliteHubEmailHtml } from './templateBase';

export interface FeedbackRequestEmailProps {
  referenceNumber: string;
  feedbackUrl: string;
  customerName?: string;
}

export function renderFeedbackRequestEmail({
  referenceNumber,
  feedbackUrl,
  customerName,
}: FeedbackRequestEmailProps): { subject: string; html: string; text: string } {
  const subject = `How Did We Do? — We'd Love Your Feedback (${referenceNumber})`;
  const greeting = customerName ? `Hello ${customerName},` : 'Hello,';

  const messageBody = `
    ${greeting}<br><br>
    Your complaint has been marked as resolved. We strive to provide the highest standard of service and care to all our clients.<br><br>
    We would greatly appreciate a brief moment of your time to rate your customer service experience and let us know how we did. It only takes 30 seconds and no login or account is required.
  `.trim();

  const html = renderEliteHubEmailHtml({
    title: subject,
    heading: 'How Was Your Experience?',
    subheading: 'Customer Satisfaction Survey',
    referenceNumber,
    messageBody,
    ctaText: 'Rate Your Experience',
    ctaUrl: feedbackUrl,
    noteText: 'Your honest feedback is strictly confidential and directly helps us improve our customer care and resolution processes.',
  });

  const text = `
${subject}

${greeting}

Your complaint (${referenceNumber}) has been marked as resolved. We would greatly appreciate a moment of your time to let us know about your experience.

Please rate your experience here:
${feedbackUrl}

Thank you for helping us serve you better.
EliteHub Properties Customer Care Team
`.trim();

  return { subject, html, text };
}
