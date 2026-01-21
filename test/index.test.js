

  test('should format just now (within threshold)', () => {
    const justNow = new Date(mockNow - 4000); // 4 seconds ago
    expect(timeAgo(justNow)).toBe('just now');
    expect(timeAgo(justNow, { justNowThreshold: 0 })).toBe('now');
    expect(timeAgo(justNow, { justNowThreshold: 10 })).toBe('just now');
  });

  test('should format minutes/hours correctly', () => {
    const fiveMinutesAgo = new Date(mockNow - 5 * 60 * 1000);
    expect(timeAgo(fiveMinutesAgo)).toBe('5 minutes ago');
    
    const twoHoursAgo = new Date(mockNow - 2 * 60 * 60 * 1000);
    expect(timeAgo(twoHoursAgo)).toBe('2 hours ago');
    
    const futureHour = new Date(mockNow + 60 * 60 * 1000);
    expect(timeAgo(futureHour)).toBe('in 1 hour');
  });

  test('should format days with special labels (English)', () => {
    const yesterday = new Date(mockNow - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(mockNow + 24 * 60 * 60 * 1000);
    const today = new Date(mockNow);
    
    expect(timeAgo(yesterday)).toBe('yesterday');
    expect(timeAgo(tomorrow)).toBe('tomorrow');
    expect(timeAgo(today)).toBe('today');
  });

  test('should override special day labels with numeric: always', () => {
    const yesterday = new Date(mockNow - 24 * 60 * 60 * 1000);
    expect(timeAgo(yesterday, { numeric: 'always' })).toBe('1 day ago');
  });

  test('should handle future dates', () => {
    const in5Minutes = new Date(mockNow + 5 * 60 * 1000);
    expect(timeAgo(in5Minutes)).toBe('in 5 minutes');
    
    const in2Days = new Date(mockNow + 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(in2Days)).toBe('in 2 days');
  });
});

describe('timeAgo - Options', () => {
  test('should respect short mode', () => {
    const twoDaysAgo = new Date(mockNow - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoDaysAgo, { short: true })).toBe('2d ago');
    
    const in3Hours = new Date(mockNow + 3 * 60 * 60 * 1000);
    expect(timeAgo(in3Hours, { short: true })).toBe('in 3h');
  });

  test('should use custom short labels', () => {
    const threeDaysAgo = new Date(mockNow - 3 * 24 * 60 * 60 * 1000);
    const options = {
      short: true,
      shortLabels: { day: 'jours', week: 'sem' }
    };
    
    expect(timeAgo(threeDaysAgo, options)).toBe('3jours ago');
  });

  test('should respect maxUnit and minUnit', () => {
    const twoDaysAgo = new Date(mockNow - 2 * 24 * 60 * 60 * 1000);
    
    expect(timeAgo(twoDaysAgo, { maxUnit: 'week' })).toBe('2 days ago');
    expect(timeAgo(twoDaysAgo, { maxUnit: 'day' })).toBe('2 days ago');
    expect(timeAgo(twoDaysAgo, { maxUnit: 'hour' })).toBe('48 hours ago');
    expect(timeAgo(twoDaysAgo, { minUnit: 'day' })).toBe('2 days ago');
  });

  test('should throw error for invalid unit order', () => {
    expect(() => {
      timeAgo(new Date(), { maxUnit: 'minute', minUnit: 'hour' });
    }).toThrow('maxUnit must be larger than or equal to minUnit');
  });

  test('should apply rounding strategies', () => {
    const oneAndHalfHoursAgo = new Date(mockNow - 1.5 * 60 * 60 * 1000);
    
    expect(timeAgo(oneAndHalfHoursAgo, { rounding: 'floor' })).toBe('1 hour ago');
    expect(timeAgo(oneAndHalfHoursAgo, { rounding: 'round' })).toBe('2 hours ago');
    expect(timeAgo(oneAndHalfHoursAgo, { rounding: 'ceil' })).toBe('2 hours ago');
    
    // Auto rounding - should round small values
    const twoAndHalfMinutesAgo = new Date(mockNow - 2.5 * 60 * 1000);
    expect(timeAgo(twoAndHalfMinutesAgo, { rounding: 'auto' })).toBe('3 minutes ago');
  });

  test('should use absolute date fallback', () => {
    const twoYearsAgo = new Date(mockNow - 2 * 365 * 24 * 60 * 60 * 1000);
    
    // Should use absolute date by default
    const result = timeAgo(twoYearsAgo);
    expect(result).toMatch(/\w{3} \d{1,2}, \d{4}/); // "Jan 19, 2022" format
    
    // Should respect absoluteAfter setting
    expect(timeAgo(twoYearsAgo, { absoluteAfter: false })).toBe('2 years ago');
    expect(timeAgo(twoYearsAgo, { absoluteAfter: 100000 })).toBe('2 years ago');
  });

  test('should always show ago suffix when requested', () => {
    const twoHoursAgo = new Date(mockNow - 2 * 60 * 60 * 1000);
    expect(timeAgo(twoHoursAgo, { alwaysShowAgo: true })).toBe('2 hours ago');
    
    // English RelativeTimeFormat already includes "ago", but should still work
    expect(timeAgo(twoHoursAgo, { alwaysShowAgo: false })).toBe('2 hours ago');
  });

  test('should handle custom "now" for SSR/testing', () => {
    const customNow = mockNow + 1000;
    const oneSecondAgo = new Date(mockNow - 1000);
    
    expect(timeAgo(oneSecondAgo, { now: customNow })).toBe('2 seconds ago');
  });

  test('should work with withTitle option', () => {
    const twoDaysAgo = new Date(mockNow - 2 * 24 * 60 * 60 * 1000);
    const result = timeAgo(twoDaysAgo, { withTitle: true });
    
    expect(result).toContain('<span title="');
    expect(result).toContain('">2 days ago</span>');
  });
});

