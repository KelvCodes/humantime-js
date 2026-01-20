/* ============================================================================
 * TimeAgo — human-readable relative time formatter (v3)
 * ----------------------------------------------------------------------------
 * Author: Kelvin Agyare Yeboah
 *
 * Features:
 *   • Intl-native localization with automatic locale detection
 *   • Deterministic & testable (custom "now")
 *   • Short, long, and narrow modes
 *   • Configurable rounding strategies
 *   • Smart absolute-date fallback
 *   • High-performance LRU caching
 *   • Framework-agnostic & tree-shakable
 *   • SSR/SSG compatible
 *   • Custom formatting with placeholders
 *   • Pluralization support
 *   • Performance monitoring
 * ========================================================================== */

export type TimeAgoUnit =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'now';

export type RoundingStrategy = 'floor' | 'round' | 'ceil' | 'auto';
export type TimeStyle = 'long' | 'short' | 'narrow' | 'auto';
export type NumericFormat = 'always' | 'auto';

export interface TimeAgoOptions {
  /** BCP-47 locale string or array (default: auto-detect) */
  locale?: string | string[];
  
  /** Output style: "long", "short", "narrow", or "auto" */
  style?: TimeStyle;
  
  /** Numeric format: "always" (1 day ago) or "auto" (yesterday) */
  numeric?: NumericFormat;
  
  /** Compact output: "5m ago", "in 2d" (overrides style) */
  short?: boolean;
  
  /** Seconds considered as "just now" */
  justNowThreshold?: number;
  
  /** Largest unit allowed */
  maxUnit?: TimeAgoUnit;
  
  /** Smallest unit allowed */
  minUnit?: TimeAgoUnit;
  
  /** Override short unit labels */
  shortLabels?: Partial<Record<TimeAgoUnit, string>>;
  
  /** Rounding strategy (default: 'auto') */
  rounding?: RoundingStrategy;
  
  /** Custom "now" timestamp (ms) for SSR/tests */
  now?: number;
  
  /** After N seconds, fall back to absolute date */
  absoluteAfter?: number | false;
  
  /** Intl.DateTimeFormat options for absolute fallback */
  absoluteFormat?: Intl.DateTimeFormatOptions;
  
  /** Custom absolute date formatter */
  absoluteFormatter?: (date: Date, locale: string) => string;
  
  /** Show "ago" suffix even in long mode for past dates */
  alwaysShowAgo?: boolean;
  
  /** Add tooltip-friendly absolute date as title attribute */
  withTitle?: boolean;
  
  /** Custom format string with placeholders */
  format?: string;
  
  /** Future date prefix (default: "in") */
  futurePrefix?: string;
  
  /** Past date suffix (default: "ago") */
  pastSuffix?: string;
  
  /** Enable performance monitoring */
  perf?: boolean;
  
  /** Cache size for formatters (default: 100) */
  cacheSize?: number;
  
  /** Force relative time even for distant dates */
  forceRelative?: boolean;
  
  /** Time zone for absolute dates (IANA) */
  timeZone?: string;
  
  /** Return raw data instead of formatted string */
  raw?: boolean;
}

export interface TimeAgoResult {
  value: number;
  unit: TimeAgoUnit;
  isFuture: boolean;
  seconds: number;
  absoluteDate?: string;
  formatted: string;
  raw: {
    diffSeconds: number;
    locale: string;
    now: number;
    date: Date;
  };
}

/* -------------------------------------------------------------------------- */
/* Constants & Defaults                                                       */
/* -------------------------------------------------------------------------- */

const DEFAULT_OPTIONS = Object.freeze({
  locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
  style: 'auto' as TimeStyle,
  numeric: 'auto' as NumericFormat,
  short: false,
  justNowThreshold: 5,
  rounding: 'auto' as RoundingStrategy,
  alwaysShowAgo: false,
  withTitle: false,
  futurePrefix: 'in',
  pastSuffix: 'ago',
  perf: false,
  cacheSize: 100,
  forceRelative: false,
  absoluteAfter: 31536000, // 1 year
} as const);

