import type {
  Exercise, Workout, PlanDay, PlanOverride, ExerciseCheck, Session, RunLog, RunProgram,
  BodyweightEntry, Settings, CheckStatus,
} from '../types';

/** UI and hooks depend only on these interfaces so a Firebase impl can replace Dexie later. */
export interface ExerciseRepo {
  all(): Promise<Exercise[]>;
  get(id: string): Promise<Exercise | undefined>;
  put(e: Exercise): Promise<void>;
  remove(id: string): Promise<void>;
}
export interface WorkoutRepo {
  all(): Promise<Workout[]>;
  get(id: string): Promise<Workout | undefined>;
  put(w: Workout): Promise<void>;
  remove(id: string): Promise<void>;
}
export interface PlanRepo {
  week(): Promise<PlanDay[]>;
  setDay(d: PlanDay): Promise<void>;
  overrides(fromDate: string, toDate: string): Promise<PlanOverride[]>;
  setOverride(o: PlanOverride): Promise<void>;
  clearOverride(date: string): Promise<void>;
}
export interface CheckRepo {
  forDate(date: string): Promise<ExerciseCheck[]>;
  set(date: string, exerciseId: string, status: CheckStatus): Promise<void>;
}
export interface SessionRepo {
  add(s: Session): Promise<void>;
  between(fromDate: string, toDate: string): Promise<Session[]>;
  forExercise(exerciseId: string): Promise<Session[]>;
  all(): Promise<Session[]>;
  remove(id: string): Promise<void>;
}
export interface RunRepo {
  add(r: RunLog): Promise<void>;
  all(): Promise<RunLog[]>;
  remove(id: string): Promise<void>;
  program(): Promise<RunProgram | undefined>;
  setProgram(p: RunProgram): Promise<void>;
}
export interface BodyweightRepo {
  all(): Promise<BodyweightEntry[]>;
  put(e: BodyweightEntry): Promise<void>;
  remove(date: string): Promise<void>;
}
export interface SettingsRepo {
  get(): Promise<Settings | undefined>;
  put(s: Settings): Promise<void>;
}

export interface Repos {
  exercises: ExerciseRepo;
  workouts: WorkoutRepo;
  plan: PlanRepo;
  checks: CheckRepo;
  sessions: SessionRepo;
  runs: RunRepo;
  bodyweight: BodyweightRepo;
  settings: SettingsRepo;
  /** Full export / import for backup (SPEC: JSON export/import). */
  exportAll(): Promise<Record<string, unknown[]>>;
  importAll(data: Record<string, unknown[]>): Promise<void>;
}
