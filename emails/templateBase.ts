/**
 * Base email layout and design system for EliteHub Properties Customer Care transactional emails.
 * Uses bulletproof table-based HTML compatible across Gmail, Apple Mail, Outlook, etc.
 */

export interface EmailLayoutProps {
  title: string;
  heading: string;
  subheading?: string;
  referenceNumber: string;
  messageBody: string;
  ctaText: string;
  ctaUrl: string;
  noteText?: string;
}

export function renderEliteHubEmailHtml({
  title,
  heading,
  subheading,
  referenceNumber,
  messageBody,
  ctaText,
  ctaUrl,
  noteText,
}: EmailLayoutProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
    }
    .cta-button:hover {
      background-color: #1e3a8a !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0B192C; padding: 28px 32px; text-align: left; border-bottom: 3px solid #D4AF37;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">EliteHub Properties</span>
                    <span style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #D4AF37; margin-top: 4px;">CUSTOMER CARE PORTAL</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 32px 32px;">
              
              <!-- Reference Number Badge -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 14px;">
                    <span style="font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Complaint Ref:</span>
                    <span style="font-size: 13px; font-weight: 700; color: #0f172a; margin-left: 6px; font-family: monospace;">${escapeHtml(referenceNumber)}</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; line-height: 1.3; color: #0f172a; letter-spacing: -0.01em;">
                ${escapeHtml(heading)}
              </h1>

              ${subheading ? `
              <p style="margin: 0 0 20px 0; font-size: 14px; font-weight: 500; color: #64748b; line-height: 1.5;">
                ${escapeHtml(subheading)}
              </p>` : ''}

              <!-- Divider -->
              <div style="height: 1px; background-color: #f1f5f9; margin: 20px 0;"></div>

              <!-- Message Body -->
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                ${messageBody}
              </p>

              <!-- Call To Action Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="left">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" class="cta-button" style="display: inline-block; background-color: #0B192C; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 8px; border-left: 3px solid #D4AF37; box-shadow: 0 2px 4px rgba(11, 25, 44, 0.15);">
                      ${escapeHtml(ctaText)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              ${noteText ? `
              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                ${noteText}
              </p>` : ''}

              <!-- Direct Link Fallback -->
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8; word-break: break-all;">
                If the button above does not work, copy and paste this secure link into your browser:<br>
                <a href="${escapeHtml(ctaUrl)}" style="color: #2563eb; text-decoration: underline;">${escapeHtml(ctaUrl)}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: left;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #475569;">
                EliteHub Properties Customer Care Team
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11.5px; line-height: 1.5; color: #64748b;">
                This is an automated notification regarding your complaint. You can post messages and review updates securely through your online tracking portal at any time.
              </p>
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #94a3b8;">
                📬 <em>Tip: To ensure you receive all future updates, please add <strong>care@elitehubproperties.com</strong> to your safe senders or contacts list. If this email was delivered to your <strong>Spam or Junk folder</strong>, please mark it as <strong>"Not Spam"</strong> so critical updates reach your main inbox.</em>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
