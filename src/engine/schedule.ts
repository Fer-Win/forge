import type { DayAssignment, PlanDay, PlanOverride, Workout } from '../data/types';
import { diffDays, startOfWeek } from '../lib/dates';
import { CONFLICT_GROUPS, groupsOf, isLegs } from './muscles';

const REST: DayAssignment = { type: 'rest' };

/** The override for a date wins; otherwise the base week for that weekday (Mon = 0). */
export function resolveAssignment(
  date: string,
  week: PlanDay[],
  overrides: Map<string, PlanOverride>,
): DayAssignment {
  const o = overrides.get(date);
  if (o) return o.assignment;
  const weekday = (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
  return week.find((d) => d.weekday === weekday)?.assignment ?? REST;
}

export type RunAType = 'intervals' | 'tempo';

/** Run A alternates intervals / tempo week by week, starting with intervals in the first week. */
export function runATypeForWeek(programStartDate: string, weekStart: string): RunAType {
  const first = startOfWeek(programStartDate);
  const weekIndex = Math.max(0, Math.round(diffDays(first, weekStart) / 7));
  return weekIndex % 2 === 0 ? 'intervals' : 'tempo';
}

export interface ScheduleWarning {
  /** Weekday index (Mon = 0) the warning should be shown on. */
  weekday: number;
  message: string;
}

export interface CheckOptions {
  /** True when this week's Run A is an interval session. */
  runAIntervals: boolean;
}

function hardWorkout(a: DayAssignment, workouts: Map<string, Workout>): Workout | undefined {
  if (a.type !== 'workout') return undefined;
  const w = workouts.get(a.workoutId);
  return w && w.hard ? w : undefined;
}

/**
 * Soft rules for a 7-day week (never blocks, only warns):
 *  1. No hard sessions hitting the same muscle group on consecutive days (Sunday wraps to Monday).
 *  2. No hard intervals the day before leg day.
 */
export function checkWeek(
  assignments: DayAssignment[],
  workouts: Map<string, Workout>,
  opts: CheckOptions,
): ScheduleWarning[] {
  const out: ScheduleWarning[] = [];
  for (let i = 0; i < 7; i++) {
    const a = assignments[i];
    const next = assignments[(i + 1) % 7];
    if (!a || !next) continue;
    const wa = hardWorkout(a, workouts);
    const wb = hardWorkout(next, workouts);
    if (wa && wb) {
      const ga = groupsOf(wa.muscles);
      const shared = CONFLICT_GROUPS.filter((g) => ga.has(g) && groupsOf(wb.muscles).has(g));
      if (shared.length) {
        out.push({
          weekday: (i + 1) % 7,
          message: `${wb.name} follows ${wa.name} and both work ${shared.join(' and ')}. Consider a rest or a different day.`,
        });
      }
    }
    if (a.type === 'run' && a.slot === 'A' && opts.runAIntervals && next.type === 'workout') {
      const w = workouts.get(next.workoutId);
      if (w && isLegs(w)) {
        out.push({
          weekday: i,
          message: 'Hard intervals the day before leg day. This week, make this run easy or swap it with another day.',
        });
      }
    }
  }
  return out;
}
