=============================== */

export type TimeAgoUnit =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second';

export type RoundingStrategy = 'floor' | 'round' | 'ceil';

export interface TimeAgoOptions {
  /** BCP-47 locale string (default: 'en') */
  locale?: string;

  /** Compact output: "5m ago", "in 2d" */
  short?: boolean;

  /** Seconds considered as "just now" */
  justNowThreshold?: number;

  /** Largest unit allowed */
  maxUnit?: TimeAgoUnit;

  /** Override short unit labels */
  shortLabels?: Partial<Record<TimeAgoUnit, string>>;

  /** Rounding strategy (default: 'floor') */
  rounding?: RoundingStrategy;

  /** Custom "now" timestamp (ms) for SSR/tests */
  now?: number;

  /** After N seconds, fall back to absolute date */
  absoluteAfter?: number;

  /** Intl.DateTimeFormat options for absolute fallback */
  absoluteFormat?: Intl.DateTimeFormatOptions;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_OPTIONS = Object.freeze({
  locale: 'en',
  short: false,
  justNowThreshold: 5,
  rounding: 'floor' as RoundingStrategy,
});

/* -------------------------------------------------------------------------- */
/* Time units                                                                  */
/* -------------------------------------------------------------------------- */

const TIME_UNITS = Object.freeze([
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'week', seconds: 604_800 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
] as const);

const UNIT_INDEX = Object.freeze(
  Object.fromEntries(TIME_UNITS.map((u, i) => [u.unit, i]))
) as Record<TimeAgoUnit, number>;

const DEFAULT_SHORT_LABELS: Record<TimeAgoUnit, string> = Object.freeze({
  year: 'y',
  month: 'mo',
  week: 'w',
  day: 'd',
  hour: 'h',
  minute: 'm',
  second: 's',
});

/* -------------------------------------------------------------------------- */
/* Intl caches                                                                 */
/* -------------------------------------------------------------------------- */

const rtfCache = new Map<string, Intl.RelativeTimeFormat>();
const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getRTF(locale: string) {
  const key = locale;
  if (!rtfCache.has(key)) {
    rtfCache.set(key, new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));
  }
  return rtfCache.get(key)!;
}

function getDTF(locale: string, options?: Intl.DateTimeFormatOptions) {
  const key = `${locale}:${JSON.stringify(options)}`;
  if (!dtfCache.has(key)) {
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














