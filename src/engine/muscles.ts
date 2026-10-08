import type { Workout } from '../data/types';

export type MuscleGroup = 'push' | 'pull' | 'legs' | 'core';

const MAP: Record<string, MuscleGroup> = {
  chest: 'push', shoulders: 'push', triceps: 'push', 'side delts': 'push', 'front delts': 'push', 'upper chest': 'push',
  back: 'pull', biceps: 'pull', 'rear delts': 'pull', lats: 'pull', rhomboids: 'pull', 'mid back': 'pull', 'lower traps': 'pull',
  quads: 'legs', glutes: 'legs', hamstrings: 'legs', calves: 'legs', legs: 'legs',
  core: 'core', abs: 'core', obliques: 'core', 'lower abs': 'core',
};

export function groupsOf(muscles: string[]): Set<MuscleGroup> {
  const out = new Set<MuscleGroup>();
  for (const m of muscles) {
    const g = MAP[m.toLowerCase()];
    if (g) out.add(g);
  }
  return out;
}

/** Core recovers quickly, so it is not used for "same muscle on consecutive days" checks. */
export const CONFLICT_GROUPS: MuscleGroup[] = ['push', 'pull', 'legs'];

export function isLegs(w: Workout): boolean {
  return groupsOf(w.muscles).has('legs');
}
