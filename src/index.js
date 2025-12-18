
    shortLabels = {}
  } = options;

  if (!inputDate) return '';

  const date = new Date(inputDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffSeconds = Math.round((now - date.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const labels = { ...DEFAULT_SHORT_LABELS, ...shortLabels };

  // Just now
  if (absSeconds <= justNowThreshold) {
    return locale.startsWith('en')
      ? 'just now'
      : getRTF(locale).format(0, 'second');
  }

  // Yesterday / Tomorrow (English natural phrasing)
  const diffDays = diffSeconds / 86400;
  if (locale.startsWith('en') && Math.abs(diffDays) >= 0.9 && Math.abs(diffDays) < 1.5) {
    return diffDays > 0 ? 'yesterday' : 'tomorrow';
  }

  const rtf = getRTF(locale);

  for (const { unit, seconds } of TIME_UNITS) {
    if (maxUnit && unit === maxUnit) break;

    const value = Math.round(diffSeconds / seconds);

    if (Math.abs(value) >= 1) {
      if (short) {
        return value > 0
          ? `${Math.abs(value)}${labels[unit]} ago`
          : `in ${Math.abs(value)}${labels[unit]}`;
      }

      return rtf.format(-value, unit);
    }
  }

  return locale.startsWith('en')
    ? 'just now'
    : rtf.format(0, 'second');
}


















































































































































