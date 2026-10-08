import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { createTestDB } from '../db';
import { createDexieRepos } from '../repos/dexieRepos';
import { seedIfNeeded, SEED_EXERCISES, SEED_WORKOUTS } from './index';

describe('seed data', () => {
  it('has 40+ exercises, each with 2-3 cues and easier/harder variations', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(40);
    for (const e of SEED_EXERCISES) {
      expect(e.cues.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.cues.length, e.id).toBeLessThanOrEqual(3);
      expect(e.easier && e.harder, e.id).toBeTruthy();
    }
    expect(new Set(SEED_EXERCISES.map((e) => e.id)).size).toBe(SEED_EXERCISES.length);
  });

  it('covers the required categories (Push/Pull are workout groupings of these)', () => {
    const cats = new Set(SEED_EXERCISES.map((e) => e.category));
    for (const c of ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Abs/Core', 'Mobility', 'Warm-up', 'Cooldown', 'Finishers']) {
      expect(cats.has(c as never), c).toBe(true);
    }
  });

  it('only uses equipment the user owns', () => {
    const allowed = new Set(['BW', '5kg', '2x5kg', '10kg', '10+5kg']);
    for (const e of SEED_EXERCISES) expect(allowed.has(e.load), e.id).toBe(true);
  });

  it('workouts only reference existing exercises', () => {
    const ids = new Set(SEED_EXERCISES.map((e) => e.id));
    for (const w of SEED_WORKOUTS) {
      for (const b of w.blocks) for (const id of b.exerciseIds) expect(ids.has(id), `${w.id}:${id}`).toBe(true);
      for (const id of w.finisher?.exerciseIds ?? []) expect(ids.has(id), `${w.id}:${id}`).toBe(true);
    }
  });

  it('seeds idempotently and keeps user edits', async () => {
    const repos = createDexieRepos(createTestDB());
    await seedIfNeeded(repos, '2026-10-08');
    const first = await repos.exercises.all();
    const pushup = first.find((e) => e.id === 'pushup')!;
    await repos.exercises.put({ ...pushup, restSec: 99 });
    await seedIfNeeded(repos, '2026-10-08');
    expect((await repos.exercises.all()).length).toBe(first.length);
    expect((await repos.exercises.get('pushup'))!.restSec).toBe(99);
    expect((await repos.plan.week()).length).toBe(7);
  });

  it('exports and imports all data', async () => {
    const a = createDexieRepos(createTestDB());
    await seedIfNeeded(a, '2026-10-08');
    const dump = await a.exportAll();
    const b = createDexieRepos(createTestDB());
    await b.importAll(dump);
    expect((await b.workouts.all()).length).toBe(SEED_WORKOUTS.length);
  });

  it('check-off undo removes the record', async () => {
    const repos = createDexieRepos(createTestDB());
    await repos.checks.set('2026-10-08', 'pushup', 'done');
    expect((await repos.checks.forDate('2026-10-08')).length).toBe(1);
    await repos.checks.set('2026-10-08', 'pushup', 'none');
    expect((await repos.checks.forDate('2026-10-08')).length).toBe(0);
  });
});
