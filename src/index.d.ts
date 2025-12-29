import { timeAgo } from '../src/index.js';

describe('timeAgo()', () => {
  const NOW = new Date('2025-01-01T00:00:00Z').getTime();

  beforeAll(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => NOW);
  });

  afterAll(() => {
    Date.now.mockRestore();
  });

  test('returns "just now"', () => {
    expect(timeAgo(new Date(NOW))).toBe('just now');
  });

  test('returns seconds ago', () => {
    const d = new Date(NOW - 10 * 1000);
    expect(timeAgo(d)).toBe('10 seconds ago');
  });

  test('returns 1 second ago (singular)', () => {
    const d = new Date(NOW - 1 * 1000);
    expect(timeAgo(d)).toBe('1 second ago');
  });

  test('returns minutes ago', () => {
    const d = new Date(NOW - 5 * 60 * 1000);
    expect(timeAgo(d)).toBe('5 minutes ago');
  });

  test('returns hours ago', () => {
    const d = new Date(NOW - 3 * 60 * 60 * 1000);
    expect(timeAgo(d)).toBe('3 hours ago');
  });

  test('returns "yesterday"', () => {
    const d = new Date(NOW - 24 * 60 * 60 * 1000);
    expect(timeAgo(d)).toBe('yesterday');
  });

  test('returns days ago', () => {
    const d = new Date(NOW - 4 * 24 * 60 * 60 * 1000);
    expect(timeAgo(d)).toBe('4 days ago');
  });

  test('returns weeks ago', () => {
    const d = new Date(NOW - 2 * 7 * 24 * 60 * 60 * 1000);
    expect(timeAgo(d)).toBe('2 weeks ago');
  });

  test('returns months ago', () => {
    const d = new Date(NOW - 3 * 30 * 24 * 60 * 60 * 1000);
    expect(timeAgo(d)).toBe('3 months ago');
  });

  test('returns years ago', () => {
    const d = new Date(NOW - 2 * 365 * 24 * 60 * 60 * 1000);
    expect(timeAgo(d)).toBe('2 years ago');
  });

  test('throws for invalid date input', () => {
    expect(() => timeAgo('invalid')).toThrow();
  });
});


