 ago
  expect(timeAgo(d)).toBe('10 seconds ago');
});

test('returns minutes ago', () => {
  const d = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
  expect(timeAgo(d)).toBe('5 minutes ago');
});

test('returns "yesterday"', () => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
  expect(timeAgo(d)).toBe('yesterday');
});



































