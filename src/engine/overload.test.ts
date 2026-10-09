import { describe, it, expect } from 'vitest';
import type { Exercise, Session } from '../data/types';
import { overloadSuggestion, topRangeStreak } from './overload';

const ex = (over: Partial<Exercise> = {}): Exercise => ({
  id: 'curl', name: 'Curl', category: 'Arms', muscles: ['biceps'], equipment: 'dumbbell', mode: 'reps',
  sets: 3, repMin: 8, repMax: 12, restSec: 60, load: '5kg', cues: [], easier: '', harder: 'Single-arm curl', ...over,
});

let t = 1;
const session = (reps: number[], id = `s${t}`): Session => ({
  id, date: '2026-10-01', workoutId: 'w', status: 'done', startedAt: t++ * 1000, endedAt: t * 1000,
  intensity: 'normal', totalVolume: 0,
  sets: reps.map((r, i) => ({ exerciseId: 'curl', setNo: i + 1, reps: r, weightKg: 5, doneAt: 1 })),
});

describe('overload', () => {
  it('needs two consecutive top-of-range sessions', () => {
    const input = { exercise: ex(), repMax: 12, sets: 3 };
    expect(overloadSuggestion({ ...input, sessions: [session([12, 12, 12])] })).toBeNull();
    expect(overloadSuggestion({ ...input, sessions: [session([12, 12, 12]), session([12, 11, 12])] })).toBeNull();
    expect(topRangeStreak({ ...input, sessions: [session([12, 12, 12]), session([12, 12, 12])] })).toBe(2);
  });

  it('suggests more reps first, then escalates in order every two sessions', () => {
    const base = { exercise: ex(), repMax: 12, sets: 3 };
    const mk = (n: number) => Array.from({ length: n }, () => session([12, 12, 12]));
    expect(overloadSuggestion({ ...base, sessions: mk(2) })?.kind).toBe('reps');
    expect(overloadSuggestion({ ...base, sessions: mk(4) })?.kind).toBe('tempo');
    expect(overloadSuggestion({ ...base, sessions: mk(6) })?.kind).toBe('unilateral');
    expect(overloadSuggestion({ ...base, sessions: mk(6) })?.detail).toBe('Single-arm curl');
    expect(overloadSuggestion({ ...base, sessions: mk(8) })?.kind).toBe('rest');
    expect(overloadSuggestion({ ...base, sessions: mk(10) })?.kind).toBe('load');
  });

  it('never suggests the 10 kg when already on it', () => {
    const base = { exercise: ex({ load: '10kg' }), repMax: 12, sets: 3 };
    const sessions = Array.from({ length: 12 }, () => session([12, 12, 12]));
    expect(overloadSuggestion({ ...base, sessions })?.kind).toBe('rest');
  });

  it('a recent miss resets the streak and holds are ignored', () => {
    const base = { exercise: ex(), repMax: 12, sets: 3 };
    const sessions = [session([12, 12, 12]), session([12, 12, 12]), session([12, 9, 12])]; // last one is newest
    expect(topRangeStreak({ ...base, sessions })).toBe(0);
  });
});
