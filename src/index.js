e, i18n-first utility for formatting
 *   dates as human-readable relative time (e.g. "just now", "2h ago", "in 3 days").
 *
 * Design goals:
 *   • Deterministic output (no jitter)
 *   • Intl-native localization
 *   • High performance (cached formatters)
 *   • Tree-shakable, framework-agnostic
 *   • Safe defaults, extensible API
 *
 * Suitable for:
 *   UI feeds, timelines, logs, analytics, design systems, OSS libraries
 * ========================================================================== */

export type TimeAgoUnit =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second';

export interface TimeAgoOptions {
  /** BCP-47 locale string (default: 'en') */
  locale?: string;

  /** Compact output: "5m ago", "in 2d" */
  short?: boolean;

  /** Seconds considered as "just now" */
  justNowThreshold?: number;

  /** Largest unit allowed (e.g. 'day' => never show weeks/months) */
  maxUnit?: TimeAgoUnit;

  /** Override short unit labels */
  shortLabels?: Partial<Record<TimeAgoUnit, string>>;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_OPTIONS: Required<
  Pick<TimeAgoOptions, 'locale' | 'short' | 'justNowThreshold'>
> = Object.freeze({
  locale: 'en',
  short: false,
  justNowThreshold: 5,
});

/* -------------------------------------------------------------------------- */
/* Time unit table (ordered largest → smallest)                                */
/* -------------------------------------------------------------------------- */

const TIME_UNITS = Object.freeze([
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'week', seconds: 604_800 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
] as const satisfies readonly { unit: TimeAgoUnit; seconds: number }[]);

/* O(1) unit ordering lookup */
const UNIT_INDEX: Readonly<Record<TimeAgoUnit, number>> = Object.freeze(
  Object.fromEntries(TIME_UNITS.map((u, i) => [u.unit, i])) as Record<
    TimeAgoUnit,
    number
  >
);

const DEFAULT_SHORT_LABELS: Readonly<Record<TimeAgoUnit, string>> = Object.freeze({
  year: 'y',
  month: 'mo',
  week: 'w',
  day: 'd',
  hour: 'h',
  minute: 'm',
  second: 's',
});

/* -------------------------------------------------------------------------- */
/* Intl.RelativeTimeFormat cache                                               */
/* -------------------------------------------------------------------------- */

const rtfCache = new Map<string, Intl.RelativeTimeFormat>();

function getRTF(
  locale: string,
  numeric: 'auto' | 'always' = 'auto'
): Intl.RelativeTimeFormat {
  const key = `${locale}:${numeric}`;

  let formatter = rtfCache.get(key);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric });
    rtfCache.set(key, formatter);
  }

  return formatter;
}

/* -------------------------------------------------------------------------- */
/* Core API                                                                    */
/* -------------------------------------------------------------------------- */

export function timeAgo(
  input: string | number | Date,
  options: TimeAgoOptions = {}
): string {
  const {
    locale = DEFAULT_OPTIONS.locale,
    short = DEFAULT_OPTIONS.short,
    justNowThreshold = DEFAULT_OPTIONS.justNowThreshold,
    maxUnit,
    shortLabels = {},
  } = options;

  /* ---------- Parse & validate ---------- */
  if (!input) return '';

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  /* ---------- Time difference (seconds, deterministic) ---------- */
  const diffSeconds = Math.trunc((Date.now() - date.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

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

  /* ---------- Formatting ---------- */
  const labels = { ...DEFAULT_SHORT_LABELS, ...shortLabels };
  const rtf = getRTF(locale);
  const maxIndex = maxUnit ? UNIT_INDEX[maxUnit] : Infinity;

  for (const { unit, seconds } of TIME_UNITS) {
    if (UNIT_INDEX[unit] > maxIndex) continue;

    const value = Math.trunc(diffSeconds / seconds);
    if (value === 0) continue;

    // Short mode → "5m ago" / "in 2d"
    if (short) {
      return value > 0
        ? `${Math.abs(value)}${labels[unit]} ago`
        : `in ${Math.abs(value)}${labels[unit]}`;
    }

    // Intl expects negative values for past times
    return rtf.format(-value, unit);
  }

  /* ---------- Fallback (extreme edge cases) ---------- */
  return locale.startsWith('en')
    ? 'just now'
    : getRTF(locale).format(0, 'second');
}


