const SECONDS_IN_UNIT = Object.freeze({
  year: 31_536_000,
  month: 2_592_000,
  week: 604_800,
  day: 86_400,
  hour: 3_600,
  minute: 60,
  second: 1,
  now: 0,
} as const);

const UNIT_ORDER: readonly TimeAgoUnit[] = [
  'year',
  'month',
  'week',
  'day',
  'hour',
  'minute',
  'second',
  'now',
] as const;

const DEFAULT_SHORT_LABELS: Readonly<Record<TimeAgoUnit, string>> = Object.freeze({
  year: 'y',
  month: 'mo',
  week: 'w',
  day: 'd',
  hour: 'h',
  minute: 'm',
  second: 's',
  now: 'now',
});

const PLACEHOLDER_REGEX = /\{(\w+)\}/g;

/* -------------------------------------------------------------------------- */
/* LRU Cache Implementation                                                   */
/* -------------------------------------------------------------------------- */

interface LRUNode<K, V> {
  key: K;
  value: V;
  next: LRUNode<K, V> | null;
  prev: LRUNode<K, V> | null;
}

class LRUCache<K, V> {
  private capacity: number;
  private size = 0;
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;
  private cache = new Map<K, LRUNode<K, V>>();

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
  }

  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node) return undefined;

    this.moveToHead(node);
    return node.value;
  }

  set(key: K, value: V): void {
    let node = this.cache.get(key);

    if (node) {
      node.value = value;
      this.moveToHead(node);
    } else {
      node = { key, value, next: null, prev: null };
      this.cache.set(key, node);
      this.addToHead(node);
      this.size++;

      if (this.size > this.capacity) {
        this.removeTail();
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.head = this.tail = null;
    this.size = 0;
  }

  getSize(): number {
    return this.size;
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    this.cache.delete(node.key);
    this.size--;
  }

  private moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) return;
    
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): void {
    if (!this.tail) return;
    this.removeNode(this.tail);
  }
}

/* -------------------------------------------------------------------------- */
/* Formatter Cache with LRU                                                   */
/* -------------------------------------------------------------------------- */

class FormatterCache {
  private rtfCache: LRUCache<string, Intl.RelativeTimeFormat>;
  private dtfCache: LRUCache<string, Intl.DateTimeFormat>;
  private perfStats = {
    hits: 0,
    misses: 0,
    creations: 0,
  };

  constructor(cacheSize: number = 100) {
    this.rtfCache = new LRUCache(cacheSize);
    this.dtfCache = new LRUCache(cacheSize);
  }

  getRelativeTimeFormat(
    locale: string,
    style: 'long' | 'short' | 'narrow' = 'long',
    numeric: NumericFormat = 'auto'
  ): Intl.RelativeTimeFormat {
    const key = `${locale}:${style}:${numeric}`;
    
    const cached = this.rtfCache.get(key);
    if (cached) {
      this.perfStats.hits++;
      return cached;
    }

    this.perfStats.misses++;
    this.perfStats.creations++;
    
    const rtf = new Intl.RelativeTimeFormat(locale, {
      numeric,
      style,
    });
    
    this.rtfCache.set(key, rtf);
    return rtf;
  }

  getDateTimeFormat(
    locale: string,
    options?: Intl.DateTimeFormatOptions
  ): Intl.DateTimeFormat {
    const key = options ? `${locale}:${JSON.stringify(options)}` : locale;
    
    const cached = this.dtfCache.get(key);
    if (cached) {
      this.perfStats.hits++;
      return cached;
    }

    this.perfStats.misses++;
    this.perfStats.creations++;
    
    const dtf = new Intl.DateTimeFormat(locale, options);
    this.dtfCache.set(key, dtf);
    return dtf;
  }

