
    dtfCache.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return dtfCache.get(key)!;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function applyRounding(
  value: number,
  strategy: RoundingStrategy
): number {
  switch (strategy) {
    case 'ceil':
      return Math.ceil(value);
    case 'round':
      return Math.round(value);
    default:
      return Math.floor(value);
  }
}

/* -------------------------------------------------------------------------- */
/* Core API                                                                    */
/* -------------------------------------------------------------------------- */

export function timeAgo(
  input: string | number | Date,
  options: TimeAgoOptions = {}
): string {
  if (!input) return '';

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const {
    locale = DEFAULT_OPTIONS.locale,
    short = DEFAULT_OPTIONS.short,
    justNowThreshold = DEFAULT_OPTIONS.justNowThreshold,
    rounding = DEFAULT_OPTIONS.rounding,
    maxUnit,
    shortLabels = {},
    now = Date.now(),
    absoluteAfter,
    absoluteFormat = { year: 'numeric', month: 'short', day: 'numeric' },
  } = options;

  const diffSecondsRaw = (now - date.getTime()) / 1000;
  const diffSeconds = applyRounding(diffSecondsRaw, rounding);
  const absSeconds = Math.abs(diffSeconds);

  /* ---------- Absolute fallback ---------- */
  if (absoluteAfter && absSeconds >= absoluteAfter) {
    return getDTF(locale, absoluteFormat).format(date);
  }

  /* ---------- Just now ---------- */
  if (absSeconds <= justNowThreshold) {
    return locale.startsWith('en')
      ? 'just now'
      : getRTF(locale).format(0, 'second');
  }

  /* ---------- Yesterday / Tomorrow (English UX polish) ---------- */
  if (locale.startsWith('en')) {
    const dayDiff = Math.trunc(diffSeconds / 86_400);
    if (dayDiff === 1) return 'yesterday';
    if (dayDiff === -1) return 'tomorrow';
  }

  const rtf = getRTF(locale);
  const labels = { ...DEFAULT_SHORT_LABELS, ...shortLabels };
  const maxIndex = maxUnit ? UNIT_INDEX[maxUnit] : Infinity;

  for (const { unit, seconds } of TIME_UNITS) {
    if (UNIT_INDEX[unit] > maxIndex) continue;

    const value = applyRounding(diffSeconds / seconds, rounding);
    if (value === 0) continue;

    if (short) {
      return value > 0
        ? `${Math.abs(value)}${labels[unit]} ago`
        : `in ${Math.abs(value)}${labels[unit]}`;
    }

    return rtf.format(-value, unit);
  }

  return locale.startsWith('en')
    ? 'just now'
    : getRTF(locale).format(0, 'second');
}











































































