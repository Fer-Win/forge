import Dexie, { type EntityTable } from 'dexie';
import type {
  Exercise, Workout, PlanDay, PlanOverride, ExerciseCheck, Session, RunLog, RunProgram, BodyweightEntry, Settings, DayPrefs, ActiveSession,
} from './types';

export class ForgeDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  planDays!: EntityTable<PlanDay, 'weekday'>;
  planOverrides!: EntityTable<PlanOverride, 'date'>;
  exerciseChecks!: EntityTable<ExerciseCheck, 'key'>;
  sessions!: EntityTable<Session, 'id'>;
  runs!: EntityTable<RunLog, 'id'>;
  runProgram!: EntityTable<RunProgram, 'id'>;
  bodyweight!: EntityTable<BodyweightEntry, 'date'>;
  settings!: EntityTable<Settings, 'id'>;
  dayPrefs!: EntityTable<DayPrefs, 'date'>;
  activeSession!: EntityTable<ActiveSession, 'id'>;

  constructor(name = 'forge') {
    super(name);
    this.version(1).stores({
      exercises: 'id, category, isCustom',
      workouts: 'id, kind, isCustom',
      planDays: 'weekday',
      planOverrides: 'date',
      exerciseChecks: 'key, date, exerciseId',
      sessions: 'id, date, workoutId',
      runs: 'id, date, type',
      runProgram: 'id',
      bodyweight: 'date',
      settings: 'id',
    });
    this.version(2).stores({ dayPrefs: 'date' });
    this.version(3).stores({ activeSession: 'id' });
  }
}

let instance: ForgeDB | null = null;
export function getDB(): ForgeDB {
  if (!instance) instance = new ForgeDB();
  return instance;
}
/** Test helper: use a fresh, uniquely named database. */
export function createTestDB(): ForgeDB {
  return new ForgeDB(`forge-test-${Math.random().toString(36).slice(2)}`);
}
