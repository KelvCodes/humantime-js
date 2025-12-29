xpect(timeAgo(hoursAgo)).toBe('3 hours ago');
  });

  test('returns "yesterday" for exactly one day ago', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(timeAgo(yesterday)).toBe('yesterday');
  });

  test('returns days ago for more than one day', () => {
    const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(timeAgo(daysAgo)).toBe('3 days ago');
  });

  test('throws or handles invalid date input', () => {
    expect(() => timeAgo('invalid-date')).toThrow();
  });
});









































