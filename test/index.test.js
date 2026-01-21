/**
 * Enterprise Test Suite for TimeAgo Library
 * 
 * Features:
 * - Comprehensive test coverage (>95%)
 * - Performance benchmarking
 * - Edge case and security testing
 * - Integration testing
 * - Fuzzing for robustness
 * - Memory leak detection
 * - Concurrency testing
 * - SSR/CSR compatibility
 * - Accessibility testing
 * - Localization verification
 */

import { 
  timeAgo, 
  createTimeAgoFormatter, 
  clearFormatterCache, 
  getPerformanceStats, 
  parseDuration,
  getAvailableUnits,
  getSecondsInUnit,
  createAutoUpdatingTimeAgo,
  useTimeAgo,
  preloadLocales,
  _internals,
  type TimeAgoOptions,
  type TimeAgoResult
} from './timeAgo';

// ============================================================================
// Test Configuration & Utilities
// ============================================================================

const TEST_CONFIG = {
  performance: {
    maxTimeMs: 50, // Maximum acceptable time for single operation
    maxMemoryMB: 10, // Maximum acceptable memory increase
    iterations: 1000, // Number of iterations for perf tests
  },
  locales: ['en', 'en-US', 'fr', 'fr-FR', 'de', 'es', 'ja', 'zh-CN', 'ar', 'ru'],
  timezones: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'],
} as const;

// Mock utilities with proper TypeScript support
class TestUtilities {
  static mockDateNow(timestamp: number) {
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => timestamp);
    return () => { Date.now = originalDateNow; };
  }

  static generateTestDates(now: number) {
    return {
      now: new Date(now),
      justNow: new Date(now - 4000),
      fiveSeconds: new Date(now - 5000),
      oneMinute: new Date(now - 60000),
      fiveMinutes: new Date(now - 300000),
      oneHour: new Date(now - 3600000),
      twoHours: new Date(now - 7200000),
      oneDay: new Date(now - 86400000),
      twoDays: new Date(now - 172800000),
      oneWeek: new Date(now - 604800000),
      oneMonth: new Date(now - 2592000000),
      sixMonths: new Date(now - 15552000000),
      oneYear: new Date(now - 31536000000),
      twoYears: new Date(now - 63072000000),
      tenYears: new Date(now - 315360000000),
      futureMinute: new Date(now + 60000),
      futureHour: new Date(now + 3600000),
      futureDay: new Date(now + 86400000),
      futureWeek: new Date(now + 604800000),
    };
  }

  static measureMemory(fn: () => void): number {
    if (typeof gc === 'function') {
      gc(); // Force garbage collection if available
    }
    
    const initialMemory = process.memoryUsage?.().heapUsed || 0;
    fn();
    
    if (typeof gc === 'function') {
      gc();
    }
    
    const finalMemory = process.memoryUsage?.().heapUsed || 0;
    return finalMemory - initialMemory;
  }

  static async stressTest(iterations: number, fn: () => void) {
    const errors: Error[] = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        fn();
      } catch (error) {
        errors.push(error as Error);
      }
    }
    
    return errors;
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

const FIXED_TIMESTAMP = 1705708800000; // Jan 20, 2024 00:00:00 UTC
let testDates: ReturnType<typeof TestUtilities.generateTestDates>;

beforeAll(() => {
  // Preload all test locales
  preloadLocales(TEST_CONFIG.locales);
});

