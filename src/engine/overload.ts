import type { Exercise, Session } from '../data/types';

/**
 * Progressive overload. When every set of an exercise reached the top of its rep range in each of the
 * last two sessions, suggest one way to make it harder. Staying at the top for another two sessions
 * moves to the next idea, in this fixed order.
 */
export type OverloadKind = 'reps' | 'tempo' | 'unilateral' | 'rest' | 'load';

export interface OverloadSuggestion {
  kind: OverloadKind;
  title: string;
  detail: string;
  /** Consecutive recent sessions at the top of the range. */
  streak: number;
}

const ORDER: OverloadKind[] = ['reps', 'tempo', 'unilateral', 'rest', 'load'];

export interface OverloadInput {
  exercise: Exercise;
  repMax: number;
  /** Sets planned per round for this exercise (a short day may only do 2). */
  sets: number;
  sessions: Session[];
}

/** How many of the most recent sessions containing this exercise had every set at or above repMax. */
export function topRangeStreak(input: OverloadInput): number {
  const needed = Math.min(input.sets, 2);
  const recent = [...input.sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((s) => s.sets.filter((l) => l.exerciseId === input.exercise.id && !l.durationSec))
    .filter((sets) => sets.length > 0);
  let n = 0;
  for (const sets of recent) {
    if (sets.length >= needed && sets.every((l) => l.reps >= input.repMax)) n++;
    else break;
  }
  return n;
}

function describe(kind: OverloadKind, ex: Exercise): Pick<OverloadSuggestion, 'title' | 'detail'> {
  switch (kind) {
    case 'reps': return { title: 'Add 2 reps', detail: 'You are at the top of the range. Aim for two more reps per set.' };
    case 'tempo': return { title: 'Slow the lowering', detail: 'Take 3 seconds on the way down and pause 1 second at the bottom.' };
    case 'unilateral': return { title: 'Go single-arm or single-leg', detail: ex.harder };
    case 'rest': return { title: 'Shorten the rest', detail: 'Cut rest by 15 seconds and keep the same reps.' };
    case 'load': return { title: 'Move up to the 10 kg', detail: 'Use the 10 kg dumbbell, or 10 + 5 kg, and drop back to the low end of the range.' };
  }
}

export function overloadSuggestion(input: OverloadInput): OverloadSuggestion | null {
  const streak = topRangeStreak(input);
  if (streak < 2) return null;
  const heavy = input.exercise.load === '10kg' || input.exercise.load === '10+5kg' || input.exercise.load === 'BW';
  const kinds = ORDER.filter((k) => !(k === 'load' && heavy));
  const level = Math.min(kinds.length - 1, Math.floor(streak / 2) - 1);
  const kind = kinds[level]!;
  return { kind, streak, ...describe(kind, input.exercise) };
}
