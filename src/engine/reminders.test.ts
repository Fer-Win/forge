import { describe, it, expect } from 'vitest';
import { dueNudges, eveningMinutes, msUntilNext, toMinutes, type ReminderState } from './reminders';

const base: ReminderState = {
  enabled: true, time: '18:00', nowMin: 17 * 60, today: '2026-10-07', trainsToday: true, loggedToday: false,
};

describe('reminders', () => {
  it('evening nudge is 20:00, or 21:00 when the daily is after 19:00', () => {
    expect(eveningMinutes('18:00')).toBe(1200);
    expect(eveningMinutes('19:30')).toBe(1260);
    expect(toMinutes('06:45')).toBe(405);
  });
  it('nothing before the chosen time', () => {
    expect(dueNudges(base)).toEqual([]);
  });
  it('daily nudge once at the chosen time', () => {
    expect(dueNudges({ ...base, nowMin: 18 * 60 })).toEqual(['daily']);
    expect(dueNudges({ ...base, nowMin: 18 * 60 + 5, lastDaily: '2026-10-07' })).toEqual([]);
  });
  it('evening nudge replaces the daily one when the app was not opened earlier', () => {
    expect(dueNudges({ ...base, nowMin: 20 * 60 })).toEqual(['evening']);
    expect(dueNudges({ ...base, nowMin: 20 * 60, lastEvening: '2026-10-07' })).toEqual([]);
  });
  it('silent on rest days, once logged, or when switched off', () => {
    const late = { ...base, nowMin: 20 * 60 };
    expect(dueNudges({ ...late, trainsToday: false })).toEqual([]);
    expect(dueNudges({ ...late, loggedToday: true })).toEqual([]);
    expect(dueNudges({ ...late, enabled: false })).toEqual([]);
  });
  it('computes the wait for the next nudge', () => {
    expect(msUntilNext({ ...base, nowMin: 17 * 60 }, 0)).toBe(60 * 60_000);
    expect(msUntilNext({ ...base, nowMin: 21 * 60 }, 0)).toBeNull();
    expect(msUntilNext({ ...base, loggedToday: true }, 0)).toBeNull();
  });
});