  clear(): void {
    this.rtfCache.clear();
    this.dtfCache.clear();
    this.perfStats = { hits: 0, misses: 0, creations: 0 };
  }

  getStats() {
    const hitRate = this.perfStats.hits / (this.perfStats.hits + this.perfStats.misses) || 0;
    return {
      ...this.perfStats,
      hitRate: Math.round(hitRate * 100),
      rtfSize: this.rtfCache.getSize(),
      dtfSize: this.dtfCache.getSize(),
    };
  }

  resize(newSize: number): void {
    const newRtfCache = new LRUCache<string, Intl.RelativeTimeFormat>(newSize);
    const newDtfCache = new LRUCache<string, Intl.DateTimeFormat>(newSize);
    
    // Note: LRU doesn't expose iteration, so we'd need to reconstruct
    // In practice, just clear and let it rebuild
    this.clear();
  }
}

let globalCache: FormatterCache | null = null;

function getCache(cacheSize?: number): FormatterCache {
  if (!globalCache) {
    globalCache = new FormatterCache(cacheSize || DEFAULT_OPTIONS.cacheSize);
  }
  return globalCache;
}

/* -------------------------------------------------------------------------- */
/* Performance Monitoring                                                     */
/* -------------------------------------------------------------------------- */

class PerformanceMonitor {
  private measurements = new Map<string, number[]>();
  private enabled = false;

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  measure<T>(label: string, fn: () => T): T {
    if (!this.enabled) return fn();

    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      const measurements = this.measurements.get(label) || [];
      measurements.push(duration);
      this.measurements.set(label, measurements);
    }
  }

  getStats(): Record<string, {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  }> {
    const stats: Record<string, any> = {};
    
    for (const [label, measurements] of this.measurements) {
      if (measurements.length === 0) continue;
      
      const sorted = [...measurements].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const avg = sum / sorted.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      
      stats[label] = { count: sorted.length, avg, min, max, p95 };
    }
    
    return stats;
  }

  clear(): void {
    this.measurements.clear();
  }
}

const perfMonitor = new PerformanceMonitor();

/* -------------------------------------------------------------------------- */
/* Locale Detection & Normalization                                           */
/* -------------------------------------------------------------------------- */

class LocaleResolver {
  static resolveLocale(requested?: string | string[]): string {
    if (!requested) {
      return DEFAULT_OPTIONS.locale;
    }

    if (Array.isArray(requested)) {
      for (const locale of requested) {
        if (this.isValidLocale(locale)) {
          return locale;
        }
      }
      return DEFAULT_OPTIONS.locale;
    }

    return this.isValidLocale(requested) ? requested : DEFAULT_OPTIONS.locale;
  }

  static isValidLocale(locale: string): boolean {
    try {
      new Intl.Locale(locale);
      return true;
    } catch {
      return false;
    }
  }

  static getBaseLocale(locale: string): string {
    try {
      return new Intl.Locale(locale).language;
    } catch {
      return locale.split('-')[0].toLowerCase();
    }
  }

  static isEnglishLocale(locale: string): boolean {
    return this.getBaseLocale(locale) === 'en';
  }

  static getSupportedLocales(): string[] {
    if (typeof Intl === 'undefined' || !Intl.RelativeTimeFormat) {
      return ['en'];
    }

    try {
      return (Intl.RelativeTimeFormat as any).supportedLocalesOf(['en', 'fr', 'de', 'es', 'zh', 'ja', 'ko', 'ru']);
    } catch {
      return ['en'];
    }
  }
}

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
      return Math.floor(value);
    case 'auto':
    default:
      // Auto rounding: round for small values, floor for large ones
      const absValue = Math.abs(value);
      if (absValue < 10) return Math.round(value);
      if (absValue < 100) return Math.round(value / 5) * 5;
      return Math.floor(value);
  }
};