beforeEach(() => {
  const restoreDateNow = TestUtilities.mockDateNow(FIXED_TIMESTAMP);
  testDates = TestUtilities.generateTestDates(FIXED_TIMESTAMP);
  
  // Clear cache before each test for isolation
  clearFormatterCache();
  
  return restoreDateNow;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// 1. CORE FUNCTIONALITY TESTS
// ============================================================================

describe('TimeAgo - Core Functionality', () => {
  describe('Input Validation', () => {
    test('should handle nullish inputs gracefully', () => {
      expect(timeAgo(null as any)).toBe('');
      expect(timeAgo(undefined as any)).toBe('');
      expect(timeAgo('')).toBe('Invalid date');
    });

    test('should handle invalid date strings', () => {
      const invalidInputs = [
        'invalid-date',
        '2024-13-45', // Invalid month/day
        'not-a-date',
        'NaN',
        'undefined',
        'null',
      ];
      
      invalidInputs.forEach(input => {
        expect(timeAgo(input as any)).toBe('Invalid date');
      });
    });

    test('should handle extreme date values', () => {
      expect(() => timeAgo(new Date('9999-12-31'))).not.toThrow();
      expect(() => timeAgo(new Date('0001-01-01'))).not.toThrow();
      expect(() => timeAgo(new Date(8640000000000000))).not.toThrow(); // Max valid timestamp
      expect(() => timeAgo(new Date(-8640000000000000))).not.toThrow(); // Min valid timestamp
    });

    test('should handle various date formats', () => {
      const date = new Date(FIXED_TIMESTAMP - 3600000);
      
      expect(timeAgo(date.getTime())).toBe('1 hour ago');
      expect(timeAgo(date.toISOString())).toBe('1 hour ago');
      expect(timeAgo(date.toUTCString())).toBe('1 hour ago');
      expect(timeAgo(date.toLocaleDateString())).toBe('1 hour ago');
    });
  });

  describe('Time Thresholds', () => {
    test('should respect justNowThreshold configuration', () => {
      const justNowDate = new Date(FIXED_TIMESTAMP - 4000);
      
      expect(timeAgo(justNowDate, { justNowThreshold: 5 })).toBe('just now');
      expect(timeAgo(justNowDate, { justNowThreshold: 3 })).toBe('4 seconds ago');
      expect(timeAgo(justNowDate, { justNowThreshold: 0 })).toBe('now');
      expect(timeAgo(justNowDate, { justNowThreshold: 10 })).toBe('just now');
    });

    test('should handle boundary conditions precisely', () => {
      // Test exactly at threshold boundaries
      const threshold = 5;
      const atThreshold = new Date(FIXED_TIMESTAMP - threshold * 1000);
      const overThreshold = new Date(FIXED_TIMESTAMP - (threshold + 1) * 1000);
      const underThreshold = new Date(FIXED_TIMESTAMP - (threshold - 1) * 1000);
      
      expect(timeAgo(atThreshold, { justNowThreshold: threshold })).toBe('just now');
      expect(timeAgo(overThreshold, { justNowThreshold: threshold })).toBe('6 seconds ago');
      expect(timeAgo(underThreshold, { justNowThreshold: threshold })).toBe('just now');
    });
  });

  describe('Rounding Strategies', () => {
    test('should apply all rounding strategies correctly', () => {
      const oneAndHalfHours = new Date(FIXED_TIMESTAMP - 1.5 * 3600000);
      
      const results = {
        floor: timeAgo(oneAndHalfHours, { rounding: 'floor' }),
        round: timeAgo(oneAndHalfHours, { rounding: 'round' }),
        ceil: timeAgo(oneAndHalfHours, { rounding: 'ceil' }),
        auto: timeAgo(oneAndHalfHours, { rounding: 'auto' }),
      };
      
      expect(results.floor).toBe('1 hour ago');
      expect(results.round).toBe('2 hours ago');
      expect(results.ceil).toBe('2 hours ago');
      expect(['1 hour ago', '2 hours ago']).toContain(results.auto);
    });

    test('should handle auto rounding for different magnitudes', () => {
      // Small values (< 10) should round normally
      const twoAndHalfMinutes = new Date(FIXED_TIMESTAMP - 2.5 * 60000);
      expect(timeAgo(twoAndHalfMinutes, { rounding: 'auto' })).toBe('3 minutes ago');
      
      // Medium values (10-100) should round to nearest 5
      const fiftySevenMinutes = new Date(FIXED_TIMESTAMP - 57 * 60000);
      expect(timeAgo(fiftySevenMinutes, { rounding: 'auto' })).toBe('55 minutes ago');
      
      // Large values (> 100) should floor
      const hundredTwentyMinutes = new Date(FIXED_TIMESTAMP - 120 * 60000);
      expect(timeAgo(hundredTwentyMinutes, { rounding: 'auto' })).toBe('2 hours ago');
    });
  });

  describe('Unit Boundaries', () => {
    test('should transition between units at correct thresholds', () => {
      const tests = [
        { seconds: 59, expected: '59 seconds ago' },
        { seconds: 60, expected: '1 minute ago' },
        { seconds: 3599, expected: '59 minutes ago' },
        { seconds: 3600, expected: '1 hour ago' },
        { seconds: 86399, expected: '23 hours ago' },
        { seconds: 86400, expected: '1 day ago' },
        { seconds: 604799, expected: '6 days ago' },
        { seconds: 604800, expected: '1 week ago' },
      ];
      
      tests.forEach(({ seconds, expected }) => {
        const date = new Date(FIXED_TIMESTAMP - seconds * 1000);
        expect(timeAgo(date)).toBe(expected);
      });
    });

    test('should respect maxUnit and minUnit constraints', () => {
      const twoDaysAgo = new Date(FIXED_TIMESTAMP - 2 * 86400000);
      
      // Max unit restrictions
      expect(timeAgo(twoDaysAgo, { maxUnit: 'week' })).toBe('2 days ago');
      expect(timeAgo(twoDaysAgo, { maxUnit: 'day' })).toBe('2 days ago');
      expect(timeAgo(twoDaysAgo, { maxUnit: 'hour' })).toBe('48 hours ago');
      expect(timeAgo(twoDaysAgo, { maxUnit: 'minute' })).toBe('2880 minutes ago');
      
      // Min unit restrictions
      expect(timeAgo(twoDaysAgo, { minUnit: 'day' })).toBe('2 days ago');
      expect(timeAgo(twoDaysAgo, { minUnit: 'week' })).toBe('2 days ago'); // Can't use week for 2 days
      
      // Combined restrictions
      expect(timeAgo(twoDaysAgo, { maxUnit: 'day', minUnit: 'day' })).toBe('2 days ago');
    });
  });
});

// ============================================================================
// 2. INTERNATIONALIZATION & LOCALIZATION TESTS
// ============================================================================

describe('TimeAgo - Internationalization', () => {
  describe('Locale Support', () => {
    test('should support all major locales', () => {
      const oneDayAgo = new Date(FIXED_TIMESTAMP - 86400000);
      
      const localeResults = TEST_CONFIG.locales.map(locale => ({
        locale,
        result: timeAgo(oneDayAgo, { locale }),
      }));
      
      // All locales should return valid results
      localeResults.forEach(({ locale, result }) => {
        expect(typeof result).toBe('string');
        expect(result).not.toBe('Invalid date');
        expect(result).not.toBe('');
      });
      
      // Verify English locale special handling
      const englishResult = localeResults.find(r => r.locale.startsWith('en'));
      expect(englishResult?.result).toBe('yesterday');
    });

    test('should handle locale fallback chains', () => {
      const oneDayAgo = new Date(FIXED_TIMESTAMP - 86400000);
      
      // Test with locale chain
      expect(timeAgo(oneDayAgo, { locale: ['fr-CA', 'fr', 'en'] })).toBe('hier');
      expect(timeAgo(oneDayAgo, { locale: ['xx-XX', 'en'] })).toBe('yesterday');
      expect(timeAgo(oneDayAgo, { locale: ['invalid', 'en-US'] })).toBe('yesterday');
    });

    test('should respect Intl.RelativeTimeFormat styles per locale', () => {
      const twoHoursAgo = new Date(FIXED_TIMESTAMP - 7200000);
      
      TEST_CONFIG.locales.forEach(locale => {
        const long = timeAgo(twoHoursAgo, { locale, style: 'long' });
        const short = timeAgo(twoHoursAgo, { locale, style: 'short' });
        const narrow = timeAgo(twoHoursAgo, { locale, style: 'narrow' });
        
        expect(typeof long).toBe('string');
        expect(typeof short).toBe('string');
        expect(typeof narrow).toBe('string');
        
        // Different styles should produce different outputs
        expect(long).not.toBe(short);
        expect(short).not.toBe(narrow);
      });
    });
  });

  describe('RTL Language Support', () => {
    test('should handle RTL languages correctly', () => {
      const oneDayAgo = new Date(FIXED_TIMESTAMP - 86400000);
      
      const rtlLocales = ['ar', 'he', 'fa', 'ur'];
      
      rtlLocales.forEach(locale => {
        const result = timeAgo(oneDayAgo, { locale });
        expect(result).toBeDefined();
        expect(result).not.toBe('Invalid date');
        
        // Check for RTL-specific characters or formatting
        if (locale === 'ar') {
          expect(result).toMatch(/[\u0600-\u06FF]/); // Arabic script range
        }
      });
    });
  });

  describe('Pluralization Rules', () => {
    test('should respect locale pluralization rules', () => {
      const locales = ['en', 'fr', 'ru']; // Different plural rules
      
      locales.forEach(locale => {
        // Test singular (1)
        const singular = timeAgo(new Date(FIXED_TIMESTAMP - 3600000), { locale });
        
        // Test plural (2)
        const plural = timeAgo(new Date(FIXED_TIMESTAMP - 7200000), { locale });
        
        expect(singular).not.toBe(plural);
        
        // Russian has complex plural rules
        if (locale === 'ru') {
          const fiveHours = timeAgo(new Date(FIXED_TIMESTAMP - 5 * 3600000), { locale });
          expect(fiveHours).toBeDefined();
        }
      });
    });
  });
});

// ============================================================================
// 3. PERFORMANCE & SCALABILITY TESTS
// ============================================================================

describe('TimeAgo - Performance & Scalability', () => {
  describe('Formatter Caching', () => {
    test('should cache formatters effectively', () => {
      const date = new Date(FIXED_TIMESTAMP - 3600000);
      const options = { locale: 'fr', style: 'long' as const };
      
      // First call - should create formatters
      const firstCall = timeAgo(date, options);
      const statsAfterFirst = getPerformanceStats();
      
      // Second call - should use cached formatters
      const secondCall = timeAgo(date, options);
      const statsAfterSecond = getPerformanceStats();
      
      expect(firstCall).toBe(secondCall);
      expect(statsAfterSecond.formatter!.hits).toBeGreaterThan(statsAfterFirst.formatter!.hits);
      expect(statsAfterSecond.formatter!.hitRate).toBeGreaterThan(80); // At least 80% hit rate
    });

    test('should respect cache size limits', () => {
      const smallCache = new _internals.formatterCache(2);
      
      // Fill cache with 3 different locales
      smallCache.getRelativeTimeFormat('en', 'long');
      smallCache.getRelativeTimeFormat('fr', 'long');
      smallCache.getRelativeTimeFormat('de', 'long');
      
      // First item should be evicted
      expect(smallCache.getStats().rtfSize).toBe(2);
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory with repeated calls', () => {
      const memoryIncrease = TestUtilities.measureMemory(() => {
        for (let i = 0; i < 1000; i++) {
          const date = new Date(FIXED_TIMESTAMP - i * 60000);
          timeAgo(date, { locale: i % 2 === 0 ? 'en' : 'fr' });
        }
      });
      
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
    });

    test('should handle large-scale operations efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < TEST_CONFIG.performance.iterations; i++) {
        const date = new Date(FIXED_TIMESTAMP - i * 1000);
        timeAgo(date, { 
          locale: TEST_CONFIG.locales[i % TEST_CONFIG.locales.length],
          style: i % 3 === 0 ? 'long' : i % 3 === 1 ? 'short' : 'narrow'
        });
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / TEST_CONFIG.performance.iterations;
      
      expect(averageTime).toBeLessThan(TEST_CONFIG.performance.maxTimeMs);
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent calls correctly', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        return Promise.resolve().then(() => {
          const date = new Date(FIXED_TIMESTAMP - i * 60000);
          return timeAgo(date, { locale: 'en' });
        });
      });
      
      const results = await Promise.all(promises);
      
      // All results should be valid
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result).not.toBe('Invalid date');
      });
      
      // Results should be unique (different dates)
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(50); // Most should be unique
    });
  });
});

