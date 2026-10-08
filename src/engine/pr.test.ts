import { describe, expect, it } from 'vitest';
import type { LoggedSet, Session } from '../data/types';
import { bestsFromSessions, findPRs, prLabel } from './pr';

const set = (exerciseId: string, reps: number, weightKg: number, extra: Partial<LoggedSet> = {}): LoggedSet => ({
  exerciseId, setNo: 1, reps, weightKg, doneAt: 1, ...extra,
});
const session = (id: string, sets: LoggedSet[]): Session => ({
  id, date: '2026-10-01', workoutId: 'w', status: 'done', startedAt: 1, endedAt: 2, intensity: 'normal', sets, totalVolume: 0,
});

describe('bestsFromSessions', () => {
  it('collects weighted, bodyweight and hold bests, and skips the finisher', () => {
    const b = bestsFromSessions([
      session('s1', [set('press', 10, 10), set('press', 8, 15), set('pushup', 20, 0), set('plank', 0, 0, { durationSec: 45 }), set('finisher', 5, 0, { durationSec: 300 })]),
    ]);
    expect(b.get('press')).toEqual({ maxWeight: 15, maxSetVolume: 120, maxBwReps: 0, maxHold: 0 });
    expect(b.get('pushup')?.maxBwReps).toBe(20);
    expect(b.get('plank')?.maxHold).toBe(45);
    expect(b.has('finisher')).toBe(false);
  });

  it('leaves out the session being evaluated', () => {
    const b = bestsFromSessions([session('s1', [set('press', 10, 10)]), session('s2', [set('press', 10, 20)])], 's2');
    expect(b.get('press')?.maxWeight).toBe(10);
  });
});

describe('findPRs', () => {
  const prior = bestsFromSessions([
    session('old', [set('press', 10, 10), set('pushup', 15, 0), set('plank', 0, 0, { durationSec: 40 }), set('row', 12, 10)]),
  ]);

  it('flags a heavier weight', () => {
    expect(findPRs([set('press', 8, 15)], prior)).toEqual([{ exerciseId: 'press', kind: 'weight', value: 15, previous: 10 }]);
  });

  it('flags best set volume at the same weight', () => {
    const prs = findPRs([set('press', 12, 10)], prior);
    expect(prs).toEqual([{ exerciseId: 'press', kind: 'volume', value: 120, previous: 100 }]);
    expect(prLabel(prs[0]!)).toBe('120 kg set volume');
  });

  it('flags more bodyweight reps and longer holds', () => {
    expect(findPRs([set('pushup', 18, 0)], prior)).toEqual([{ exerciseId: 'pushup', kind: 'reps', value: 18, previous: 15 }]);
    expect(findPRs([set('plank', 0, 0, { durationSec: 50 })], prior)).toEqual([{ exerciseId: 'plank', kind: 'hold', value: 50, previous: 40 }]);
  });

  it('does not flag a tie, a lower mark or a first-ever exercise', () => {
    expect(findPRs([set('press', 10, 10)], prior)).toEqual([]);
    expect(findPRs([set('pushup', 12, 0)], prior)).toEqual([]);
    expect(findPRs([set('new-move', 50, 20)], prior)).toEqual([]);
  });

  it('reports one PR per exercise, preferring weight over volume', () => {
    const prs = findPRs([set('press', 12, 15), set('press', 14, 12.5)], prior);
    expect(prs).toHaveLength(1);
    expect(prs[0]?.kind).toBe('weight');
  });

  it('ignores the finisher', () => {
    expect(findPRs([set('finisher', 9, 0, { durationSec: 300 })], prior)).toEqual([]);
  });
});
