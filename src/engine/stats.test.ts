import { describe, it, expect } from 'vitest';
import { SEED_PLAN, SEED_WORKOUTS } from '../data/seed';
import type { CheckStatus, RunLog, Session } from '../data/types';
import { dayPlan, type DayData } from './dayStatus';
import {
  allPRs, bodyweightTrend, exerciseSeries, exercisesWithHistory, heatmap, longestStreak, monthGrid, runStats,
  weekStreak, weeklyCompletion, weeklyInsight,
} from './stats';

const START = '2026-09-07';
const TODAY = '2026-10-07'; // Wednesday (Run A)

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

const sess = (id: string, date: string, startedAt: number, sets: [number, number][]): Session => ({
  id, date, workoutId: 'w', status: 'partial', startedAt, endedAt: startedAt + 1, intensity: 'normal', totalVolume: 0,
  sets: sets.map(([weightKg, reps], i) => ({ exerciseId: 'curl', setNo: i + 1, reps, weightKg, doneAt: startedAt })),
});

const run = (date: string, distanceM: number, pace: number): RunLog => ({
  id: date, date, type: 'easy', durationSec: Math.round((distanceM / 1000) * pace), distanceM,
  avgPaceSecPerKm: pace, effort: 5, source: 'manual',
});

describe('heatmap', () => {
  it('is 12 weeks of Monday..Sunday ending this week, with future days blank', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    d.runs.push(run('2026-10-07', 5000, 330));
    const h = heatmap(TODAY, START, d);
    expect(h).toHaveLength(12);
    expect(h.every((c) => c.length === 7)).toBe(true);
    const last = h[11]!;
    expect(last[0]!.date).toBe('2026-10-05');
    expect(last[0]!.status).toBe('completed');
    expect(last[1]!.status).toBe('missed');
    expect(last[2]!.run).toBe(true);
    expect(last[3]!.status).toBe('future');
    expect(h[0]![0]!.status).toBe('before');
    expect(h[9]![6]!.status).toBe('rest');
  });
});

describe('weekly completion and streaks', () => {
  it('counts partial days as half', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    mark(d, '2026-10-06', 'done', 1);
    const w = weeklyCompletion(TODAY, START, d, 2);
    expect(w).toHaveLength(2);
    expect(w[1]).toMatchObject({ weekStart: '2026-10-05', planned: 6, completed: 1, partial: 1, pct: 25, current: true });
    expect(w[0]).toMatchObject({ weekStart: '2026-09-28', pct: 0, current: false });
  });

  it('finds the longest streak even after it has ended', () => {
    const d = makeData();
    for (const day of ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06']) mark(d, day, 'done');
    expect(longestStreak(TODAY, START, d)).toBe(5);
  });
});

describe('exercise history', () => {
  const sessions = [
    sess('b', '2026-10-06', 2000, [[12, 8], [12, 8]]),
    sess('a', '2026-09-30', 1000, [[10, 8]]),
    sess('c', '2026-10-07', 3000, [[12, 10]]),
  ];
  it('builds a series per session, oldest first', () => {
    const s = exerciseSeries(sessions, 'curl');
    expect(s.map((p) => p.sessionId)).toEqual(['a', 'b', 'c']);
    expect(s[1]).toMatchObject({ maxWeight: 12, bestReps: 8, volume: 192 });
    expect(exerciseSeries(sessions, 'nope')).toEqual([]);
  });
  it('lists exercises with history', () => {
    expect(exercisesWithHistory(sessions)).toEqual([{ exerciseId: 'curl', sessions: 3, last: '2026-10-07' }]);
  });
  it('detects each PR as it happened', () => {
    const prs = allPRs(sessions);
    expect(prs).toHaveLength(2);
    expect(prs[0]).toMatchObject({ sessionId: 'b', pr: { kind: 'weight', value: 12, previous: 10 } });
    expect(prs[1]).toMatchObject({ sessionId: 'c', pr: { kind: 'volume', value: 120 } });
  });
});

describe('runStats', () => {
  it('sums weekly distance, trends pace for 1 km+ runs and finds the longest', () => {
    const runs = [run('2026-10-06', 5000, 330), run('2026-09-29', 3000, 360), run('2026-10-01', 500, 400)];
    const s = runStats(runs, TODAY, 8);
    expect(s.weeklyDistance).toHaveLength(8);
    expect(s.weeklyDistance[7]).toEqual({ weekStart: '2026-10-05', meters: 5000 });
    expect(s.weeklyDistance[6]).toEqual({ weekStart: '2026-09-28', meters: 3500 });
    expect(s.paceTrend).toEqual([{ date: '2026-09-29', pace: 360 }, { date: '2026-10-06', pace: 330 }]);
    expect(s.longest).toEqual({ distanceM: 5000, date: '2026-10-06' });
    expect(s.totals.count).toBe(3);
    expect(s.totals.distanceM).toBe(8500);
  });
  it('is empty without runs', () => {
    const s = runStats([], TODAY);
    expect(s.longest).toBeNull();
    expect(s.paceTrend).toEqual([]);
  });
});

