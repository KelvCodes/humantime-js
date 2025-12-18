

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffSeconds = Math.round((now - date.getTime()) / 1000);
  const absDiff = Math.abs(diffSeconds);

  const labels = { ...DEFAULT_SHORT_LABELS, ...shortLabels };

  // --- Just now ---
  if (absDiff <= justNowThreshold) {
    return locale.startsWith('en') ? 'just now' : getRTF(locale).format(0, 'second');
  }

  // --- Yesterday / Tomorrow ---
  if (locale.startsWith('en')) {
    const diffDays = diffSeconds / TIME_UNITS.find(u => u.unit === 'day')!.seconds;
    if (Math.abs(diffDays - 1) < 0.5) return 'yesterday';
    if (Math.abs(diffDays + 1) < 0.5) return 'tomorrow';
  }

  const rtf = getRTF(locale);

  for (const { unit, seconds } of TIME_UNITS) {
    if (maxUnit && TIME_UNITS.findIndex(u => u.unit === unit) > TIME_UNITS.findIndex(u => u.unit === maxUnit)) {
      continue;
    }

    const value = Math.round(diffSeconds / seconds);
    if (Math.abs(value) >= 1) {
      if (short) {
        return value > 0
          ? `${Math.abs(value)}${labels[unit]} ago`
          : `in ${Math.abs(value)}${labels[unit]}`;
      } else {
        // Intl.RelativeTimeFormat expects negative for past
        return rtf.format(-value, unit);
      }
    }
  }

  return locale.startsWith('en') ? 'just now' : rtf.format(0, 'second');
}



