describe('timeAgo - Internationalization', () => {
  test('should handle different locales', () => {
    const oneDayAgo = new Date(mockNow - 24 * 60 * 60 * 1000);
    
    // Spanish
    expect(timeAgo(oneDayAgo, { locale: 'es' })).toBe('ayer');
    
    // French
    expect(timeAgo(oneDayAgo, { locale: 'fr' })).toBe('hier');
    
    // German
    expect(timeAgo(oneDayAgo, { locale: 'de' })).toBe('gestern');
  });

  test('should handle locale arrays', () => {
    const oneDayAgo = new Date(mockNow - 24 * 60 * 60 * 1000);
    
    expect(timeAgo(oneDayAgo, { locale: ['fr', 'en'] })).toBe('hier');
    expect(timeAgo(oneDayAgo, { locale: ['xx', 'en'] })).toBe('yesterday');
  });

  test('should fallback to default locale for invalid locales', () => {
    const oneDayAgo = new Date(mockNow - 24 * 60 * 60 * 1000);
    
    expect(timeAgo(oneDayAgo, { locale: 'invalid-locale' })).toBe('yesterday');
  });

  test('should respect different styles', () => {
    const twoHoursAgo = new Date(mockNow - 2 * 60 * 60 * 1000);
    
    expect(timeAgo(twoHoursAgo, { style: 'long' })).toBe('2 hours ago');
    expect(timeAgo(twoHoursAgo, { style: 'short' })).toBe('2 hr. ago');
    expect(timeAgo(twoHoursAgo, { style: 'narrow' })).toBe('2h ago');
  });

  test('should auto-select style based on time difference', () => {
    const fiveMinutesAgo = new Date(mockNow - 5 * 60 * 1000);
    const twoDaysAgo = new Date(mockNow - 2 * 24 * 60 * 60 * 1000);
    
    expect(timeAgo(fiveMinutesAgo, { style: 'auto' })).toMatch(/minutes? ago/);
    expect(timeAgo(twoDaysAgo, { style: 'auto' })).toBe('2 days ago');
  });
});

