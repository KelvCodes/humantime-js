(now.getTime() - parsedDate.getTime()) / 1000);

  // Relative time formatter (handles pluralization & localization automatically)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  // Define thresholds for each unit of time
  const thresholds = [
    { label: 'year',   seconds: 365 * 24 * 60 * 60 },  // 31536000
    { label: 'month',  seconds: 30 * 24 * 60 * 60 },   // 2592000
    { label: 'day',    seconds: 24 * 60 * 60 },        // 86400
    { label: 'hour',   seconds: 60 * 60 },             // 3600
    { label: 'minute', seconds: 60 },                  // 60
    { label: 'second', seconds: 1 }                    // 1
  ];

  // Loop through thresholds and find the most suitable unit
  for (let i = 0; i < thresholds.length; i++) {
    const { label, seconds } = thresholds[i];
    const interval = Math.floor(diffInSeconds / seconds);

    // If we have at least 1 unit in this threshold
    if (Math.abs(interval) >= 1) {
      // Negative interval => past time ("ago")
      // Positive interval => future time ("in ...")
      return formatter.format(-interval, label);
    }
  }

  // If the difference is less than 1 second
  return 'just now';
}

// ---------------- Example Usage ----------------
console.log(timeAgo(new Date(Date.now() - 45 * 1000)));   // "45 seconds ago"
console.log(timeAgo(new Date(Date.now() - 5 * 60000)));  // "5 minutes ago"
console.log(timeAgo(new Date(Date.now() - 86400000)));   // "yesterday"
console.log(timeAgo(new Date(Date.now() + 3600000)));    // "in 1 hour"
console.log(timeAgo("2025-01-01T00:00:00Z", 'fr'));      // "il y a 7 mois" (French)




































