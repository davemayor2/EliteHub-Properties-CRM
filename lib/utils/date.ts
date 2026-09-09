/**
 * Standardized Date and Time utilities for EliteHub Properties CRM.
 * Enforces consistent UTC handling and clean customer/staff formatting.
 */

function toValidDate(value: string | number | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats date as: "Sep 9, 2026"
 */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toValidDate(value);
  if (!d) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats date and time as: "Sep 9, 2026, 2:30 PM"
 */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toValidDate(value);
  if (!d) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Formats a relative timestamp (e.g., "Just now", "5m ago", "2h ago", "3d ago").
 */
export function formatRelativeTime(value: string | number | Date | null | undefined): string {
  const d = toValidDate(value);
  if (!d) return '—';

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return formatDate(d);
}

/**
 * Formats duration in hours/minutes (e.g., 48 -> "48h 00m", 1.5 -> "1h 30m").
 */
export function formatDurationHours(hours: number): string {
  if (isNaN(hours) || hours <= 0) return '0h 00m';

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  return `${wholeHours}h ${String(minutes).padStart(2, '0')}m`;
}
