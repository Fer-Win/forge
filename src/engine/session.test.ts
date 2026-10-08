import { describe, it, expect } from 'vitest';
import { SEED_WORKOUTS } from '../data/seed';
import { buildSession, lighterSuggestion, FINISHER_ID } from './session';

const byId = (id: string) => SEED_WORKOUTS.find((w) => w.id === id)!;
const normal = { short: false, intensity: 'normal' as const };

describe('buildSession', () => {
  it('normal sessions land near 40-50 minutes for strength days', () => {
    for (const id of ['w-push', 'w-pull', 'w-legs', 'w-upper']) {
      const s = buildSession(byId(id), normal);
      expect(s.estMin, id).toBeGreaterThanOrEqual(38);
      expect(s.estMin, id).toBeLessThanOrEqual(52);
    }
  });

  it('short mode fits roughly 20 minutes and keeps at least one block', () => {
    for (const w of SEED_WORKOUTS.filter((x) => x.kind !== 'mobility')) {
      const s = buildSession(w, { short: true, intensity: 'normal' });
      expect(s.blocks.length, w.id).toBeGreaterThanOrEqual(1);
      expect(s.estMin, w.id).toBeGreaterThanOrEqual(12);
      expect(s.estMin, w.id).toBeLessThanOrEqual(22);
      for (const b of s.blocks) expect(b.sets).toBeLessThanOrEqual(2);
    }
  });

  it('short mode is deterministic and keeps blocks in their original order', () => {
    const a = buildSession(byId('w-push'), { short: true, intensity: 'normal' });
    const b = buildSession(byId('w-push'), { short: true, intensity: 'normal' });
    expect(a).toEqual(b);
    expect(a.blocks.map((x) => x.exerciseIds[0])).toEqual(
      byId('w-push').blocks.slice(0, a.blocks.length).map((x) => x.exerciseIds[0]),
    );
  });

  it('easy drops a set and lengthens rests; hard shortens rests', () => {
    const base = byId('w-legs').blocks[0]!;
    const easy = buildSession(byId('w-legs'), { short: false, intensity: 'easy' }).blocks[0]!;
    const hard = buildSession(byId('w-legs'), { short: false, intensity: 'hard' }).blocks[0]!;
    expect(easy.sets).toBe(base.sets - 1);
    expect(easy.restSec).toBe(base.restSec + 15);
    expect(hard.restSec).toBeLessThan(base.restSec);
    expect(hard.restSec).toBeGreaterThanOrEqual(30);
    const est = (i: 'easy' | 'normal' | 'hard') => buildSession(byId('w-legs'), { short: false, intensity: i }).estMin;
    expect(est('easy')).toBeLessThan(est('normal'));
    expect(est('hard')).toBeLessThan(est('normal'));
  });

  it('checklist ids are unique, ordered, and end with the finisher when present', () => {
    const s = buildSession(byId('w-push'), normal);
    expect(new Set(s.itemIds).size).toBe(s.itemIds.length);
    expect(s.itemIds[0]).toBe('db-floor-press');
    expect(s.itemIds.at(-1)).toBe(FINISHER_ID);
  });

  it('mobility has no warm-up/cool-down padding', () => {
    expect(buildSession(byId('w-mobility'), normal).estMin).toBeLessThanOrEqual(10);
  });
});

describe('lighterSuggestion', () => {
  it('suggests a lighter day only for low energy', () => {
    expect(lighterSuggestion(undefined)).toBeNull();
    expect(lighterSuggestion(3)).toBeNull();
    expect(lighterSuggestion(5)).toBeNull();
    expect(lighterSuggestion(2)?.apply).toEqual({ intensity: 'easy', short: true });
    expect(lighterSuggestion(1)).not.toBeNull();
  });
});
