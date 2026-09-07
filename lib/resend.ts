import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

/**
 * Centralized Resend client instance.
 * Initialized only on the server side.
 */
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Retrieves the configured sender email address.
 * Defaults to 'EliteHub Properties Customer Care <care@elitehubproperties.com>'.
 */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || 'EliteHub Properties Customer Care <care@elitehubproperties.com>';
}

/**
 * Retrieves the base application URL for constructing tracking links.
 * Defaults to 'http://localhost:3000'.
 */
export function getAppUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return rawUrl.replace(/\/+$/, '');
}

/**
 * Constructs a secure customer tracking URL.
 */
export function getTrackingUrl(trackingToken: string): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/track/${encodeURIComponent(trackingToken)}`;
}

/**
 * Retrieves the internal care team inbox email address for new complaint notifications.
 * Defaults to 'care@elitehubproperties.com'.
 */
export function getCareNotificationEmail(): string {
  return process.env.CARE_NOTIFICATION_EMAIL || 'care@elitehubproperties.com';
}

