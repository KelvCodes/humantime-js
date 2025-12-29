imeAgo()', () => {
  test('returns "just now" for current time', () => {
    const now = new Date();
    expect(timeAgo(now)).toBe('just now');
  });

  test('returns seconds ago for less than a minute', () => {
    const secondsAgo = new Date(Date.now() - 10 * 1000);
    expect(timeAgo(secondsAgo)).toBe('10 seconds ago');
  });

  test('returns 1 second ago (singular)', () => {
    const oneSecondAgo = new Date(Date.now() - 1 * 1000);
    expect(timeAgo(oneSecondAgo)).toBe('1 second ago');
  });

  test('returns minutes ago for less than an hour', () => {
    const minutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(minutesAgo)).toBe('5 minutes ago');
  });

  test('returns 1 minute ago (singular)', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    expect(timeAgo(oneMinuteAgo)).toBe('1 minute ago');
  });

  test('returns hours ago for less than a day', () => {
    const hoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(hoursAgo)).toBe('3 hours ago');
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







