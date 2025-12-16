0 },
  { unit: 'second', seconds: 1 }
] as const;

const SHORT_LABELS: Record<TimeAgoUnit, string> = {
  year: 'y',
  month: 'mo',
  day: 'd',
  hour: 'h',
  minute: 'm',
  second: 's'
};

export function timeAgo(
  inputDate: string | number | Date,
  options: TimeAgoOptions = {}
): string {
  const {
    locale = 'en',
    short = false,
    justNowThreshold = 5
  } = options;

  if (!inputDate) return '';

  const date = new Date(inputDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffSeconds = Math.round((now - date.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  // "Just now"
  if (absSeconds <= justNowThreshold) {
    return locale.startsWith('en') ? 'just now' : new Intl.RelativeTimeFormat(locale).format(0, 'second');
  }

  // Yesterday / Tomorrow (natural language)
  const diffDays = diffSeconds / 86400;
  if (Math.abs(diffDays) >= 0.9 && Math.abs(diffDays) < 1.5) {
    return diffDays > 0 ? 'yesterday' : 'tomorrow';
  }

  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto'
  });

  for (const { unit, seconds } of TIME_UNITS) {
    const value = Math.round(diffSeconds / seconds);

    if (Math.abs(value) >= 1) {
      // Short format: "5m ago" / "in 3d"
      if (short) {
        const label = SHORT_LABELS[unit];
        return value > 0
          ? `${Math.abs(value)}${label} ago`
          : `in ${Math.abs(value)}${label}`;
      }

      // Localized long format
      return rtf.format(-value, unit);
    }
  }

  return locale.startsWith('en') ? 'just now' : rtf.format(0, 'second');
}
















































