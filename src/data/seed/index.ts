import type { Repos } from '../repos/interfaces';
import { SEED_EXERCISES } from './exercises';
import { SEED_WORKOUTS, SEED_PLAN } from './workouts';

/** Idempotent: only inserts what is missing, never overwrites user edits or custom items. */
export async function seedIfNeeded(repos: Repos, today: string): Promise<void> {
  const [exs, wks, week, program] = await Promise.all([
    repos.exercises.all(), repos.workouts.all(), repos.plan.week(), repos.runs.program(),
  ]);
  const haveEx = new Set(exs.map((e) => e.id));
  for (const e of SEED_EXERCISES) if (!haveEx.has(e.id)) await repos.exercises.put(e);
  const haveW = new Set(wks.map((w) => w.id));
  for (const w of SEED_WORKOUTS) if (!haveW.has(w.id)) await repos.workouts.put(w);
  if (week.length === 0) for (const d of SEED_PLAN) await repos.plan.setDay(d);
  if (!program) await repos.runs.setProgram({ id: 'program', startDate: today, goal: 'none' });
}
export { SEED_EXERCISES, SEED_WORKOUTS, SEED_PLAN };
