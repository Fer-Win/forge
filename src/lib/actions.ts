import { getRepos } from '@/data';
import type { CheckStatus, DayAssignment, DayPrefs, Settings } from '@/data/types';

/**
 * Tapping the status that is already set clears it, which is the undo for every check-off.
 * The current value is read from the database (not from what was last rendered) so fast taps never act on stale state.
 */
export async function toggleCheck(date: string, id: string, target: Exclude<CheckStatus, 'none'>) {
  const repos = getRepos();
  const current = (await repos.checks.forDate(date)).find((c) => c.exerciseId === id)?.status;
  await repos.checks.set(date, id, current === target ? 'none' : target);
}

export async function patchPrefs(date: string, patch: Partial<Omit<DayPrefs, 'date'>>) {
  const repos = getRepos();
  const cur: DayPrefs = (await repos.prefs.get(date)) ?? { date, intensity: 'normal', short: false };
  await repos.prefs.put({ ...cur, ...patch });
}

export async function patchSettings(patch: Partial<Omit<Settings, 'id'>>) {
  const repos = getRepos();
  const cur = await repos.settings.get();
  if (cur) await repos.settings.put({ ...cur, ...patch });
}

export async function setDayOverride(date: string, assignment: DayAssignment | null) {
  const repos = getRepos();
  if (assignment === null) await repos.plan.clearOverride(date);
  else await repos.plan.setOverride({ date, assignment });
}