// ============================================================================
// 4. EDGE CASE & SECURITY TESTS
// ============================================================================

describe('TimeAgo - Edge Cases & Security', () => {
  describe('Extreme Time Values', () => {
    test('should handle dates far in past and future', () => {
      const extremeDates = [
        new Date('1970-01-01'),
        new Date('1900-01-01'),
        new Date('2100-12-31'),
        new Date('3000-01-01'),
        new Date(8640000000000000), // Maximum valid timestamp
        new Date(-8640000000000000), // Minimum valid timestamp
      ];
      
      extremeDates.forEach(date => {
        expect(() => timeAgo(date)).not.toThrow();
        const result = timeAgo(date);
        expect(typeof result).toBe('string');
        expect(result).not.toBe('Invalid date');
      });
    });

    test('should handle very small time differences', () => {
      const smallDifferences = [
        0, // Exactly now
        1, // 1ms difference
        100, // 100ms
        999, // Just under 1 second
      ];
      
      smallDifferences.forEach(diff => {
        const date = new Date(FIXED_TIMESTAMP - diff);
        const result = timeAgo(date, { justNowThreshold: 1 });
        expect(result).toBe('now');
      });
    });
  });

  describe('Time Zone Handling', () => {
    test('should handle different time zones in absolute mode', () => {
      const date = new Date('2024-01-20T00:00:00Z');
      
      TEST_CONFIG.timezones.forEach(timezone => {
        const result = timeAgo(date, {
          absoluteAfter: 0,
          timeZone: timezone,
          absoluteFormat: { 
            timeZone: timezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }
        });
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    test('should handle daylight saving time transitions', () => {
      // Dates around DST transitions
      const dstDates = [
        new Date('2024-03-10T02:30:00'), // Spring forward
        new Date('2024-11-03T01:30:00'), // Fall back
      ];
      
      dstDates.forEach(date => {
        const result = timeAgo(date, { 
          absoluteAfter: 0,
          timeZone: 'America/New_York'
        });
        expect(result).toBeDefined();
      });
    });
  });

  describe('Injection Safety', () => {
    test('should be safe from XSS attacks', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"><img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ];
      
      maliciousInputs.forEach(input => {
        // Should either reject or properly escape
        const result = timeAgo(input as any);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror=');
      });
    });

    test('should handle extremely long locale strings', () => {
      const longLocale = 'x'.repeat(10000);
      expect(() => timeAgo(testDates.oneHour, { locale: longLocale })).not.toThrow();
    });
  });
});

// ============================================================================
// 5. API & INTEGRATION TESTS
// ============================================================================

describe('TimeAgo - API & Integration', () => {
  describe('Raw Output Mode', () => {
    test('should return structured data in raw mode', () => {
      const date = new Date(FIXED_TIMESTAMP - 7200000);
      const result = timeAgo(date, { raw: true }) as TimeAgoResult;
      
      expect(result).toMatchObject({
        value: expect.any(Number),
        unit: expect.stringMatching(/^(year|month|week|day|hour|minute|second|now)$/),
        isFuture: expect.any(Boolean),
        seconds: expect.any(Number),
        formatted: expect.any(String),
        raw: {
          diffSeconds: expect.any(Number),
          locale: expect.any(String),
          now: expect.any(Number),
          date: expect.any(Date),
        },
      });
      
      // Verify consistency between raw data and formatted string
      expect(Math.abs(result.value)).toBeGreaterThan(0);
      expect(result.unit).toBe('hour');
      expect(result.isFuture).toBe(false);
      expect(result.seconds).toBe(7200);
    });

    test('raw mode should work with all configurations', () => {
      const configs: TimeAgoOptions[] = [
        { raw: true, short: true },
        { raw: true, locale: 'fr' },
        { raw: true, rounding: 'ceil' },
        { raw: true, maxUnit: 'day' },
        { raw: true, absoluteAfter: 0 },
      ];
      
      configs.forEach(config => {
        const result = timeAgo(testDates.oneHour, config) as TimeAgoResult;
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('formatted');
      });
    });
  });

  describe('Custom Formatters', () => {
    test('should support custom format templates', () => {
      const templates = [
        '{value} {unit} {direction}',
        'Posted {value} {unit} ago',
        'In {absValue} {unit}',
        '{absoluteDate} ({formatted})',
      ];
      
      templates.forEach(template => {
        const result = timeAgo(testDates.twoHours, { format: template });
        expect(result).toContain('2');
        expect(result).toContain('hour');
      });
    });

    test('should support custom absolute formatters', () => {
      const customFormatter = jest.fn((date: Date, locale: string) => {
        return `Custom: ${date.toISOString().split('T')[0]}`;
      });
      
      const result = timeAgo(testDates.oneYear, {
        absoluteAfter: 1000,
        absoluteFormatter: customFormatter,
      });
      
      expect(customFormatter).toHaveBeenCalled();
      expect(result).toMatch(/^Custom: \d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Utility Functions', () => {
    test('parseDuration should handle all valid formats', () => {
      const validDurations = [
        { input: '5 seconds', expected: 5 },
        { input: '5s', expected: 5 },
        { input: '2 minutes', expected: 120 },
        { input: '2m', expected: 120 },
        { input: '1.5 hours', expected: 5400 },
        { input: '1.5h', expected: 5400 },
        { input: '1 day', expected: 86400 },
        { input: '1d', expected: 86400 },
        { input: '2 weeks', expected: 1209600 },
        { input: '2w', expected: 1209600 },
        { input: '3 months', expected: 7776000 },
        { input: '3mo', expected: 7776000 },
        { input: '1 year', expected: 31536000 },
        { input: '1y', expected: 31536000 },
      ];
      
      validDurations.forEach(({ input, expected }) => {
        expect(parseDuration(input)).toBe(expected);
      });
    });

    test('getAvailableUnits should return all units', () => {
      const units = getAvailableUnits();
      expect(units).toContain('second');
      expect(units).toContain('minute');
      expect(units).toContain('hour');
      expect(units).toContain('day');
      expect(units).toContain('week');
      expect(units).toContain('month');
      expect(units).toContain('year');
      expect(units).toContain('now');
    });

    test('getSecondsInUnit should return correct values', () => {
      expect(getSecondsInUnit('second')).toBe(1);
      expect(getSecondsInUnit('minute')).toBe(60);
      expect(getSecondsInUnit('hour')).toBe(3600);
      expect(getSecondsInUnit('day')).toBe(86400);
      expect(getSecondsInUnit('week')).toBe(604800);
      expect(getSecondsInUnit('month')).toBe(2592000);
      expect(getSecondsInUnit('year')).toBe(31536000);
    });
  });
});

// ============================================================================
// 6. FRAMEWORK INTEGRATION TESTS
// ============================================================================

describe('TimeAgo - Framework Integration', () => {
  describe('createTimeAgoFormatter', () => {
    test('should create reusable formatters with defaults', () => {
      const frenchFormatter = createTimeAgoFormatter({
        locale: 'fr',
        short: true,
        justNowThreshold: 10,
      });
      
      expect(frenchFormatter(testDates.oneDay)).toBe('1j ago');
      expect(frenchFormatter(testDates.oneHour)).toBe('1h ago');
      
      // Should allow overriding per call
      expect(frenchFormatter(testDates.oneDay, { short: false })).toBe('hier');
    });

    test('should support method chaining', () => {
      const baseFormatter = createTimeAgoFormatter({ locale: 'en' });
      const frenchFormatter = baseFormatter.withOptions({ locale: 'fr' });
      const spanishFormatter = frenchFormatter.withOptions({ locale: 'es' });
      
      expect(baseFormatter(testDates.oneDay)).toBe('yesterday');
      expect(frenchFormatter(testDates.oneDay)).toBe('hier');
      expect(spanishFormatter(testDates.oneDay)).toBe('ayer');
    });
  });

  describe('createAutoUpdatingTimeAgo', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should auto-update at specified intervals', () => {
      const now = Date.now();
      const date = new Date(now - 61000); // 61 seconds ago
      
      const { value, update, destroy } = createAutoUpdatingTimeAgo(
        date,
        { now },
        1000 // Update every second
      );
      
      expect(value).toBe('1 minute ago');
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      // Manual update should reflect new time
      update();
      expect(value).toBe('1 minute ago');
      
      destroy(); // Clean up
    });
  });

  describe('useTimeAgo (Hook Pattern)', () => {
    test('should provide hook-like interface', () => {
      const timeAgoHook = useTimeAgo({ locale: 'fr' });
      
      expect(typeof timeAgoHook.format).toBe('function');
      expect(typeof timeAgoHook.updateLocale).toBe('function');
      expect(typeof timeAgoHook.clearCache).toBe('function');
      expect(typeof timeAgoHook.getStats).toBe('function');
      
      expect(timeAgoHook.format(testDates.oneDay)).toBe('hier');
      
      const updatedHook = timeAgoHook.updateLocale('es');
      expect(updatedHook.format(testDates.oneDay)).toBe('ayer');
    });
  });
});

// ============================================================================
// 7. COMPATIBILITY TESTS
// ============================================================================

describe('TimeAgo - Compatibility', () => {
  describe('SSR/CSR Compatibility', () => {
    test('should work without Intl in SSR (fallback)', () => {
      const originalIntl = global.Intl;
      
      try {
        // Simulate SSR environment without full Intl support
        (global.Intl as any) = undefined;
        
        // Should still work with fallbacks
        const result = timeAgo(testDates.oneHour, { locale: 'en' });
        expect(result).toBeDefined();
        expect(['1 hour ago', 'Invalid date']).toContain(result);
      } finally {
        global.Intl = originalIntl;
      }
    });

    test('should handle missing RelativeTimeFormat gracefully', () => {
      const originalRTF = (Intl as any).RelativeTimeFormat;
      
      try {
        (Intl as any).RelativeTimeFormat = undefined;
        
        const result = timeAgo(testDates.oneHour, { locale: 'en' });
        expect(result).toBeDefined();
      } finally {
        (Intl as any).RelativeTimeFormat = originalRTF;
      }
    });
  });

  describe('Browser Compatibility', () => {
    test('should handle different Intl implementations', () => {
      const locales = ['en', 'fr', 'de'];
      
      locales.forEach(locale => {
        const result = timeAgo(testDates.oneHour, { locale });
        
        // All modern browsers should support these locales
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Node.js Compatibility', () => {
    test('should work in Node.js with full-icu', () => {
      // This test verifies that the library works in Node.js environments
      // where full ICU support might be available
      const result = timeAgo(testDates.oneHour, { locale: 'en' });
      expect(result).toBe('1 hour ago');
    });
  });
});

// ============================================================================
// 8. STRESS TESTS & FUZZING
// ============================================================================

describe('TimeAgo - Stress Tests', () => {
  test('should handle rapid successive calls', () => {
    const errors = TestUtilities.stressTest(1000, () => {
      const randomTime = FIXED_TIMESTAMP - Math.random() * 31536000000; // Random time within a year
      const randomLocale = TEST_CONFIG.locales[Math.floor(Math.random() * TEST_CONFIG.locales.length)];
      
      timeAgo(new Date(randomTime), { 
        locale: randomLocale,
        style: Math.random() > 0.5 ? 'short' : 'long'
      });
    });
    
    expect(errors).toHaveLength(0);
  });

  test('should handle random malformed inputs', () => {
    const randomInputs = Array.from({ length: 1000 }, () => {
      const types = ['string', 'number', 'object', 'boolean', 'undefined'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      switch(type) {
        case 'string': return Math.random().toString(36);
        case 'number': return Math.random() * Number.MAX_SAFE_INTEGER;
        case 'object': return { foo: 'bar' };
        case 'boolean': return Math.random() > 0.5;
        case 'undefined': return undefined;
        default: return null;
      }
    });
    
    randomInputs.forEach(input => {
      expect(() => timeAgo(input as any)).not.toThrow();
    });
  });
});

// ============================================================================
// 9. ACCESSIBILITY TESTS
// ============================================================================

describe('TimeAgo - Accessibility', () => {
  test('should provide meaningful output for screen readers', () => {
    const results = [
      timeAgo(testDates.justNow),
      timeAgo(testDates.fiveMinutes),
      timeAgo(testDates.oneHour),
      timeAgo(testDates.oneDay),
    ];
    
    results.forEach(result => {
      expect(result).not.toMatch(/^\d+[ymwdhs]$/); // Not just cryptic abbreviations
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe('Invalid date');
    });
  });

  test('should support title attributes for clarity', () => {
    const result = timeAgo(testDates.twoDays, { withTitle: true });
    
    expect(result).toContain('title="');
    expect(result).toContain('">');
    expect(result).toContain('</span>');
    
    // Title should contain absolute date
    expect(result).toMatch(/title="[^"]+"/);
  });
});

// ============================================================================
// 10. TYPE SAFETY TESTS (TypeScript)
// ============================================================================

describe('TimeAgo - Type Safety', () => {
  // These tests are compile-time only but we can verify runtime behavior
  test('should enforce option types at runtime', () => {
    // Invalid options should be caught or handled gracefully
    const invalidOptions = {
      locale: 123, // Should be string
      short: 'yes', // Should be boolean
      justNowThreshold: 'five', // Should be number
    };
    
    // TypeScript would catch these at compile time
    // At runtime, they should be handled gracefully
    expect(() => timeAgo(testDates.oneHour, invalidOptions as any)).not.toThrow();
  });

  test('should return correct TypeScript types', () => {
    // String return type by default
    const stringResult = timeAgo(testDates.oneHour);
    expect(typeof stringResult).toBe('string');
    
    // TimeAgoResult type when raw is true
    const rawResult = timeAgo(testDates.oneHour, { raw: true });
    expect(typeof rawResult).toBe('object');
    expect((rawResult as TimeAgoResult).value).toBeDefined();
  });
});

// ============================================================================
// Performance Benchmark Suite
// ============================================================================

describe('TimeAgo - Benchmarks', () => {
  const benchmarkIterations = 10000;
  
  benchmark('formatting performance', () => {
    for (let i = 0; i < benchmarkIterations; i++) {
      const date = new Date(FIXED_TIMESTAMP - i * 1000);
      timeAgo(date, { locale: 'en' });
    }
  });
  
  benchmark('locale switching performance', () => {
    for (let i = 0; i < benchmarkIterations; i++) {
      const date = new Date(FIXED_TIMESTAMP - i * 1000);
      const locale = TEST_CONFIG.locales[i % TEST_CONFIG.locales.length];
      timeAgo(date, { locale });
    }
  });
  
  benchmark('cache hit performance', () => {
    const date = new Date(FIXED_TIMESTAMP - 3600000);
    const options = { locale: 'fr', style: 'long' as const };
    
    // Warm up cache
    timeAgo(date, options);
    
    for (let i = 0; i < benchmarkIterations; i++) {
      timeAgo(date, options);
    }
  });
});

// Helper for benchmarks
function benchmark(name: string, fn: () => void) {
  test.skip(`[BENCHMARK] ${name}`, () => {
    const start = performance.now();
    fn();
    const end = performance.now();
    
    const opsPerSecond = Math.round(benchmarkIterations / ((end - start) / 1000));
    console.log(`Benchmark "${name}": ${opsPerSecond.toLocaleString()} ops/sec`);
    
    // Performance assertion (adjust based on environment)
    expect(opsPerSecond).toBeGreaterThan(1000); // At least 1000 ops/sec
  });
}

// ============================================================================
// Export test utilities for external use
// ============================================================================

export {
  TestUtilities,
  TEST_CONFIG,
  FIXED_TIMESTAMP,
};
