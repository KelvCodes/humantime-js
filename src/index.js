
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(days / 365);
  if (years === 1) return 'a year ago';

  return `${years} years ago`;
}