describe('bodyweightTrend', () => {
  it('averages by week and reports change', () => {
    const t = bodyweightTrend([
      { date: '2026-10-06', kg: 70 },
      { date: '2026-09-29', kg: 70 },
      { date: '2026-10-01', kg: 71 },
    ]);
    expect(t.weeks).toEqual([{ weekStart: '2026-09-28', avg: 70.5 }, { weekStart: '2026-10-05', avg: 70 }]);
    expect(t.latest).toEqual({ date: '2026-10-06', kg: 70 });
    expect(t.change).toBe(-0.5);
  });
  it('handles no data and one week', () => {
    expect(bodyweightTrend([])).toEqual({ weeks: [], latest: null, change: null });
    expect(bodyweightTrend([{ date: '2026-10-06', kg: 70 }]).change).toBeNull();
  });
});

describe('weeklyInsight', () => {
  const names = new Map([['curl', 'Curl']]);
  it('celebrates a PR this week first', () => {
    const d = makeData();
    d.sessions = [sess('a', '2026-09-30', 1000, [[10, 8]]), sess('b', '2026-10-06', 2000, [[12, 8]])];
    const i = weeklyInsight({ today: TODAY, startDate: START, data: d, exerciseNames: names });
    expect(i).toEqual({ kind: 'pr', text: 'New personal best on Curl: 12 kg.' });
  });
  it('then a streak of 3+', () => {
    const d = makeData();
    for (const day of ['2026-10-05', '2026-10-06', '2026-10-07']) mark(d, day, 'done');
    expect(weeklyInsight({ today: TODAY, startDate: START, data: d, exerciseNames: names }).kind).toBe('streak');
  });
  it('then consistency against last week', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    mark(d, '2026-10-06', 'done');
    const i = weeklyInsight({ today: TODAY, startDate: START, data: d, exerciseNames: names });
    expect(i).toEqual({ kind: 'consistency', text: '2 sessions done this week, ahead of 0 last week.' });
  });
  it('then distance, and a gentle fallback', () => {
    const d = makeData();
    d.runs = [run('2026-10-06', 5000, 330), run('2026-09-29', 3000, 360)];
    const i = weeklyInsight({ today: TODAY, startDate: START, data: d, exerciseNames: names });
    expect(i).toEqual({ kind: 'distance', text: '5.00 km run this week, up from 3.00 km.' });
    expect(weeklyInsight({ today: TODAY, startDate: TODAY, data: makeData(), exerciseNames: names }).kind).toBe('start');
  });
});

describe('month calendar and week streak', () => {
  it('lays out October 2026 Monday-first with blanks outside the month', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    const rows = monthGrid(TODAY, START, d, 2026, 9);
    expect(rows).toHaveLength(5);
    expect(rows[0]!.cells.slice(0, 3)).toEqual([null, null, null]);
    expect(rows[0]!.cells[3]!.date).toBe('2026-10-01');
    expect(rows[4]!.cells[5]!.date).toBe('2026-10-31');
    expect(rows[4]!.cells[6]).toBeNull();
    expect(rows[1]!.cells[0]).toMatchObject({ date: '2026-10-05', status: 'completed' });
    expect(rows[1]!.current).toBe(true);
    expect(rows[2]!.hit).toBeNull(); // future week
  });

  it('a week counts at half its planned days; the current week is neutral until then', () => {
    const d = makeData();
    for (const day of ['2026-09-28', '2026-09-29', '2026-09-30']) mark(d, day, 'done'); // 3 of 6
    expect(weekStreak(TODAY, START, d)).toEqual({ weeks: 1, days: 3 });
    mark(d, '2026-10-05', 'done');
    mark(d, '2026-10-06', 'done');
    mark(d, '2026-10-07', 'done');
    expect(weekStreak(TODAY, START, d)).toEqual({ weeks: 2, days: 6 });
    expect(monthGrid(TODAY, START, d, 2026, 8).find((r) => r.weekStart === '2026-09-28')!.hit).toBe(true);
  });

  it('a weak past week ends the streak', () => {
    const d = makeData();
    mark(d, '2026-10-05', 'done');
    mark(d, '2026-10-06', 'done');
    mark(d, '2026-10-07', 'done');
    expect(weekStreak(TODAY, START, d)).toEqual({ weeks: 1, days: 3 });
  });
});