describe('timeAgo - Advanced Features', () => {
  test('should return raw data when raw option is true', () => {
    const twoDaysAgo = new Date(mockNow - 2 * 24 * 60 * 60 * 1000);
    const result = timeAgo(twoDaysAgo, { raw: true });
    
    expect(result).toMatchObject({
      value: 2,
      unit: 'day',
      isFuture: false,
      seconds: 172800,
      formatted: expect.any(String),
      raw: {
        diffSeconds: 172800,
        locale: 'en',
        now: mockNow,
        date: twoDaysAgo,
      },
    });
  });

  test('should use custom format template', () => {
    const threeHoursAgo = new Date(mockNow - 3 * 60 * 60 * 1000);
    
    const result = timeAgo(threeHoursAgo, {
      format: '{value} {unit} {direction} | {absoluteDate}'
    });
    
    expect(result).toMatch(/\d+ \w+ \w+ \|/);
  });

  test('should use custom formatter for absolute dates', () => {
    const twoYearsAgo = new Date(mockNow - 2 * 365 * 24 * 60 * 60 * 1000);
    
    const customFormatter = (date: Date, locale: string) => {
      return `Custom: ${date.getFullYear()}`;
    };
    
    const result = timeAgo(twoYearsAgo, {
      absoluteAfter: 1000000,
      absoluteFormatter: customFormatter
    });
    
    expect(result).toMatch(/Custom: 2022/);
  });

  test('should handle timeZone option', () => {
    const date = new Date('2024-01-20T00:00:00Z');
    
    const resultNY = timeAgo(date, {
      absoluteAfter: 0,
      timeZone: 'America/New_York'
    });
    
    const resultTokyo = timeAgo(date, {
      absoluteAfter: 0,
      timeZone: 'Asia/Tokyo'
    });
    
    expect(resultNY).not.toBe(resultTokyo);
  });

  test('should cache formatters for performance', () => {
    const dates = [
      new Date(mockNow - 1000),
      new Date(mockNow - 2000),
      new Date(mockNow - 3000),
    ];
    
    // First run should create formatters
    dates.forEach(date => timeAgo(date, { locale: 'fr' }));
    
    const stats = getPerformanceStats();
    expect(stats.formatter?.creations).toBeGreaterThan(0);
    
    // Second run should use cache
    dates.forEach(date => timeAgo(date, { locale: 'fr' }));
    
    const newStats = getPerformanceStats();
    expect(newStats.formatter?.hits).toBeGreaterThan(0);
  });
});

describe('createTimeAgoFormatter', () => {
  test('should create a pre-configured formatter', () => {
    const formatter = createTimeAgoFormatter({
      locale: 'fr',
      short: true,
      justNowThreshold: 10
    });
    
    const oneDayAgo = new Date(mockNow - 24 * 60 * 60 * 1000);
    expect(formatter(oneDayAgo)).toBe('1j ago');
    
    const justNow = new Date(mockNow - 5000);
    expect(formatter(justNow)).toBe('à l\'instant');
  });

  test('should allow overriding options', () => {
    const formatter = createTimeAgoFormatter({ locale: 'fr', short: true });
    
    const oneDayAgo = new Date(mockNow - 24 * 60 * 60 * 1000);
    expect(formatter(oneDayAgo, { short: false })).toBe('hier');
  });

  test('should support withOptions method', () => {
    const formatter = createTimeAgoFormatter({ locale: 'en' });
    const frenchFormatter = formatter.withOptions({ locale: 'fr' });
    
    const oneDayAgo = new Date(mockNow - 24 * 60 * 60 * 1000);
    expect(frenchFormatter(oneDayAgo)).toBe('hier');
  });
});

describe('Utility Functions', () => {
  describe('parseDuration', () => {
    test('should parse valid duration strings', () => {
      expect(parseDuration('5 minutes')).toBe(300);
      expect(parseDuration('2 hours')).toBe(7200);
      expect(parseDuration('1 day')).toBe(86400);
      expect(parseDuration('3d')).toBe(259200);
      expect(parseDuration('2w')).toBe(1209600);
      expect(parseDuration('1mo')).toBe(2592000);
      expect(parseDuration('1y')).toBe(31536000);
    });

    test('should handle case variations', () => {
      expect(parseDuration('5 MINUTES')).toBe(300);
      expect(parseDuration('2 Hours')).toBe(7200);
      expect(parseDuration('1 DAY')).toBe(86400);
    });

    test('should return null for invalid durations', () => {
      expect(parseDuration('')).toBe(null);
      expect(parseDuration('invalid')).toBe(null);
      expect(parseDuration('5 bananas')).toBe(null);
      expect(parseDuration('minutes')).toBe(null);
    });
  });

  describe('clearFormatterCache', () => {
    test('should clear the formatter cache', () => {
      const date = new Date(mockNow - 1000);
      timeAgo(date, { locale: 'fr' });
      
      const statsBefore = getPerformanceStats();
      expect(statsBefore.formatter?.creations).toBeGreaterThan(0);
      
      clearFormatterCache();
      
      const statsAfter = getPerformanceStats();
      expect(statsAfter.formatter?.creations).toBe(0);
    });
  });

  describe('getPerformanceStats', () => {
    test('should return performance statistics', () => {
      const date = new Date(mockNow - 1000);
      timeAgo(date, { locale: 'fr', perf: true });
      
      const stats = getPerformanceStats();
      expect(stats.formatter).toBeDefined();
      expect(stats.monitor).toBeDefined();
    });
  });
});

