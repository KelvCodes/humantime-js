unit, seconds } of TIME_UNITS) {
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














































