/**
 * Convert a given date into a human-readable relative time string.
 *
 * Examples:
 *   - "just now"
 *   - "5 minutes ago"
 *   - "yesterday"
 *   - "in 2 days"
 *   - "5m ago" (short mode)
 *
 * @param {string | number | Date} inputDate - The date to format (ISO string, timestamp, or Date object)
 * @param {string} [locale='en'] - Language locale (default: English)
 * @param {boolean} [short=false] - Whether to use short format (e.g., "5m ago" instead of "5 minutes ago")
 * @returns {string} - A human-readable relative time string
 */

export function timeAgo(
  inputDate: string | number | Date,
  locale: string = 'en',
  short: boolean = false
): string {
  // Guard clause for empty or invalid input
  if (!inputDate) return '';
  const parsedDate = new Date(inputDate);
  if (isNaN(parsedDate.getTime())) return '';

  // Current time and difference in seconds
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);

  // Handle near-zero difference
  if (Math.abs(diffInSeconds) < 1) return 'just now';

  // Setup RelativeTimeFormat for localization
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  // Define time units
  const thresholds = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ] as const;

  // "Yesterday" and "Tomorrow" natural phrasing
  const diffInDays = diffInSeconds / 86400;
  if (Math.abs(diffInDays) >= 0.9 && Math.abs(diffInDays) < 1.5) {
    return diffInDays > 0 ? 'yesterday' : 'tomorrow';
  }

  // Short format suffix mapping
  const shortMap: Record<string, string> = {
    year: 'y',
    month: 'mo',
    day: 'd',
    hour: 'h',
    minute: 'm',
    second: 's'
  };

  // Loop through thresholds to find suitable unit
  for (const { label, seconds } of thresholds) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (Math.abs(interval) >= 1) {
      // Short mode → compact form like "5m ago"
      if (short) {
        return interval > 0
          ? `${Math.abs(interval)}${shortMap[label]} ago`
          : `in ${Math.abs(interval)}${shortMap[label]}`;
      }

      // Default → localized long form
      return formatter.format(-interval, label);
    }
  }

  return 'just now';
}

// ---------------- Example Usage ----------------
console.log(timeAgo(new Date(Date.now() - 45 * 1000)));      // "45 seconds ago"
console.log(timeAgo(new Date(Date.now() - 5 * 60000)));     // "5 minutes ago"
console.log(timeAgo(new Date(Date.now() - 86400000)));      // "yesterday"
console.log(timeAgo(new Date(Date.now() + 3600000)));       // "in 1 hour"
console.log(timeAgo("2025-01-01T00:00:00Z", 'fr'));         // "il y a 7 mois"
console.log(timeAgo(Date.now() - 7200000, 'en', true));     // "2h ago"
console.log(timeAgo(Date.now() + 3 * 86400000, 'en', true)); // "in 3d"