const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const memoize = <T extends (...args: any[]) => any>(fn: T, size: number = 100): T => {
  const cache = new LRUCache<string, ReturnType<T>>(size);
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
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
    const minIndex = minUnit ? UNIT_ORDER.indexOf(minUnit) : UNIT_ORDER.length - 2; // Exclude 'now'

    for (let i = Math.max(maxIndex, 0); i <= Math.min(minIndex, UNIT_ORDER.length - 2); i++) {
      const unit = UNIT_ORDER[i];
      const seconds = SECONDS_IN_UNIT[unit];
      const value = diffSeconds / seconds;
      
      if (Math.abs(value) >= 1) {
        return { unit, value, seconds };
      }
    }

    return { unit: 'now', value: diffSeconds, seconds: 0 };
  }

  static isWithinDayThreshold(
    diffSeconds: number,
    threshold: number,
    locale: string
  ): boolean {
    return Math.abs(diffSeconds) < SECONDS_IN_UNIT.day * threshold && 
           LocaleResolver.isEnglishLocale(locale);
  }

  static getDayLabel(diffSeconds: number, numeric: NumericFormat): string | null {
    if (numeric === 'always') return null;
    
    const dayDiff = Math.floor(diffSeconds / SECONDS_IN_UNIT.day);
    
    if (dayDiff === 1) return 'yesterday';
    if (dayDiff === -1) return 'tomorrow';
    if (dayDiff === 0) return 'today';
    
    return null;
  }

  static determineStyle(
    diffSeconds: number,
    style: TimeStyle
  ): 'long' | 'short' | 'narrow' {
    if (style !== 'auto') return style;
    
    const absSeconds = Math.abs(diffSeconds);
    
    if (absSeconds < SECONDS_IN_UNIT.hour) return 'narrow';
    if (absSeconds < SECONDS_IN_UNIT.day) return 'short';
    return 'long';
  }
}

/* -------------------------------------------------------------------------- */
/* Formatter Functions                                                        */
/* -------------------------------------------------------------------------- */

class TimeFormatter {
  static formatJustNow(locale: string, threshold: number): string {
    if (LocaleResolver.isEnglishLocale(locale)) {
      return threshold === 0 ? 'now' : 'just now';
    }
    
    const cache = getCache();
    const rtf = cache.getRelativeTimeFormat(locale, 'short', 'auto');
    return rtf.format(0, 'second');
  }

  static formatShort(
    value: number,
    unit: TimeAgoUnit,
    labels: Record<TimeAgoUnit, string>,
    futurePrefix: string,
    pastSuffix: string
  ): string {
    if (unit === 'now') {
      return value > 0 ? 'just now' : 'now';
    }

    const absValue = Math.abs(value);
    
    return value > 0
      ? `${absValue}${labels[unit]} ${pastSuffix}`
      : `${futurePrefix} ${absValue}${labels[unit]}`;
  }

  static formatLong(
    value: number,
    unit: TimeAgoUnit,
    locale: string,
    style: 'long' | 'short' | 'narrow',
    numeric: NumericFormat,
    futurePrefix?: string,
    pastSuffix?: string
  ): string {
    if (unit === 'now') {
      const cache = getCache();
      const rtf = cache.getRelativeTimeFormat(locale, 'short', numeric);
      return rtf.format(0, 'second');
    }

    const cache = getCache();
    const rtf = cache.getRelativeTimeFormat(locale, style, numeric);
    const formatted = rtf.format(-value, unit);

    // Add custom prefixes/suffixes if needed
    if (futurePrefix && value < 0 && !formatted.includes(futurePrefix)) {
      return `${futurePrefix} ${formatted}`;
    }
    
    if (pastSuffix && value > 0 && !formatted.includes(pastSuffix)) {
      return `${formatted} ${pastSuffix}`;
    }

    return formatted;
  }

