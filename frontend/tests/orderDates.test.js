import { describe, it, expect } from 'vitest';
import { formatOrderDate } from '../src/utils/orderDates.js';

describe('formatOrderDate', () => {
  it('shows the day, short month and year', () => {
    expect(formatOrderDate('2026-10-28T18:40:00.000Z')).toBe('28 Oct 2026');
  });

  it('uses Istanbul time for late night orders', () => {
    expect(formatOrderDate('2026-11-01T22:30:00.000Z')).toBe('2 Nov 2026');
  });

  it('accepts a Date as well as a string', () => {
    expect(formatOrderDate(new Date('2026-10-28T18:40:00.000Z'))).toBe('28 Oct 2026');
  });
});
