import { describe, it, expect } from 'vitest';
import { addDays, startOfWeek, toDateStr, weekdayIndex, parseDateStr } from './dates';

describe('dates', () => {
  it('Monday is index 0 and Sunday is 6', () => {
    expect(weekdayIndex(parseDateStr('2026-10-05'))).toBe(0); // Monday
    expect(weekdayIndex(parseDateStr('2026-10-11'))).toBe(6); // Sunday
  });
  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('finds the Monday of the week', () => {
    expect(startOfWeek('2026-10-08')).toBe('2026-10-05');
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05');
  });
  it('formats local dates', () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
