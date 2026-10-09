'use client';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getRepos } from '@/data';
import type { RunLog, ActiveSession, BodyweightEntry, Exercise, PlanDay, RunProgram, Session, Settings, Workout, CheckStatus } from '@/data/types';
import type { Units } from '@/engine/units';
import type { DayData } from '@/engine/dayStatus';
import { addDays, toDateStr } from '@/lib/dates';

/** Today's local date. null until mounted so server-rendered markup never disagrees with the client. */
export function useToday(): string | null {
  const [d, setD] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setD(toDateStr());
    update();
    document.addEventListener('visibilitychange', update);
    const t = setInterval(update, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', update);
      clearInterval(t);
    };
  }, []);
  return d;
}

/** undefined while loading; { value: undefined } when no settings exist yet. */
export function useSettings(): { value: Settings | undefined } | undefined {
  return useLiveQuery(async () => ({ value: await getRepos().settings.get() }), []);
}

export function useRunProgram(): { value: RunProgram | undefined } | undefined {
  return useLiveQuery(async () => ({ value: await getRepos().runs.program() }), []);
}

export function useExerciseMap(): Map<string, Exercise> | undefined {
  return useLiveQuery(async () => new Map((await getRepos().exercises.all()).map((e) => [e.id, e])), []);
}

export function useWorkoutMap(): Map<string, Workout> | undefined {
  return useLiveQuery(async () => new Map((await getRepos().workouts.all()).map((w) => [w.id, w])), []);
}

export function usePlanWeek(): PlanDay[] | undefined {
  return useLiveQuery(() => getRepos().plan.week(), []);
}

/** Everything the pure engines need for a window of days around today. */
export function useDayData(today: string | null): DayData | undefined {
  return useLiveQuery(
    async () => {
      if (!today) return undefined;
      const r = getRepos();
      const from = addDays(today, -120);
      const to = addDays(today, 14);
      const [week, overrides, workouts, prefs, checks, sessions, runs] = await Promise.all([
        r.plan.week(), r.plan.overrides(from, to), r.workouts.all(), r.prefs.between(from, to),
        r.checks.between(from, to), r.sessions.between(from, to), r.runs.all(),
      ]);
      const checkMap = new Map<string, Map<string, CheckStatus>>();
      for (const c of checks) {
        const m = checkMap.get(c.date) ?? new Map<string, CheckStatus>();
        m.set(c.exerciseId, c.status);
        checkMap.set(c.date, m);
      }
      const data: DayData = {
        week,
        overrides: new Map(overrides.map((o) => [o.date, o])),
        workouts: new Map(workouts.map((w) => [w.id, w])),
        prefs: new Map(prefs.map((p) => [p.date, p])),
        checks: checkMap,
        sessions,
        runs,
      };
      return data;
    },
    [today],
  );
}

export function useRuns(): RunLog[] | undefined {
  return useLiveQuery(async () => (await getRepos().runs.all()).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), []);
}

/** The interrupted workout, if any. undefined while loading; { value: undefined } when there is none. */
export function useActiveSession(): { value: ActiveSession | undefined } | undefined {
  return useLiveQuery(async () => ({ value: await getRepos().active.get() }), []);
}

export function useAllSessions(): Session[] | undefined {
  return useLiveQuery(() => getRepos().sessions.all(), []);
}

export function useBodyweight(): BodyweightEntry[] | undefined {
  return useLiveQuery(() => getRepos().bodyweight.all(), []);
}

export function useAllExercises(): Exercise[] | undefined {
  return useLiveQuery(() => getRepos().exercises.all(), []);
}

/** Display units; stored data is always kg and metres. */
export function useUnits(): Units {
  const s = useSettings();
  return s?.value?.units ?? 'metric';
}
