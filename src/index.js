an be a Date object, timestamp, or ISO string.
 * @returns {string} Human-readable relative time.
 */
export function timeAgo(date) {
  // If no date is provided, return an empty string
  if (!date) return '';

  // Current date/time
  const now = new Date();
  // Convert the input date to a Date object
  const then = new Date(date);
  // Calculate difference in seconds
  const seconds = Math.floor((now - then) / 1000);

  // Handle very recent times
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;

  // Calculate difference in minutes
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'a minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;

  // Calculate difference in hours
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'an hour ago';
  if (hours < 24) return `${hours} hours ago`;

  // Calculate difference in days
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;

  // Approximate difference in months (assuming ~30 days per month)
  const months = Math.floor(days / 30);
  if (months === 1) return 'a month ago';
  if (months < 12) return `${months} months ago`;

  // Approximate difference in years (assuming ~365 days per year)
  const years = Math.floor(days / 365);
  if (years === 1) return 'a year ago';

  // For anything beyond, return the number of years
  return `${years} years ago`;
}










