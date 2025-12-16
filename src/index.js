Math.abs(diffDays) < 1.5) {
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









































































