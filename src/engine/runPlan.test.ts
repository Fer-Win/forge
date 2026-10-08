import { describe, expect, it } from 'vitest';
import { buildRun, isLightWeek, programWeek, RUN_TYPES, typeForSlot } from './runPlan';

const mins = (s: { totalSec: number }) => s.totalSec / 60;

describe('programWeek', () => {
  it('counts whole Monday-start weeks from the programme start', () => {
    expect(programWeek('2026-10-05', '2026-10-05')).toBe(0);
    expect(programWeek('2026-10-07', '2026-10-11')).toBe(0); // same week, Wed start
    expect(programWeek('2026-10-07', '2026-10-12')).toBe(1);
    expect(programWeek('2026-10-05', '2026-11-02')).toBe(4);
    expect(programWeek('2026-10-05', '2026-09-01')).toBe(0);
  });
});

describe('lighter weeks', () => {
  it('every 4th week of the 8-week cycle, repeating', () => {
    const light = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11].map(isLightWeek);
    expect(light).toEqual([false, false, false, true, false, false, false, true, false, true]);
  });
});

describe('buildRun', () => {
  it('every run has segments that add up to its total', () => {
    for (const type of RUN_TYPES) {
      for (let w = 0; w < 16; w++) {
        const r = buildRun(type, w);
        expect(r.segments.length > 0).toBe(true);
        expect(r.segments.reduce((t, s) => t + s.durSec, 0)).toBe(r.totalSec);
        expect(r.segments.every((s) => s.durSec > 0)).toBe(true);
        expect(r.light).toBe(isLightWeek(w));
      }
    }
  });

  it('easy runs are 30-45 min', () => {
    for (let w = 0; w < 8; w++) {
      const m = mins(buildRun('easy', w));
      expect(m >= 30 && m <= 45).toBe(true);
    }
  });

  it('tempo: 10 min warm-up, 15-20 min tempo, 5-10 min cooldown (shorter tempo in a light week)', () => {
    for (const w of [0, 1, 2, 4, 5, 6]) {
      const [wu, t, cd] = buildRun('tempo', w).segments;
      expect(wu).toMatchObject({ kind: 'warmup', durSec: 600 });
      expect(t!.kind).toBe('work');
      expect(t!.durSec >= 900 && t!.durSec <= 1200).toBe(true);
      expect(cd!.kind).toBe('cooldown');
      expect(cd!.durSec >= 300 && cd!.durSec <= 600).toBe(true);
    }
    expect(buildRun('tempo', 3).segments[1]!.durSec).toBeLessThan(900);
  });

  it('intervals: warm-up, 6-8 hard/easy pairs, cooldown, no easy block after the last hard one', () => {
    const r = buildRun('intervals', 0);
    expect(r.segments[0]).toMatchObject({ kind: 'warmup', durSec: 600 });
    expect(r.segments[r.segments.length - 1]).toMatchObject({ kind: 'cooldown' });
    const hard = r.segments.filter((s) => s.kind === 'work');
    expect(hard).toHaveLength(6);
    expect(hard[0]).toMatchObject({ label: 'Hard 1 of 6', durSec: 120 });
    expect(r.segments[r.segments.length - 2]!.kind).toBe('work');
    expect(r.summary).toContain('6 × (2 min hard / 2 min easy)');
    for (let w = 0; w < 16; w++) {
      const n = buildRun('intervals', w).segments.filter((s) => s.kind === 'work').length;
      expect(n >= 5 && n <= 8).toBe(true);
    }
    expect(buildRun('intervals', 3).segments.filter((s) => s.kind === 'work')).toHaveLength(5);
  });

  it('long run starts at 45 min, grows about 5 min a week to 75, and eases off in light weeks', () => {
    expect(mins(buildRun('long', 0))).toBe(45);
    expect(mins(buildRun('long', 1))).toBe(50);
    expect(mins(buildRun('long', 2))).toBe(55);
    expect(mins(buildRun('long', 3))).toBe(45); // lighter week: 15 min off the usual 60
    expect(mins(buildRun('long', 4))).toBe(60);
    for (let w = 0; w < 24; w++) expect(mins(buildRun('long', w)) <= 75).toBe(true);
  });

  it('a 5K goal caps the long run at 60 min', () => {
    for (let w = 0; w < 24; w++) expect(mins(buildRun('long', w, '5k')) <= 60).toBe(true);
  });
});

describe('typeForSlot', () => {
  it('Run A follows the alternation; Run B is long, or easy in a light week', () => {
    expect(typeForSlot('A', 'intervals', 0)).toBe('intervals');
    expect(typeForSlot('A', 'tempo', 1)).toBe('tempo');
    expect(typeForSlot('B', 'tempo', 1)).toBe('long');
    expect(typeForSlot('B', 'intervals', 3)).toBe('easy');
  });
});
