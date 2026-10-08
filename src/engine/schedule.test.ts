import { describe, it, expect } from 'vitest';
import { SEED_PLAN, SEED_WORKOUTS } from '../data/seed';
import type { DayAssignment, PlanOverride } from '../data/types';
import { checkWeek, resolveAssignment, runATypeForWeek } from './schedule';

const workouts = new Map(SEED_WORKOUTS.map((w) => [w.id, w]));
const defaultWeek = SEED_PLAN.map((d) => d.assignment);
const wk = (id: string): DayAssignment => ({ type: 'workout', workoutId: id });
const rest: DayAssignment = { type: 'rest' };

describe('resolveAssignment', () => {
  it('uses the base week by weekday (Monday = Push)', () => {
    expect(resolveAssignment('2026-10-05', SEED_PLAN, new Map())).toEqual(wk('w-push'));
    expect(resolveAssignment('2026-10-11', SEED_PLAN, new Map())).toEqual(rest);
  });
  it('lets an override win for that date only', () => {
    const o: PlanOverride = { date: '2026-10-05', assignment: rest };
    const map = new Map([[o.date, o]]);
    expect(resolveAssignment('2026-10-05', SEED_PLAN, map)).toEqual(rest);
    expect(resolveAssignment('2026-10-12', SEED_PLAN, map)).toEqual(wk('w-push'));
  });
  it('falls back to rest when the week is empty', () => {
    expect(resolveAssignment('2026-10-05', [], new Map())).toEqual(rest);
  });
});

describe('checkWeek', () => {
  it('the default week has no warnings on a tempo week', () => {
    expect(checkWeek(defaultWeek, workouts, { runAIntervals: false })).toEqual([]);
  });
  it('warns about intervals the day before legs on interval weeks', () => {
    const w = checkWeek(defaultWeek, workouts, { runAIntervals: true });
    expect(w).toHaveLength(1);
    expect(w[0]?.weekday).toBe(2); // Wednesday
    expect(w[0]?.message).toMatch(/day before leg day/i);
  });
  it('warns when two hard sessions hit the same muscle group on consecutive days', () => {
    const week = [wk('w-push'), wk('w-push'), rest, rest, rest, rest, rest];
    const w = checkWeek(week, workouts, { runAIntervals: false });
    expect(w.some((x) => x.weekday === 1)).toBe(true);
  });
  it('warns for Push followed by Upper mix (both chest) but not Legs followed by Upper mix', () => {
    const a = checkWeek([wk('w-push'), wk('w-upper'), rest, rest, rest, rest, rest], workouts, { runAIntervals: false });
    expect(a.some((x) => x.weekday === 1)).toBe(true);
    const b = checkWeek([wk('w-legs'), wk('w-upper'), rest, rest, rest, rest, rest], workouts, { runAIntervals: false });
    expect(b).toEqual([]);
  });
  it('does not warn for core overlap or non-hard sessions', () => {
    const w = checkWeek([wk('w-legs'), wk('w-circuit'), rest, rest, rest, rest, rest], workouts, { runAIntervals: false });
    expect(w).toEqual([]);
  });
  it('wraps Sunday into Monday', () => {
    const w = checkWeek([wk('w-push'), rest, rest, rest, rest, rest, wk('w-push')], workouts, { runAIntervals: false });
    expect(w.some((x) => x.weekday === 0)).toBe(true);
  });
});

describe('runATypeForWeek', () => {
  it('alternates intervals and tempo weekly, starting with intervals', () => {
    expect(runATypeForWeek('2026-10-08', '2026-10-05')).toBe('intervals'); // start week
    expect(runATypeForWeek('2026-10-08', '2026-10-12')).toBe('tempo');
    expect(runATypeForWeek('2026-10-08', '2026-10-19')).toBe('intervals');
  });
});
