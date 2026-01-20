
  week: 'w',
  hour: 'h',
  minute: 'm',
  second: 's',
});

/* -------------------------------------------------------------------------- */
/* Formatter Cache                                                           */
/* -------------------------------------------------------------------------- */

class FormatterCache {
  private rtfCache = new Map<string, Intl.RelativeTimeFormat>();
  private dtfCache = new Map<string, Intl.DateTimeFormat>();

  getRelativeTimeFormat(locale: string, style: 'long' | 'short' | 'narrow' = 'long'): Intl.RelativeTimeFormat {
    const key = `${locale}:${style}`;
    
    if (!this.rtfCache.has(key)) {
      this.rtfCache.set(key, new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
        style: style === 'long' ? 'long' : 'short',
      }));
    }
    
    return this.rtfCache.get(key)!;
  }

  getDateTimeFormat(locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = options ? `${locale}:${JSON.stringify(options)}` : locale;
    
    if (!this.dtfCache.has(key)) {
      this.dtfCache.set(key, new Intl.DateTimeFormat(locale, options));
    }
    
    return this.dtfCache.get(key)!;
  }

  clear(): void {
    this.rtfCache.clear();
    this.dtfCache.clear();
  }
}

const formatterCache = new FormatterCache();

/* -------------------------------------------------------------------------- */
/* Helper Functions                                                           */
/* -------------------------------------------------------------------------- */

const applyRounding = (value: number, strategy: RoundingStrategy): number => {
  switch (strategy) {
    case 'ceil':
      return Math.ceil(value);
    case 'round':
      return Math.round(value);
    case 'floor':
    default:
      return Math.floor(value);
  }
};

const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

const getLocaleBase = (locale: string): string => {
  return locale.split('-')[0].toLowerCase();
};

const isEnglishLocale = (locale: string): boolean => {
  return getLocaleBase(locale) === 'en';
};

/* -------------------------------------------------------------------------- */
/* Time Calculation Functions                                                 */
/* -------------------------------------------------------------------------- */

class TimeCalculator {
  static calculateTimeDifference(
    date: Date,
    now: number,
    maxUnit?: TimeAgoUnit,
    minUnit?: TimeAgoUnit
  ): { unit: TimeAgoUnit; value: number; seconds: number } | null {
    const diffSeconds = (now - date.getTime()) / 1000;
    const absSeconds = Math.abs(diffSeconds);

    const maxIndex = maxUnit ? UNIT_ORDER.indexOf(maxUnit) : 0;
    const minIndex = minUnit ? UNIT_ORDER.indexOf(minUnit) : UNIT_ORDER.length - 1;

    for (let i = Math.max(maxIndex, 0); i <= Math.min(minIndex, UNIT_ORDER.length - 1); i++) {
      const unit = UNIT_ORDER[i];
      const seconds = SECONDS_IN_UNIT[unit];
      const value = diffSeconds / seconds;
      
      if (Math.abs(value) >= 1) {
        return { unit, value, seconds };
      }
    }

    return null;
  }

  static isWithinDayThreshold(
    diffSeconds: number,
    threshold: number,
    locale: string
  ): boolean {
    return Math.abs(diffSeconds) < SECONDS_IN_UNIT.day * threshold && isEnglishLocale(locale);
  }

