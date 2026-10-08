import type {
  CheckStatus, DayAssignment, DayPrefs, DayStatus, PlanDay, PlanOverride, RunLog, Session, Workout,
} from '../data/types';
import { resolveAssignment } from './schedule';
import { buildSession } from './session';

export interface DayData {
  week: PlanDay[];
  overrides: Map<string, PlanOverride>;
  workouts: Map<string, Workout>;
  prefs: Map<string, DayPrefs>;
  /** date -> exerciseId -> status */
  checks: Map<string, Map<string, CheckStatus>>;
  sessions: Session[];
  runs: RunLog[];
}

export interface DayPlan {
  assignment: DayAssignment;
  workout?: Workout;
  itemIds: string[];
}

export function dayPlan(date: string, data: DayData): DayPlan {
  const assignment = resolveAssignment(date, data.week, data.overrides);
  if (assignment.type === 'rest') return { assignment, itemIds: [] };
  if (assignment.type === 'run') return { assignment, itemIds: ['run'] };
  const workout = data.workouts.get(assignment.workoutId);
  if (!workout) return { assignment, itemIds: [] };
  const prefs = data.prefs.get(date);
  const built = buildSession(workout, {
    short: prefs?.short ?? false,
    intensity: prefs?.intensity ?? 'normal',
  });
  return { assignment, workout, itemIds: built.itemIds };
}

/**
 * Day status is derived, never stored:
 *  - rest day            -> rest
 *  - everything done     -> completed (a finished guided session or logged run also counts)
 *  - something done      -> partial
 *  - all skipped, or past with nothing done -> missed
 *  - otherwise           -> pending
 */
export function statusForDate(date: string, today: string, data: DayData): DayStatus {
  const plan = dayPlan(date, data);
  if (plan.assignment.type === 'rest') return 'rest';

  const sessions = data.sessions.filter((s) => s.date === date);
  if (sessions.some((s) => s.status === 'done')) return 'completed';
  if (plan.assignment.type === 'run' && data.runs.some((r) => r.date === date)) return 'completed';

  const marks = data.checks.get(date);
  let done = 0;
  let skipped = 0;
  for (const id of plan.itemIds) {
    const s = marks?.get(id);
    if (s === 'done') done++;
    else if (s === 'skipped') skipped++;
  }
  const n = plan.itemIds.length;
  if (n > 0 && done === n) return 'completed';
  if (done > 0 || sessions.some((s) => s.status === 'partial')) return 'partial';
  if (n > 0 && skipped === n) return 'missed';
  return date < today ? 'missed' : 'pending';
}
