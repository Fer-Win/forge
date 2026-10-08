import type { DayAssignment, Exercise, Load, Workout, WorkoutBlock } from '../data/types';
import type { RunAType } from '../engine/schedule';
import { buildSession } from '../engine/session';

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function loadLabel(l: Load): string {
  switch (l) {
    case 'BW': return 'Bodyweight';
    case '5kg': return '5 kg';
    case '2x5kg': return '2×5 kg';
    case '10kg': return '10 kg';
    case '10+5kg': return '10 + 5 kg';
  }
}

export function repsLabel(b: Pick<WorkoutBlock, 'sets' | 'repMin' | 'repMax' | 'durationSec'>): string {
  if (b.durationSec) return `${b.sets} × ${b.durationSec}s`;
  if (b.repMin && b.repMax) return `${b.sets} × ${b.repMin}–${b.repMax}`;
  return `${b.sets} sets`;
}

export interface Described {
  title: string;
  sub: string;
  est: string;
  kind: 'workout' | 'run' | 'rest';
  hard: boolean;
}

export function describeAssignment(
  a: DayAssignment,
  workouts: Map<string, Workout>,
  runA: RunAType,
): Described {
  if (a.type === 'rest') return { title: 'Rest day', sub: 'Recover and stretch', est: '', kind: 'rest', hard: false };
  if (a.type === 'run') {
    return a.slot === 'A'
      ? { title: 'Run A', sub: runA === 'intervals' ? 'Intervals' : 'Tempo', est: '35–45 min', kind: 'run', hard: runA === 'intervals' }
      : { title: 'Run B', sub: 'Long or easy run', est: '40–60 min', kind: 'run', hard: false };
  }
  const w = workouts.get(a.workoutId);
  if (!w) return { title: 'Workout', sub: 'Missing from library', est: '', kind: 'workout', hard: false };
  return {
    title: w.name,
    sub: w.muscles.map(cap).join(' · '),
    est: `${buildSession(w, { short: false, intensity: 'normal' }).estMin} min`,
    kind: 'workout',
    hard: w.hard,
  };
}

export function exerciseDetail(
  id: string,
  blocks: WorkoutBlock[],
  exercises: Map<string, Exercise>,
): { name: string; detail: string } {
  const ex = exercises.get(id);
  const block = blocks.find((b) => b.exerciseIds.includes(id));
  const parts: string[] = [];
  if (block) parts.push(repsLabel(block));
  if (ex) parts.push(loadLabel(ex.load));
  return { name: ex?.name ?? id, detail: parts.join(' · ') };
}

export function sameAssignment(a: DayAssignment, b: DayAssignment): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'workout' && b.type === 'workout') return a.workoutId === b.workoutId;
  if (a.type === 'run' && b.type === 'run') return a.slot === b.slot;
  return true;
}
