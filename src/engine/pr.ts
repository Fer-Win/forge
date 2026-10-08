import type { LoggedSet, Session } from '../data/types';
import { FINISHER_ID } from './session';

/** Best marks per exercise from earlier sessions. Zero means "never done that way". */
export interface Bests {
  maxWeight: number;    // heaviest weighted set (kg)
  maxSetVolume: number; // best reps x kg in one weighted set
  maxBwReps: number;    // most reps in a bodyweight set
  maxHold: number;      // longest hold (s)
}

export type PRKind = 'weight' | 'volume' | 'reps' | 'hold';

export interface PR {
  exerciseId: string;
  kind: PRKind;
  value: number;
  previous: number;
}

const empty = (): Bests => ({ maxWeight: 0, maxSetVolume: 0, maxBwReps: 0, maxHold: 0 });

function addSet(b: Bests, l: LoggedSet) {
  if (l.durationSec) b.maxHold = Math.max(b.maxHold, l.durationSec);
  else if (l.weightKg > 0) {
    b.maxWeight = Math.max(b.maxWeight, l.weightKg);
    b.maxSetVolume = Math.max(b.maxSetVolume, l.reps * l.weightKg);
  } else b.maxBwReps = Math.max(b.maxBwReps, l.reps);
}

/** Bests across stored sessions. Pass `excludeId` to leave out the session being evaluated. */
export function bestsFromSessions(sessions: Session[], excludeId?: string): Map<string, Bests> {
  const out = new Map<string, Bests>();
  for (const s of sessions) {
    if (s.id === excludeId) continue;
    for (const l of s.sets) {
      if (l.exerciseId === FINISHER_ID) continue;
      const b = out.get(l.exerciseId) ?? empty();
      addSet(b, l);
      out.set(l.exerciseId, b);
    }
  }
  return out;
}

/**
 * Personal records in this session's sets. At most one PR per exercise: the heaviest weight if that moved,
 * otherwise best single-set volume; bodyweight moves count most reps; holds count longest time.
 * An exercise with no earlier history sets a baseline and is not flagged.
 */
export function findPRs(logs: LoggedSet[], prior: Map<string, Bests>): PR[] {
  const ids: string[] = [];
  for (const l of logs) if (l.exerciseId !== FINISHER_ID && !ids.includes(l.exerciseId)) ids.push(l.exerciseId);
  const out: PR[] = [];
  for (const id of ids) {
    const before = prior.get(id);
    if (!before) continue;
    const now = empty();
    for (const l of logs) if (l.exerciseId === id) addSet(now, l);

    if (now.maxHold > 0 && before.maxHold > 0 && now.maxHold > before.maxHold) {
      out.push({ exerciseId: id, kind: 'hold', value: now.maxHold, previous: before.maxHold });
    } else if (now.maxWeight > 0 && before.maxWeight > 0 && now.maxWeight > before.maxWeight) {
      out.push({ exerciseId: id, kind: 'weight', value: now.maxWeight, previous: before.maxWeight });
    } else if (now.maxWeight > 0 && before.maxWeight > 0 && now.maxSetVolume > before.maxSetVolume) {
      out.push({ exerciseId: id, kind: 'volume', value: now.maxSetVolume, previous: before.maxSetVolume });
    } else if (now.maxBwReps > 0 && before.maxBwReps > 0 && now.maxBwReps > before.maxBwReps) {
      out.push({ exerciseId: id, kind: 'reps', value: now.maxBwReps, previous: before.maxBwReps });
    }
  }
  return out;
}

export function prLabel(pr: PR): string {
  switch (pr.kind) {
    case 'weight': return `${pr.value} kg`;
    case 'volume': return `${pr.value} kg set volume`;
    case 'reps': return `${pr.value} reps`;
    case 'hold': return `${pr.value}s hold`;
  }
}
