import { describe, it, expect } from 'vitest';
import { SEED_PLAN, SEED_WORKOUTS } from '../data/seed';
import type { CheckStatus, DayPrefs } from '../data/types';
import { dayPlan, statusForDate, type DayData } from './dayStatus';
import { computeStreak, weekProgress } from './streak';

// Week of Mon 2026-10-05: Push, Pull, Run A, Legs, Upper, Run B, Rest
function makeData(): DayData {
  return {
    week: SEED_PLAN,
    overrides: new Map(),
    workouts: new Map(SEED_WORKOUTS.map((w) => [w.id, w])),
    prefs: new Map(),
    checks: new Map(),
    sessions: [],
    runs: [],
  };
}

function mark(data: DayData, date: string, status: CheckStatus, only?: number) {
  const ids = dayPlan(date, data).itemIds;
  const m = data.checks.get(date) ?? new Map<string, CheckStatus>();
  (only === undefined ? ids : ids.slice(0, only)).forEach((id) => m.set(id, status));
  data.checks.set(date, m);
}

describe('statusForDate', () => {
  it('derives rest, pending, completed, partial, missed', () => {
    const d = makeData();
    const today = '2026-10-07';
    expect(statusForDate('2026-10-11', today, d)).toBe('rest');
    expect(statusForDate('2026-10-07', today, d)).toBe('pending');
    expect(statusForDate('2026-10-05', today, d)).toBe('missed'); // past, nothing logged
    mark(d, '2026-10-05', 'done');
    expect(statusForDate('2026-10-05', today, d)).toBe('completed');
    mark(d, '2026-10-06', 'done', 2);
    expect(statusForDate('2026-10-06', today, d)).toBe('partial');
  });

  it('all skipped counts as missed even today; undo (removing the mark) goes back to pending', () => {
    const d = makeData();
    mark(d, '2026-10-07', 'skipped');
    expect(statusForDate('2026-10-07', '2026-10-07', d)).toBe('missed');
    d.checks.delete('2026-10-07');
    expect(statusForDate('2026-10-07', '2026-10-07', d)).toBe('pending');
  });

  it('a finished guided session or a logged run completes the day', () => {
    const d = makeData();
    d.sessions.push({
      id: 's', date: '2026-10-05', workoutId: 'w-push', status: 'done', startedAt: 0, endedAt: 1,
      intensity: 'normal', sets: [], totalVolume: 0,
    });
    expect(statusForDate('2026-10-05', '2026-10-08', d)).toBe('completed');
    d.runs.push({ id: 'r', date: '2026-10-07', type: 'tempo', durationSec: 1800, distanceM: 5000, avgPaceSecPerKm: 360, effort: 6, source: 'manual' });
    expect(statusForDate('2026-10-07', '2026-10-08', d)).toBe('completed');
  });

  it('short mode shrinks the checklist, so fewer ticks complete the day', () => {
    const d = makeData();
    const full = dayPlan('2026-10-05', d).itemIds.length;
    d.prefs.set('2026-10-05', { date: '2026-10-05', intensity: 'normal', short: true } satisfies DayPrefs);
    const short = dayPlan('2026-10-05', d).itemIds.length;
    expect(short).toBeLessThan(full);
  });
});

describe('computeStreak', () => {
  it('counts consecutive completed days and ignores a pending today', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    mark(d, '2026-10-06', 'done');
    mark(d, '2026-10-07', 'done');
    expect(computeStreak('2026-10-08', '2026-10-01', d)).toBe(3);
  });

  it('a missed day ends the streak', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    mark(d, '2026-10-07', 'done'); // Tuesday missed
    expect(computeStreak('2026-10-08', '2026-10-01', d)).toBe(1);
  });

  it('rest days are neutral', () => {
    const d = makeData();
    // Fri 10-09 done, Sat 10-10 done, Sun rest, today Mon 10-12 pending
    for (const date of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']) mark(d, date, 'done');
    expect(computeStreak('2026-10-12', '2026-10-01', d)).toBe(6);
  });

  it('partial days keep the streak alive', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    mark(d, '2026-10-06', 'done', 1);
    expect(computeStreak('2026-10-07', '2026-10-01', d)).toBe(2);
  });

  it('ignores days before the start date', () => {
    const d = makeData();
    mark(d, '2026-10-07', 'done');
    expect(computeStreak('2026-10-08', '2026-10-07', d)).toBe(1);
  });
});

describe('weekProgress', () => {
  it('counts planned non-rest days and gives partial days half credit', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    mark(d, '2026-10-06', 'done', 1);
    const p = weekProgress('2026-10-08', d);
    expect(p.planned).toBe(6);
    expect(p.completed).toBe(1);
    expect(p.partial).toBe(1);
    expect(p.fraction).toBeCloseTo(1.5 / 6);
  });

  it('marking a day as rest removes it from the plan', () => {
    const d = makeData();
    d.overrides.set('2026-10-08', { date: '2026-10-08', assignment: { type: 'rest' } });
    expect(weekProgress('2026-10-08', d).planned).toBe(5);
  });
});