  static formatAbsolute(
    date: Date,
    locale: string,
    formatOptions?: Intl.DateTimeFormatOptions,
    customFormatter?: (date: Date, locale: string) => string,
    timeZone?: string
  ): string {
    if (customFormatter) {
      return customFormatter(date, locale);
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(timeZone && { timeZone }),
    };
    
    const options = { ...defaultOptions, ...formatOptions };
    const cache = getCache();
    const dtf = cache.getDateTimeFormat(locale, options);
    return dtf.format(date);
  }

  static formatCustom(
    template: string,
    data: {
      value: number;
      unit: TimeAgoUnit;
      isFuture: boolean;
      absValue: number;
      formatted: string;
      absoluteDate?: string;
    }
  ): string {
    return template.replace(PLACEHOLDER_REGEX, (match, key) => {
      switch (key) {
        case 'value': return Math.abs(data.value).toString();
        case 'unit': return data.unit;
        case 'isFuture': return data.isFuture ? 'future' : 'past';
        case 'absValue': return data.absValue.toString();
        case 'formatted': return data.formatted;
        case 'absoluteDate': return data.absoluteDate || '';
        case 'direction': return data.isFuture ? 'future' : 'past';
        default: return match;
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Options Normalization                                                      */
/* -------------------------------------------------------------------------- */

class OptionsNormalizer {
  static normalize(options: TimeAgoOptions): Required<Omit<TimeAgoOptions, 'locale'>> & { locale: string } {
    const {
      locale = DEFAULT_OPTIONS.locale,
      style = DEFAULT_OPTIONS.style,
      numeric = DEFAULT_OPTIONS.numeric,
      short = DEFAULT_OPTIONS.short,
      justNowThreshold = DEFAULT_OPTIONS.justNowThreshold,
      rounding = DEFAULT_OPTIONS.rounding,
      maxUnit,
      minUnit,
      shortLabels = {},
      now = Date.now(),
      absoluteAfter = DEFAULT_OPTIONS.absoluteAfter,
      absoluteFormat,
      absoluteFormatter,
      alwaysShowAgo = DEFAULT_OPTIONS.alwaysShowAgo,
      withTitle = DEFAULT_OPTIONS.withTitle,
      format,
      futurePrefix = DEFAULT_OPTIONS.futurePrefix,
      pastSuffix = DEFAULT_OPTIONS.pastSuffix,
      perf = DEFAULT_OPTIONS.perf,
      cacheSize = DEFAULT_OPTIONS.cacheSize,
      forceRelative = DEFAULT_OPTIONS.forceRelative,
      timeZone,
      raw = false,
    } = options;

    // Validate unit order
    if (maxUnit && minUnit && UNIT_ORDER.indexOf(maxUnit) > UNIT_ORDER.indexOf(minUnit)) {
      throw new Error('maxUnit must be larger than or equal to minUnit');
    }

    // Validate locale
    const resolvedLocale = LocaleResolver.resolveLocale(locale);

    // Enable performance monitoring
    if (perf) {
      perfMonitor.enable();
    } else {
      perfMonitor.disable();
    }

    // Update cache size if needed
    if (cacheSize !== DEFAULT_OPTIONS.cacheSize) {
      getCache(cacheSize);
    }

    return {
      locale: resolvedLocale,
      style,
      numeric,
      short,
      justNowThreshold: Math.max(0, justNowThreshold),
      rounding,
      maxUnit,
      minUnit,
      shortLabels: { ...DEFAULT_SHORT_LABELS, ...shortLabels } as Record<TimeAgoUnit, string>,
      now,
      absoluteAfter,
      absoluteFormat,
      absoluteFormatter,
      alwaysShowAgo,
      withTitle,
      format,
      futurePrefix,
      pastSuffix,
      perf,
      cacheSize,
      forceRelative,
      timeZone,
      raw,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Main API                                                                   */
/* -------------------------------------------------------------------------- */

export function timeAgo(
  input: string | number | Date,
  options: TimeAgoOptions = {}
): string | TimeAgoResult {
  const perfLabel = `timeAgo:${typeof input}`;
  
  return perfMonitor.measure(perfLabel, () => {
    // Handle null/undefined input
    if (input == null) {
      if (options.raw) {
        return {
          value: 0,
          unit: 'now',
          isFuture: false,
          seconds: 0,
          formatted: '',
          raw: {
            diffSeconds: 0,
            locale: '',
            now: 0,
            date: new Date(),
          },
        };
      }
      return '';
    }
    
    // Parse and validate date
    const date = input instanceof Date ? input : new Date(input);
    if (!isValidDate(date)) {
      if (options.raw) {
        return {
          value: 0,
          unit: 'now',
          isFuture: false,
          seconds: 0,
          formatted: 'Invalid date',
          raw: {
            diffSeconds: 0,
            locale: '',
            now: 0,
            date,
          },
        };
      }
      return 'Invalid date';
    }

    // Normalize options
    const normalized = OptionsNormalizer.normalize(options);
    const {
      locale,
      style,
      numeric,
      short,
      justNowThreshold,
      rounding,
      maxUnit,
      minUnit,
      shortLabels,
      now,
      absoluteAfter,
      absoluteFormat,
      absoluteFormatter,
      alwaysShowAgo,
      withTitle,
      format,
      futurePrefix,
      pastSuffix,
      forceRelative,
      timeZone,
      raw,
    } = normalized;

    // Calculate time difference
    const diffSeconds = (now - date.getTime()) / 1000;
    const absDiffSeconds = Math.abs(diffSeconds);
    const isFuture = diffSeconds < 0;

    // Prepare result data
    const resultData: Omit<TimeAgoResult, 'formatted'> = {
      value: 0,
      unit: 'now',
      isFuture,
      seconds: absDiffSeconds,
      raw: {
        diffSeconds,
        locale,
        now,
        date,
      },
    };

    // 1. Absolute date fallback
    const shouldUseAbsolute = !forceRelative && 
      absoluteAfter !== false && 
      absDiffSeconds >= absoluteAfter!;

    if (shouldUseAbsolute) {
      const absoluteDate = TimeFormatter.formatAbsolute(
        date,
        locale,
        absoluteFormat,
        absoluteFormatter,
        timeZone
      );
      
      resultData.absoluteDate = absoluteDate;
      resultData.unit = 'now';
      
      if (raw) {
        return {
          ...resultData,
          formatted: absoluteDate,
        };
      }
      
      if (withTitle) {
        const relative = timeAgo(date, { ...options, forceRelative: true });
        return `<span title="${absoluteDate}">${relative}</span>`;
      }
      
      return absoluteDate;
    }

    // 2. Just now / now
    if (absDiffSeconds <= justNowThreshold) {
      const formatted = TimeFormatter.formatJustNow(locale, justNowThreshold);
      resultData.unit = 'now';
      
      if (raw) {
        return {
          ...resultData,
          formatted,
        };
      }
      return formatted;
    }

    // 3. Special day labels (English only)
    if (LocaleResolver.isEnglishLocale(locale)) {
      const dayLabel = TimeCalculator.getDayLabel(diffSeconds, numeric);
      if (dayLabel) {
        resultData.unit = 'day';
        resultData.value = Math.floor(diffSeconds / SECONDS_IN_UNIT.day);
        
        if (raw) {
          return {
            ...resultData,
            formatted: dayLabel,
          };
        }
        return dayLabel;
      }
    }

    // 4. Calculate appropriate unit
    const result = TimeCalculator.calculateTimeDifference(date, now, maxUnit, minUnit);
    
    if (!result || result.unit === 'now') {
      const formatted = TimeFormatter.formatJustNow(locale, justNowThreshold);
      resultData.unit = 'now';
      
      if (raw) {
        return {
          ...resultData,
          formatted,
        };
      }
      return formatted;
    }

    // Apply rounding
    const roundedValue = applyRounding(result.value, rounding);
    
    // Skip if rounded to zero (except for seconds)
    if (roundedValue === 0 && result.unit !== 'second') {
      const formatted = TimeFormatter.formatJustNow(locale, justNowThreshold);
      resultData.unit = 'now';
      
      if (raw) {
        return {
          ...resultData,
          formatted,
        };
      }
      return formatted;
    }

    // Update result data
    resultData.value = roundedValue;
    resultData.unit = result.unit;

    // 5. Format based on mode
    let formatted: string;
    
    if (format) {
      formatted = TimeFormatter.formatCustom(format, {
        value: roundedValue,
        unit: result.unit,
        isFuture,
        absValue: Math.abs(roundedValue),
        formatted: '',
        absoluteDate: resultData.absoluteDate,
      });
    } else if (short) {
      formatted = TimeFormatter.formatShort(
        roundedValue,
        result.unit,
        shortLabels,
        futurePrefix,
        pastSuffix
      );
    } else {
      const effectiveStyle = TimeCalculator.determineStyle(diffSeconds, style);
      formatted = TimeFormatter.formatLong(
        roundedValue,
        result.unit,
        locale,
        effectiveStyle,
        numeric,
        alwaysShowAgo ? undefined : futurePrefix,
        alwaysShowAgo ? pastSuffix : undefined
      );
    }

    if (raw) {
      return {
        ...resultData,
        formatted,
      };
    }

    return formatted;
  });
}

/* -------------------------------------------------------------------------- */
/* Additional Utility Functions                                               */
/* -------------------------------------------------------------------------- */

export function createTimeAgoFormatter(defaultOptions: TimeAgoOptions = {}) {
  const formatter = (input: string | number | Date, options?: TimeAgoOptions) => 
    timeAgo(input, { ...defaultOptions, ...options });
  
  formatter.withOptions = (extraOptions: TimeAgoOptions) => 
    createTimeAgoFormatter({ ...defaultOptions, ...extraOptions });
  
  return formatter;
}

export function clearFormatterCache(): void {
  if (globalCache) {
    globalCache.clear();
  }
  perfMonitor.clear();
}

export function getAvailableUnits(): readonly TimeAgoUnit[] {
  return UNIT_ORDER;
}

export function getSecondsInUnit(unit: TimeAgoUnit): number {
  return SECONDS_IN_UNIT[unit];
}

export function getPerformanceStats() {
  return {
    formatter: globalCache ? globalCache.getStats() : null,
    monitor: perfMonitor.getStats(),
  };
}

export function preloadLocales(locales: string[], cacheSize: number = 10): void {
  const cache = getCache();
  
  for (const locale of locales) {
    if (!LocaleResolver.isValidLocale(locale)) continue;
    
    // Preload RTF for common styles
    ['long', 'short', 'narrow'].forEach(style => {
      ['auto', 'always'].forEach(numeric => {
        cache.getRelativeTimeFormat(locale, style as any, numeric as any);
      });
    });
    
    // Preload DTF for common formats
    const formats: Intl.DateTimeFormatOptions[] = [
      { dateStyle: 'short' },
      { dateStyle: 'medium' },
      { dateStyle: 'long' },
      { dateStyle: 'full' },
    ];
    
    formats.forEach(format => {
      cache.getDateTimeFormat(locale, format);
    });
  }
}

export function parseDuration(duration: string): number | null {
  const regex = /^(\d+)\s*(years?|y|months?|mo|weeks?|w|days?|d|hours?|h|minutes?|m|seconds?|s)$/i;
  const match = duration.match(regex);
  
  if (!match) return null;
  
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  const unitMap: Record<string, TimeAgoUnit> = {
    'y': 'year', 'year': 'year', 'years': 'year',
    'mo': 'month', 'month': 'month', 'months': 'month',
    'w': 'week', 'week': 'week', 'weeks': 'week',
    'd': 'day', 'day': 'day', 'days': 'day',
    'h': 'hour', 'hour': 'hour', 'hours': 'hour',
    'm': 'minute', 'minute': 'minute', 'minutes': 'minute',
    's': 'second', 'second': 'second', 'seconds': 'second',
  };
  
  const timeUnit = unitMap[unit];
  if (!timeUnit) return null;
  
  return value * SECONDS_IN_UNIT[timeUnit];
}

/* -------------------------------------------------------------------------- */
/* React/Vue/Svelte Hooks                                                     */
/* -------------------------------------------------------------------------- */

export function useTimeAgo(defaultOptions: TimeAgoOptions = {}) {
  const formatter = createTimeAgoFormatter(defaultOptions);
  
  return {
    format: formatter,
    updateLocale: (locale: string) => {
      return createTimeAgoFormatter({ ...defaultOptions, locale });
    },
    clearCache: clearFormatterCache,
    getStats: getPerformanceStats,
  };
}

export function createAutoUpdatingTimeAgo(
  date: string | number | Date,
  options: TimeAgoOptions = {},
  updateInterval: number = 60000 // 1 minute
): {
  value: string;
  update: () => void;
  destroy: () => void;
} {
  let currentValue = timeAgo(date, options);
  let intervalId: NodeJS.Timeout | null = null;
  
  const update = () => {
    currentValue = timeAgo(date, { ...options, now: Date.now() });
  };
  
  const start = () => {
    if (intervalId) return;
    intervalId = setInterval(update, updateInterval);
  };
  
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  
  start();
  
  return {
    get value() {
      return currentValue;
    },
    update,
    destroy: stop,
  };
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
  
  if (opts.locale !== undefined && 
      typeof opts.locale !== 'string' && 
      !(Array.isArray(opts.locale) && opts.locale.every(l => typeof l === 'string'))) {
    return false;
  }
  
  if (opts.style !== undefined && !['long', 'short', 'narrow', 'auto'].includes(opts.style as string)) return false;
  if (opts.numeric !== undefined && !['always', 'auto'].includes(opts.numeric as string)) return false;
  if (opts.short !== undefined && typeof opts.short !== 'boolean') return false;
  if (opts.justNowThreshold !== undefined && typeof opts.justNowThreshold !== 'number') return false;
  if (opts.maxUnit !== undefined && !isTimeAgoUnit(opts.maxUnit)) return false;
  if (opts.minUnit !== undefined && !isTimeAgoUnit(opts.minUnit)) return false;
  if (opts.rounding !== undefined && !['floor', 'round', 'ceil', 'auto'].includes(opts.rounding as string)) return false;
  if (opts.now !== undefined && typeof opts.now !== 'number') return false;
  if (opts.absoluteAfter !== undefined && opts.absoluteAfter !== false && typeof opts.absoluteAfter !== 'number') return false;
  if (opts.alwaysShowAgo !== undefined && typeof opts.alwaysShowAgo !== 'boolean') return false;
  if (opts.withTitle !== undefined && typeof opts.withTitle !== 'boolean') return false;
  if (opts.perf !== undefined && typeof opts.perf !== 'boolean') return false;
  if (opts.cacheSize !== undefined && typeof opts.cacheSize !== 'number') return false;
  if (opts.forceRelative !== undefined && typeof opts.forceRelative !== 'boolean') return false;
  if (opts.raw !== undefined && typeof opts.raw !== 'boolean') return false;
  
  return true;
}

/* -------------------------------------------------------------------------- */
/* Export Cache for Testing                                                   */
/* -------------------------------------------------------------------------- */

export const _internals = {
  formatterCache: getCache,
  TimeCalculator,
  TimeFormatter,
  OptionsNormalizer,
  LocaleResolver,
  perfMonitor,
  clearFormatterCache,
} as const;

export default timeAgo;

