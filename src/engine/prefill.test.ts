import { describe, expect, it } from 'vitest';
import type { LoggedSet, Session } from '../data/types';
import { lastSetsByExercise, prefill } from './prefill';

const set = (exerciseId: string, setNo: number, reps: number, weightKg: number, extra: Partial<LoggedSet> = {}): LoggedSet => ({
  exerciseId, setNo, reps, weightKg, doneAt: 1, ...extra,
});
const session = (id: string, startedAt: number, sets: LoggedSet[]): Session => ({
  id, date: '2026-10-01', workoutId: 'w', status: 'done', startedAt, endedAt: startedAt + 1, intensity: 'normal', sets, totalVolume: 0,
});

describe('lastSetsByExercise', () => {
  it('keeps the latest session that contained each exercise', () => {
    const m = lastSetsByExercise([
      session('new', 200, [set('press', 1, 12, 10)]),
      session('old', 100, [set('press', 1, 8, 10), set('row', 1, 10, 10)]),
    ]);
    expect(m.get('press')).toEqual([set('press', 1, 12, 10)]);
    expect(m.get('row')).toEqual([set('row', 1, 10, 10)]);
  });
});

describe('prefill', () => {
  const history = lastSetsByExercise([session('s', 100, [set('press', 1, 12, 10), set('press', 2, 10, 10), set('press', 3, 9, 10)])]);
  const base = { exerciseId: 'press', repMin: 8, repMax: 14, defaultKg: 10, current: [] as LoggedSet[], history };

  it('uses the same set number from last time', () => {
    expect(prefill({ ...base, setNo: 2 })).toEqual({ reps: 10, weightKg: 10 });
  });

  it('falls back to the last set when this set number was not done before', () => {
    expect(prefill({ ...base, setNo: 5 })).toEqual({ reps: 9, weightKg: 10 });
  });

  it('prefers what you just did today', () => {
    expect(prefill({ ...base, setNo: 2, current: [set('press', 1, 11, 12.5)] })).toEqual({ reps: 11, weightKg: 12.5 });
  });

  it('starts at the bottom of the rep range with the default load when there is no history', () => {
    expect(prefill({ ...base, history: new Map(), setNo: 1 })).toEqual({ reps: 8, weightKg: 10 });
    expect(prefill({ ...base, history: new Map(), repMin: undefined, repMax: undefined, setNo: 1 })).toEqual({ reps: 10, weightKg: 10 });
  });

  it('ignores holds', () => {
    const h = new Map([['plank', [set('plank', 1, 0, 0, { durationSec: 40 })]]]);
    expect(prefill({ exerciseId: 'plank', setNo: 1, defaultKg: 0, current: [], history: h })).toEqual({ reps: 10, weightKg: 0 });
  });
});
