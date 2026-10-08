export type Category =
  | 'Push' | 'Pull' | 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Glutes'
  | 'Abs/Core' | 'Mobility' | 'Warm-up' | 'Cooldown' | 'Finishers';

export type ExerciseMode = 'reps' | 'timed' | 'interval';
export type Load = 'BW' | '5kg' | '2x5kg' | '10kg' | '10+5kg';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  muscles: string[];
  equipment: string;
  mode: ExerciseMode;
  sets: number;
  repMin?: number;
  repMax?: number;
  durationSec?: number; // timed holds / interval work
  restSec: number;
  load: Load;
  cues: string[];
  easier: string;
  harder: string;
  isCustom?: boolean;
}

export interface WorkoutBlock {
  exerciseIds: string[]; // length > 1 = superset (shared rest)
  sets: number;
  repMin?: number;
  repMax?: number;
  durationSec?: number;
  restSec: number;
  tempo?: string; // e.g. "3-1-1"
}

export interface Workout {
  id: string;
  name: string;
  kind: 'strength' | 'circuit' | 'run' | 'mobility';
  muscles: string[];
  blocks: WorkoutBlock[];
  finisher?: { type: 'amrap' | 'interval'; minutes: number; exerciseIds: string[]; workSec?: number; restSec?: number };
  estMin: number;
  hard: boolean;
  isCustom?: boolean;
}

export type DayAssignment =
  | { type: 'workout'; workoutId: string }
  | { type: 'run'; slot: 'A' | 'B' }
  | { type: 'rest' };

export interface PlanDay {
  weekday: number; // 0 = Monday ... 6 = Sunday
  assignment: DayAssignment;
}

export interface PlanOverride {
  date: string; // YYYY-MM-DD
  assignment: DayAssignment;
}

export type CheckStatus = 'done' | 'skipped' | 'none';
export type DayStatus = 'completed' | 'partial' | 'missed' | 'rest' | 'pending';

export interface ExerciseCheck {
  key: string; // `${date}|${exerciseId}`
  date: string;
  exerciseId: string;
  status: CheckStatus;
}

export interface LoggedSet {
  exerciseId: string;
  setNo: number;
  reps: number;
  weightKg: number;
  loadLabel?: string;
  tempo?: string;
  doneAt: number;
}

export interface Session {
  id: string;
  date: string;
  workoutId: string;
  status: 'done' | 'partial';
  startedAt: number;
  endedAt: number;
  intensity: 'easy' | 'normal' | 'hard';
  energy?: 1 | 2 | 3 | 4 | 5;
  sets: LoggedSet[];
  totalVolume: number;
}

export type RunType = 'easy' | 'tempo' | 'intervals' | 'long';

export interface RunSegment {
  label: string;
  kind: 'warmup' | 'work' | 'recovery' | 'steady' | 'cooldown';
  durSec: number;
}

export interface RunLog {
  id: string;
  date: string;
  type: RunType;
  durationSec: number;
  distanceM: number;
  avgPaceSecPerKm: number;
  effort: number; // 1-10
  notes?: string;
  route?: { lat: number; lng: number; t: number }[];
  source: 'gps' | 'manual';
}

export interface RunProgram {
  id: 'program';
  startDate: string;
  goal: 'none' | '5k' | '10k';
}

export interface BodyweightEntry { date: string; kg: number }

export interface Settings {
  id: 'settings';
  units: 'metric' | 'imperial';
  sound: boolean;
  haptics: boolean;
  speech: boolean;
  accent: string;
  reminderTime: string; // HH:mm
  trainingDays: number[]; // 0 = Monday
  runningLevelMin: number;
  equipment: Load[];
  onboarded: boolean;
  startDate: string;
}

export interface DayPrefs {
  date: string;
  intensity: 'easy' | 'normal' | 'hard';
  short: boolean;
  energy?: 1 | 2 | 3 | 4 | 5;
}
