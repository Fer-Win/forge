import type { Workout, WorkoutBlock } from '../data/types';

export type Intensity = 'easy' | 'normal' | 'hard';

export interface BuildOptions {
  short: boolean;
  intensity: Intensity;
}

export interface BuiltSession {
  workoutId: string;
  blocks: WorkoutBlock[];
  finisher?: Workout['finisher'];
  estMin: number;
  /** Checklist ids: every exercise in order, plus 'finisher' when there is one. */
  itemIds: string[];
}

export const FINISHER_ID = 'finisher';
const DEFAULT_WORK_SEC = 40;
const WARM_COOL_SEC = 600;
const SHORT_WARM_COOL_SEC = 300;
const SHORT_TARGET_SEC = 20 * 60;

/** Rough clock time of a block. Circuits rest after every move; everything else after each round. */
export function blockSec(b: WorkoutBlock, kind: Workout['kind']): number {
  const work = b.durationSec ?? DEFAULT_WORK_SEC;
  const n = b.exerciseIds.length;
  const rests = kind === 'circuit' ? n : 1;
  return b.sets * (n * work + rests * b.restSec);
}

function adjust(b: WorkoutBlock, intensity: Intensity): WorkoutBlock {
  if (intensity === 'easy') {
    return { ...b, sets: b.sets > 2 ? b.sets - 1 : b.sets, restSec: b.restSec > 0 ? b.restSec + 15 : 0 };
  }
  if (intensity === 'hard') {
    return { ...b, restSec: b.restSec > 0 ? Math.max(30, b.restSec - 15) : 0 };
  }
  return b;
}

/**
 * Deterministically turns a template into today's session.
 * Short mode (20 min): 2 sets per block, keep blocks in order while they fit, finisher only if it fits.
 */
export function buildSession(workout: Workout, opts: BuildOptions): BuiltSession {
  const noWarmCool = workout.kind === 'mobility';
  let blocks = workout.blocks.map((b) => adjust(b, opts.intensity));
  let finisher = workout.finisher;
  let warmCool = noWarmCool ? 0 : WARM_COOL_SEC;

  if (opts.short && !noWarmCool) {
    warmCool = SHORT_WARM_COOL_SEC;
    const budget = SHORT_TARGET_SEC - SHORT_WARM_COOL_SEC;
    const capped = blocks.map((b) => ({ ...b, sets: Math.min(b.sets, 2) }));
    const kept: WorkoutBlock[] = [];
    let used = 0;
    for (const b of capped) {
      const s = blockSec(b, workout.kind);
      if (kept.length > 0 && used + s > budget) break;
      kept.push(b);
      used += s;
    }
    blocks = kept;
    const finSec = finisher ? finisher.minutes * 60 : 0;
    if (!finisher || used + finSec > budget) finisher = undefined;
  }

  const blockTotal = blocks.reduce((t, b) => t + blockSec(b, workout.kind), 0);
  const finTotal = finisher ? finisher.minutes * 60 : 0;
  const estMin = Math.round((warmCool + blockTotal + finTotal) / 60);

  const ids: string[] = [];
  for (const b of blocks) for (const id of b.exerciseIds) if (!ids.includes(id)) ids.push(id);
  if (finisher) ids.push(FINISHER_ID);

  return { workoutId: workout.id, blocks, finisher, estMin, itemIds: ids };
}

export interface LighterSuggestion {
  message: string;
  apply: { intensity: Intensity; short: boolean };
}

/** Energy / soreness check-in (1 = drained, 5 = great). Low scores suggest a lighter day. */
export function lighterSuggestion(energy: number | undefined): LighterSuggestion | null {
  if (energy === undefined || energy > 2) return null;
  return {
    message: 'Feeling low? A lighter, shorter session still counts.',
    apply: { intensity: 'easy', short: true },
  };
}
