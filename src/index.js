
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






