  static getDayLabel(diffSeconds: number): string | null {
    const dayDiff = Math.floor(diffSeconds / SECONDS_IN_UNIT.day);
    
    if (dayDiff === 1) return 'yesterday';
    if (dayDiff === -1) return 'tomorrow';
    if (dayDiff === 0) return 'today';
    
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Formatter Functions                                                        */
/* -------------------------------------------------------------------------- */

class TimeFormatter {
  static formatJustNow(locale: string, threshold: number): string {
    if (isEnglishLocale(locale)) {
      return threshold === 0 ? 'now' : 'just now';
    }
    
    const rtf = formatterCache.getRelativeTimeFormat(locale);
    return rtf.format(0, 'second');
  }

  static formatShort(
    value: number,
    unit: TimeAgoUnit,
    labels: Record<TimeAgoUnit, string>,
    alwaysShowAgo: boolean = false
  ): string {
    const absValue = Math.abs(value);
    const suffix = alwaysShowAgo && value > 0 ? ' ago' : '';
    
    return value > 0
      ? `${absValue}${labels[unit]}${suffix}`
      : `in ${absValue}${labels[unit]}`;
  }

  static formatLong(
    value: number,
    unit: TimeAgoUnit,
    locale: string,
    alwaysShowAgo: boolean = false
  ): string {
    const rtf = formatterCache.getRelativeTimeFormat(locale);
    const formatted = rtf.format(-value, unit);
    
    if (alwaysShowAgo && value > 0 && !formatted.includes('ago')) {
      return `${formatted} ago`;
    }
    
    return formatted;
  }

  static formatAbsolute(
    date: Date,
    locale: string,
    formatOptions?: Intl.DateTimeFormatOptions
  ): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    const options = formatOptions || defaultOptions;
    const dtf = formatterCache.getDateTimeFormat(locale, options);
    return dtf.format(date);
  }
}

/* -------------------------------------------------------------------------- */
/* Options Normalization                                                      */
/* -------------------------------------------------------------------------- */

class OptionsNormalizer {
  static normalize(options: TimeAgoOptions): Required<TimeAgoOptions> {
    const {
      locale = DEFAULT_OPTIONS.locale,
      short = DEFAULT_OPTIONS.short,
      justNowThreshold = DEFAULT_OPTIONS.justNowThreshold,
      rounding = DEFAULT_OPTIONS.rounding,
      maxUnit,
      minUnit,
      shortLabels = {},
      now = Date.now(),
      absoluteAfter,
      absoluteFormat,
      alwaysShowAgo = DEFAULT_OPTIONS.alwaysShowAgo,
    } = options;

    // Validate unit order
    if (maxUnit && minUnit && UNIT_ORDER.indexOf(maxUnit) > UNIT_ORDER.indexOf(minUnit)) {
      throw new Error('maxUnit must be larger than or equal to minUnit');
    }

    return {
      locale,
      short,
      justNowThreshold,
      rounding,
      maxUnit,
      minUnit,
      shortLabels: { ...DEFAULT_SHORT_LABELS, ...shortLabels } as Record<TimeAgoUnit, string>,
      now,
      absoluteAfter,
      absoluteFormat,
      alwaysShowAgo,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Main API                                                                   */
/* -------------------------------------------------------------------------- */

export function timeAgo(
  input: string | number | Date,
  options: TimeAgoOptions = {}
): string {
  // Handle null/undefined input
  if (input == null) return '';
  
  // Parse and validate date
  const date = input instanceof Date ? input : new Date(input);
  if (!isValidDate(date)) return '';

  // Normalize options
  const normalized = OptionsNormalizer.normalize(options);
  const {
    locale,
    short,
    justNowThreshold,
    rounding,
    maxUnit,
    minUnit,
    shortLabels,
    now,
    absoluteAfter,
    absoluteFormat,
    alwaysShowAgo,
  } = normalized;

  // Calculate time difference
  const diffSeconds = (now - date.getTime()) / 1000;
  const absDiffSeconds = Math.abs(diffSeconds);

  // 1. Absolute date fallback
  if (absoluteAfter && absDiffSeconds >= absoluteAfter) {
    return TimeFormatter.formatAbsolute(date, locale, absoluteFormat);
  }

  // 2. Just now / now
  if (absDiffSeconds <= justNowThreshold) {
    return TimeFormatter.formatJustNow(locale, justNowThreshold);
  }

  // 3. Special day labels (English only)
  if (isEnglishLocale(locale)) {
    const dayLabel = TimeCalculator.getDayLabel(diffSeconds);
    if (dayLabel) return dayLabel;
  }

  // 4. Calculate appropriate unit
  const result = TimeCalculator.calculateTimeDifference(date, now, maxUnit, minUnit);
  
  if (!result) {
    return TimeFormatter.formatJustNow(locale, justNowThreshold);
  }

  // Apply rounding
  const roundedValue = applyRounding(result.value, rounding);
  
  // Skip if rounded to zero (except for seconds)
  if (roundedValue === 0 && result.unit !== 'second') {
    return TimeFormatter.formatJustNow(locale, justNowThreshold);
  }

  // 5. Format based on mode
  if (short) {
    return TimeFormatter.formatShort(roundedValue, result.unit, shortLabels, alwaysShowAgo);
  }
  
  return TimeFormatter.formatLong(roundedValue, result.unit, locale, alwaysShowAgo);
}

/* -------------------------------------------------------------------------- */
/* Additional Utility Functions                                               */
/* -------------------------------------------------------------------------- */

export function createTimeAgoFormatter(defaultOptions: TimeAgoOptions = {}) {
  return (input: string | number | Date, options?: TimeAgoOptions) => 
    timeAgo(input, { ...defaultOptions, ...options });
}

export function clearFormatterCache(): void {
  formatterCache.clear();
}

export function getAvailableUnits(): readonly TimeAgoUnit[] {
  return UNIT_ORDER;
}

export function getSecondsInUnit(unit: TimeAgoUnit): number {
  return SECONDS_IN_UNIT[unit];
}

/* -------------------------------------------------------------------------- */
/* Type Guards & Validation                                                   */
/* -------------------------------------------------------------------------- */

export function isTimeAgoUnit(value: string): value is TimeAgoUnit {
  return UNIT_ORDER.includes(value as TimeAgoUnit);
}

export function isValidTimeAgoOptions(options: unknown): options is TimeAgoOptions {
  if (typeof options !== 'object' || options === null) return false;
  
  const opts = options as Record<string, unknown>;
  
  if (opts.locale !== undefined && typeof opts.locale !== 'string') return false;
  if (opts.short !== undefined && typeof opts.short !== 'boolean') return false;
  if (opts.justNowThreshold !== undefined && typeof opts.justNowThreshold !== 'number') return false;
  if (opts.maxUnit !== undefined && !isTimeAgoUnit(opts.maxUnit)) return false;
  if (opts.minUnit !== undefined && !isTimeAgoUnit(opts.minUnit)) return false;
  if (opts.rounding !== undefined && !['floor', 'round', 'ceil'].includes(opts.rounding)) return false;
  if (opts.now !== undefined && typeof opts.now !== 'number') return false;
  if (opts.absoluteAfter !== undefined && typeof opts.absoluteAfter !== 'number') return false;
  if (opts.alwaysShowAgo !== undefined && typeof opts.alwaysShowAgo !== 'boolean') return false;
  
  return true;
}

/* -------------------------------------------------------------------------- */
/* Export Cache for Testing                                                   */
/* -------------------------------------------------------------------------- */

export const _internals = {
  formatterCache,
  TimeCalculator,
  TimeFormatter,
  OptionsNormalizer,
} as const;
































































