import type { PlanDay, Workout } from '../types';

export const SEED_WORKOUTS: Workout[] = [
  {
    id: 'w-push', name: 'Push', kind: 'strength', muscles: ['chest', 'shoulders', 'triceps'], estMin: 45, hard: true,
    blocks: [
      { exerciseIds: ['db-floor-press', 'pushup'], sets: 3, repMin: 8, repMax: 14, restSec: 60, tempo: '3-1-1' },
      { exerciseIds: ['db-ohp', 'lateral-raise'], sets: 3, repMin: 10, repMax: 16, restSec: 60 },
      { exerciseIds: ['decline-pushup'], sets: 3, repMin: 6, repMax: 12, restSec: 75 },
      { exerciseIds: ['tricep-ext', 'bench-dip'], sets: 3, repMin: 10, repMax: 16, restSec: 45 },
    ],
    finisher: { type: 'interval', minutes: 5, exerciseIds: ['pushup', 'mountain-climber'], workSec: 40, restSec: 20 },
  },
  {
    id: 'w-pull', name: 'Pull', kind: 'strength', muscles: ['back', 'biceps', 'rear delts'], estMin: 45, hard: true,
    blocks: [
      { exerciseIds: ['db-row'], sets: 4, repMin: 8, repMax: 12, restSec: 75, tempo: '2-1-3' },
      { exerciseIds: ['bent-row', 'rev-fly'], sets: 3, repMin: 12, repMax: 18, restSec: 60 },
      { exerciseIds: ['db-pullover'], sets: 3, repMin: 10, repMax: 15, restSec: 60 },
      { exerciseIds: ['db-curl', 'hammer-curl'], sets: 3, repMin: 10, repMax: 16, restSec: 45 },
      { exerciseIds: ['superman'], sets: 2, durationSec: 30, restSec: 30 },
    ],
    finisher: { type: 'amrap', minutes: 5, exerciseIds: ['db-swing', 'burpee'] },
  },
  {
    id: 'w-legs', name: 'Legs + Core', kind: 'strength', muscles: ['quads', 'glutes', 'hamstrings', 'core'], estMin: 45, hard: true,
    blocks: [
      { exerciseIds: ['goblet-squat'], sets: 4, repMin: 10, repMax: 16, restSec: 75, tempo: '3-1-1' },
      { exerciseIds: ['split-squat'], sets: 3, repMin: 8, repMax: 12, restSec: 75 },
      { exerciseIds: ['rdl', 'calf-raise'], sets: 3, repMin: 10, repMax: 16, restSec: 60 },
      { exerciseIds: ['glute-bridge'], sets: 3, repMin: 12, repMax: 20, restSec: 45 },
      { exerciseIds: ['plank', 'dead-bug'], sets: 3, durationSec: 40, restSec: 30 },
    ],
    finisher: { type: 'interval', minutes: 5, exerciseIds: ['jump-squat', 'high-knees'], workSec: 40, restSec: 20 },
  },
  {
    id: 'w-upper', name: 'Upper mix', kind: 'strength', muscles: ['chest', 'back', 'abs'], estMin: 45, hard: true,
    blocks: [
      { exerciseIds: ['pushup', 'bent-row'], sets: 4, repMin: 10, repMax: 16, restSec: 60 },
      { exerciseIds: ['db-ohp', 'rev-fly'], sets: 3, repMin: 10, repMax: 16, restSec: 60 },
      { exerciseIds: ['db-floor-press', 'db-row'], sets: 3, repMin: 8, repMax: 12, restSec: 60 },
      { exerciseIds: ['bicycle', 'leg-raise'], sets: 3, repMin: 12, repMax: 20, restSec: 30 },
    ],
    finisher: { type: 'amrap', minutes: 5, exerciseIds: ['db-thruster', 'pushup'] },
  },
  {
    id: 'w-circuit', name: 'Full-body circuit', kind: 'circuit', muscles: ['full body'], estMin: 35, hard: false,
    blocks: [
      { exerciseIds: ['goblet-squat', 'pushup', 'bent-row', 'reverse-lunge', 'plank'], sets: 3, durationSec: 40, restSec: 20 },
    ],
    finisher: { type: 'interval', minutes: 5, exerciseIds: ['burpee', 'mountain-climber'], workSec: 40, restSec: 20 },
  },
  {
    id: 'w-mobility', name: 'Mobility flow', kind: 'mobility', muscles: ['full body'], estMin: 15, hard: false,
    blocks: [
      { exerciseIds: ['mob-cat-cow'], sets: 2, repMin: 8, repMax: 12, restSec: 0 },
      { exerciseIds: ['mob-worlds-greatest'], sets: 2, repMin: 4, repMax: 6, restSec: 0 },
      { exerciseIds: ['mob-hip-90'], sets: 2, repMin: 6, repMax: 10, restSec: 0 },
      { exerciseIds: ['cd-child'], sets: 1, durationSec: 45, restSec: 0 },
    ],
  },
];

/** Monday = 0 ... Sunday = 6 */
export const SEED_PLAN: PlanDay[] = [
  { weekday: 0, assignment: { type: 'workout', workoutId: 'w-push' } },
  { weekday: 1, assignment: { type: 'workout', workoutId: 'w-pull' } },
  { weekday: 2, assignment: { type: 'run', slot: 'A' } },
  { weekday: 3, assignment: { type: 'workout', workoutId: 'w-legs' } },
  { weekday: 4, assignment: { type: 'workout', workoutId: 'w-upper' } },
  { weekday: 5, assignment: { type: 'run', slot: 'B' } },
  { weekday: 6, assignment: { type: 'rest' } },
];
