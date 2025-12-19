

function getRTF(locale: string, numeric: 'auto' | 'always' = 'auto') {
  const key = `${locale}:${numeric}`;
  let rtf = rtfCache.get(key);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric });
    rtfCache.set(key, rtf);
  }
  return rtf;
}

// ---- Core function ----
export function timeAgo(
  input: string | number | Date,
  options: TimeAgoOptions = {}
): string {
  const {
    locale = 'en',
    short = false,
    justNowThreshold = 5,
    maxUnit,
    shortLabels = {},
  } = options;

  if (!input) return '';

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.trunc((Date.now() - date.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  // ---- Just now ----
  if (absSeconds <= justNowThreshold) {
    return locale.startsWith('en')
      ? 'just now'
      : getRTF(locale).format(0, 'second');
  }

  // ---- Yesterday / Tomorrow (English UX polish) ----
  if (locale.startsWith('en')) {
    const dayDiff = Math.trunc(diffSeconds / 86_400);
    if (dayDiff === 1) return 'yesterday';
    if (dayDiff === -1) return 'tomorrow';
  }

  const labels = { ...DEFAULT_SHORT_LABELS, ...shortLabels };
  const rtf = getRTF(locale);

  const maxIndex = maxUnit ? UNIT_INDEX[maxUnit] : Infinity;

  for (const { unit, seconds } of TIME_UNITS) {
    if (UNIT_INDEX[unit] > maxIndex) continue;

    const value = Math.trunc(diffSeconds / seconds);
    if (value === 0) continue;

    if (short) {
      return value > 0
        ? `${Math.abs(value)}${labels[unit]} ago`
        : `in ${Math.abs(value)}${labels[unit]}`;
    }

    // Intl expects negative for past
    return rtf.format(-value, unit);
  }

  return locale.startsWith('en')
    ? 'just now'
    : getRTF(locale).format(0, 'second');
   }















































































































































