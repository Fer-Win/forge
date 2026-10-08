import type { LoggedSet, Session } from '../data/types';
import { FINISHER_ID } from './session';

/** Most recent logged sets per exercise, taken from the latest session that contained it. */
export function lastSetsByExercise(sessions: Session[]): Map<string, LoggedSet[]> {
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const out = new Map<string, LoggedSet[]>();
  for (const s of sorted) {
    const byEx = new Map<string, LoggedSet[]>();
    for (const l of s.sets) {
      if (l.exerciseId === FINISHER_ID) continue;
      byEx.set(l.exerciseId, [...(byEx.get(l.exerciseId) ?? []), l]);
    }
    for (const [id, sets] of byEx) out.set(id, sets); // later sessions overwrite earlier ones
  }
  return out;
}

export interface PrefillInput {
  exerciseId: string;
  setNo: number;
  repMin?: number;
  repMax?: number;
  defaultKg: number;
  /** Sets already logged in this session. */
  current: LoggedSet[];
  history: Map<string, LoggedSet[]>;
}

/**
 * What the steppers start on: the previous set today, else the same set number last time,
 * else the exercise's default load with the low end of the rep range.
 */
export function prefill(i: PrefillInput): { reps: number; weightKg: number } {
  const today = [...i.current].reverse().find((l) => l.exerciseId === i.exerciseId && !l.durationSec);
  if (today) return { reps: today.reps, weightKg: today.weightKg };
  const last = (i.history.get(i.exerciseId) ?? []).filter((l) => !l.durationSec);
  const same = last.find((l) => l.setNo === i.setNo) ?? last[last.length - 1];
  if (same) return { reps: same.reps, weightKg: same.weightKg };
  return { reps: i.repMin ?? i.repMax ?? 10, weightKg: i.defaultKg };
}
