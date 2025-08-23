
  if (montturn 'a month ago';
  if (months < 12) return `${months} months ago`;

  // Approximate difference in years (assuming ~365 days per year)
  const years = Math.floor(days / 365);
  if (years === 1) return 'a year ago';

  // For anything beyond, return the number of years
  return `${years} years ago`;
}












































