import type { ForgeDB } from '../db';
import type { Repos } from './interfaces';

const TABLES = [
  'exercises', 'workouts', 'planDays', 'planOverrides', 'exerciseChecks',
  'sessions', 'runs', 'runProgram', 'bodyweight', 'settings', 'dayPrefs',
] as const;

export function createDexieRepos(db: ForgeDB): Repos {
  return {
    exercises: {
      all: () => db.exercises.toArray(),
      get: (id) => db.exercises.get(id),
      put: async (e) => { await db.exercises.put(e); },
      remove: (id) => db.exercises.delete(id),
    },
    workouts: {
      all: () => db.workouts.toArray(),
      get: (id) => db.workouts.get(id),
      put: async (w) => { await db.workouts.put(w); },
      remove: (id) => db.workouts.delete(id),
    },
    plan: {
      week: () => db.planDays.orderBy('weekday').toArray(),
      setDay: async (d) => { await db.planDays.put(d); },
      setWeek: async (days) => { await db.planDays.bulkPut(days); },
      overrides: (from, to) => db.planOverrides.where('date').between(from, to, true, true).toArray(),
      setOverride: async (o) => { await db.planOverrides.put(o); },
      clearOverride: (date) => db.planOverrides.delete(date),
    },
    checks: {
      forDate: (date) => db.exerciseChecks.where('date').equals(date).toArray(),
      between: (from, to) => db.exerciseChecks.where('date').between(from, to, true, true).toArray(),
      set: async (date, exerciseId, status) => {
        const key = `${date}|${exerciseId}`;
        if (status === 'none') await db.exerciseChecks.delete(key); // undo = remove the check
        else await db.exerciseChecks.put({ key, date, exerciseId, status });
      },
    },
    sessions: {
      add: async (s) => { await db.sessions.put(s); },
      between: (from, to) => db.sessions.where('date').between(from, to, true, true).toArray(),
      forExercise: async (exerciseId) =>
        (await db.sessions.toArray()).filter((s) => s.sets.some((x) => x.exerciseId === exerciseId)),
      all: () => db.sessions.orderBy('date').toArray(),
      remove: (id) => db.sessions.delete(id),
    },
    runs: {
      add: async (r) => { await db.runs.put(r); },
      all: () => db.runs.orderBy('date').toArray(),
      remove: (id) => db.runs.delete(id),
      program: () => db.runProgram.get('program'),
      setProgram: async (p) => { await db.runProgram.put(p); },
    },
    bodyweight: {
      all: () => db.bodyweight.orderBy('date').toArray(),
      put: async (e) => { await db.bodyweight.put(e); },
      remove: (date) => db.bodyweight.delete(date),
    },
    settings: {
      get: () => db.settings.get('settings'),
      put: async (s) => { await db.settings.put(s); },
    },
    prefs: {
      get: (date) => db.dayPrefs.get(date),
      put: async (p) => { await db.dayPrefs.put(p); },
      between: (from, to) => db.dayPrefs.where('date').between(from, to, true, true).toArray(),
    },
    active: {
      get: () => db.activeSession.get('active'),
      put: async (a) => { await db.activeSession.put(a); },
      clear: () => db.activeSession.clear(),
    },
    exportAll: async () => {
      const out: Record<string, unknown[]> = {};
      for (const t of TABLES) out[t] = await db.table(t).toArray();
      return out;
    },
    importAll: async (data) => {
      await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
        for (const t of TABLES) {
          await db.table(t).clear();
          const rows = data[t];
          if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows);
        }
      });
    },
  };
}
