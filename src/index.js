n date as a human-readable relative time string
 * (e.g., "5 minutes ago", "yesterday", "in 2 days").
 * 
 * @param {string | number | Date} date - The date to format. Can be a Date object, timestamp, or ISO string.
 * @param {string} [locale='en'] - The locale to use for formatting (default: English).
 * @returns {string} Human-readable relative time.
 */
export function timeAgo(date, locale = 'en') {
  if (!date) return '';

  const now = new Date();
  const then = new Date(date);

  // Handle invalid dates
  if (isNaN(then.getTime())) return '';

  const seconds = Math.floor((now - then) / 1000);

  // Relative time formatter (auto handles pluralization & localization)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  // Time intervals in seconds
  const intervals = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 }
  ];

  // Loop through intervals and return the first matching one
  for (const { unit, seconds: intervalSeconds } of intervals) {
    const count = Math.floor(seconds / intervalSeconds);
    if (Math.abs(count) >= 1) {
      return rtf.format(-count, unit); // negative count = "ago"
    }
  }

  return 'just now';
}

// ---------------- Example Usage ----------------
// console.log(timeAgo(new Date(Date.now() - 45 * 1000)));   // "45 seconds ago"
// console.log(timeAgo(new Date(Date.now() - 5 * 60000)));  // "5 minutes ago"
// console.log(timeAgo(new Date(Date.now() - 86400000)));   // "yesterday"
// console.log(timeAgo(new Date(Date.now() + 3600000)));    // "in 1 hour"
// console.log(timeAgo("2025-01-01T00:00:00Z", 'fr'));      // "il y a 7 mois" (in French)






















