describe('Edge Cases', () => {
  test('should handle very large time differences', () => {
    const tenYearsAgo = new Date(mockNow - 10 * 365 * 24 * 60 * 60 * 1000);
    expect(timeAgo(tenYearsAgo)).toMatch(/Jan \d+, 2014/);
    
    const tenYearsFuture = new Date(mockNow + 10 * 365 * 24 * 60 * 60 * 1000);
    expect(timeAgo(tenYearsFuture)).toMatch(/Jan \d+, 2034/);
  });

  test('should handle zero time difference', () => {
    const now = new Date(mockNow);
    expect(timeAgo(now)).toBe('just now');
    expect(timeAgo(now, { justNowThreshold: 0 })).toBe('now');
  });

  test('should handle boundary conditions', () => {
    // Just over the threshold
    const justOverThreshold = new Date(mockNow - 6 * 1000); // 6 seconds
    expect(timeAgo(justOverThreshold, { justNowThreshold: 5 })).toBe('6 seconds ago');
    
    // Exactly at threshold
    const atThreshold = new Date(mockNow - 5 * 1000);
    expect(timeAgo(atThreshold, { justNowThreshold: 5 })).toBe('just now');
  });

  test('should handle different date inputs', () => {
    const timestamp = mockNow - 3600000; // 1 hour ago
    const isoString = new Date(timestamp).toISOString();
    
    expect(timeAgo(timestamp)).toBe('1 hour ago');
    expect(timeAgo(isoString)).toBe('1 hour ago');
    expect(timeAgo(new Date(timestamp))).toBe('1 hour ago');
  });
});

describe('Integration Tests', () => {
  test('should work with custom now for testing', () => {
    const testNow = 1705708800000;
    const oneHourAgo = new Date(testNow - 3600000);
    
    expect(timeAgo(oneHourAgo, { now: testNow })).toBe('1 hour ago');
    expect(timeAgo(oneHourAgo, { now: testNow + 3600000 })).toBe('2 hours ago');
  });

  test('should maintain consistency across repeated calls', () => {
    const date = new Date(mockNow - 3600000);
    const first = timeAgo(date);
    const second = timeAgo(date);
    const third = timeAgo(date);
    
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  test('should be deterministic with same inputs', () => {
    const date1 = new Date('2024-01-19T12:00:00Z');
    const date2 = new Date('2024-01-19T12:00:00Z');
    
    expect(timeAgo(date1)).toBe(timeAgo(date2));
  });
});

// Performance tests (if supported by test runner)
describe('Performance', () => {
  test('should be efficient with repeated calls', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      const date = new Date(mockNow - i * 60000); // Each minute apart
      timeAgo(date, { locale: 'en', short: true });
    }
    
    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Should complete in < 100ms
  });

  test('should benefit from caching', () => {
    const date = new Date(mockNow - 3600000);
    const options = { locale: 'fr', style: 'long' };
    
    // First call creates formatters
    const firstCallTime = measureTime(() => timeAgo(date, options));
    
    // Subsequent calls should be faster
    const secondCallTime = measureTime(() => timeAgo(date, options));
    const thirdCallTime = measureTime(() => timeAgo(date, options));
    
    expect(secondCallTime).toBeLessThan(firstCallTime * 0.5); // At least 2x faster
    expect(thirdCallTime).toBeLessThan(firstCallTime * 0.5);
  });
});

// Helper function for performance measurement
function measureTime(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}


































