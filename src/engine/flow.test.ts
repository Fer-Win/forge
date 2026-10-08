import { describe, expect, it } from 'vitest';
import type { Exercise, Workout } from '../data/types';
import {
  activeMs, addRound, adjustRest, buildSteps, currentStep, endEarly, initFlow, intervalPhase, isComplete,
  logSet, pause, progressOf, restoreFlow, resume, skipStep, startFinisher, startHold, tick, totalVolume,
  undoLast, upNext, type FlowState,
} from './flow';
import { remainingOf } from './timer';
import { buildSession } from './session';

const T = 1_000_000;

const ex = (id: string, over: Partial<Exercise> = {}): Exercise => ({
  id, name: id, category: 'Chest', muscles: [], equipment: 'Bodyweight', mode: 'reps', sets: 3,
  repMin: 8, repMax: 12, restSec: 60, load: 'BW', cues: [], easier: '', harder: '', ...over,
});
const EXERCISES = new Map<string, Exercise>(
  [
    ex('a'), ex('b'), ex('c'),
    ex('wu-jacks', { mode: 'timed', durationSec: 30, category: 'Warm-up' }),
    ex('wu-inchworm', { repMin: 5, repMax: 8, category: 'Warm-up' }),
    ex('cd-child', { mode: 'timed', durationSec: 45, category: 'Cooldown' }),
  ].map((e) => [e.id, e]),
);

const STRENGTH: Workout = {
  id: 'w-test', name: 'Test', kind: 'strength', muscles: [], estMin: 30, hard: false,
  blocks: [
    { exerciseIds: ['a', 'b'], sets: 2, repMin: 8, repMax: 12, restSec: 60 },
    { exerciseIds: ['c'], sets: 1, durationSec: 30, restSec: 30 },
  ],
  finisher: { type: 'amrap', minutes: 1, exerciseIds: ['a', 'b'] },
};
const CIRCUIT: Workout = {
  id: 'w-circ', name: 'Circuit', kind: 'circuit', muscles: [], estMin: 10, hard: false,
  blocks: [{ exerciseIds: ['a', 'b', 'c'], sets: 1, durationSec: 40, restSec: 20 }],
};
const MOBILITY: Workout = {
  id: 'w-mob', name: 'Mob', kind: 'mobility', muscles: [], estMin: 5, hard: false,
  blocks: [{ exerciseIds: ['a'], sets: 2, repMin: 8, repMax: 12, restSec: 0 }],
};

const steps = (w: Workout, warmup = false, cooldown = false) =>
  buildSteps(buildSession(w, { short: false, intensity: 'normal' }), { kind: w.kind, warmup, cooldown, exercises: EXERCISES });

const kinds = (s: FlowState) =>
  s.steps.map((x) => (x.kind === 'work' ? `${x.exerciseId}${x.setNo}` : x.kind === 'rest' ? 'R' : 'F')).join(' ');

const E = { reps: 10, weightKg: 0 };

describe('buildSteps', () => {
  it('orders sets, shares one rest per superset round and trims the trailing rest', () => {
    expect(kinds(initFlow(steps(STRENGTH), T))).toBe('a1 b1 R a2 b2 R c1 F');
  });

  it('adds warm-up and cooldown only when asked, and never to mobility', () => {
    const on = initFlow(steps(STRENGTH, true, true), T);
    expect(kinds(on)).toBe('wu-jacks1 wu-inchworm1 a1 b1 R a2 b2 R c1 F cd-child1');
    const first = on.steps[0];
    expect(first?.kind === 'work' && first.section).toBe('warmup');
    expect(first?.kind === 'work' && first.auto).toBe(true);
    expect(kinds(initFlow(steps(MOBILITY, true, true), T))).toBe('a1 a2');
  });

  it('circuits rest after every move and auto-start timed moves', () => {
    const s = initFlow(steps(CIRCUIT), T);
    expect(kinds(s)).toBe('a1 R b1 R c1');
    expect(s.timer).not.toBeNull();
  });
});

describe('set logging and rest', () => {
  it('logs a set, moves through a superset with no rest between, then rests', () => {
    let s = initFlow(steps(STRENGTH), T);
    expect(currentStep(s)).toMatchObject({ exerciseId: 'a', setNo: 1 });
    s = logSet(s, { reps: 10, weightKg: 10, loadLabel: '2x5kg' }, T + 5_000);
    expect(currentStep(s)).toMatchObject({ exerciseId: 'b', setNo: 1 });
    expect(s.timer).toBeNull();
    s = logSet(s, E, T + 10_000);
    expect(currentStep(s)?.kind).toBe('rest');
    expect(s.logs).toHaveLength(2);
    expect(s.logs[0]).toMatchObject({ exerciseId: 'a', setNo: 1, reps: 10, weightKg: 10, doneAt: T + 5_000 });
    expect(remainingOf(s.timer!, T + 10_000)).toBe(60_000);
  });

  it('returns the same object when nothing changes and fires 3-2-1 then go', () => {
    let s = initFlow(steps(STRENGTH), T);
    s = logSet(logSet(s, E, T), E, T);
    const quiet = tick(s, T + 40_000, T + 39_000);
    expect(quiet.state).toBe(s);
    expect(quiet.events).toEqual([]);
    expect(tick(s, T + 57_500, T + 56_500).events).toEqual([{ type: 'cue', n: 3 }]);
    const end = tick(s, T + 60_100, T + 59_900);
    expect(end.events).toEqual([{ type: 'cue', n: 0 }, { type: 'step' }]);
    expect(currentStep(end.state)).toMatchObject({ exerciseId: 'a', setNo: 2 });
  });

  it('catches up after a long sleep without replaying the go beep', () => {
    let s = initFlow(steps(STRENGTH), T);
    s = logSet(logSet(s, E, T), E, T);
    const r = tick(s, T + 130_000, T + 120_000); // rest had already ended before the previous tick
    expect(r.events).toEqual([{ type: 'step' }]);
    expect(currentStep(r.state)).toMatchObject({ exerciseId: 'a', setNo: 2 });
  });

  it('adjusts the rest by 15 s each way', () => {
    let s = initFlow(steps(STRENGTH), T);
    s = logSet(logSet(s, E, T), E, T);
    s = adjustRest(s, 15);
    expect(remainingOf(s.timer!, T)).toBe(75_000);
    s = adjustRest(adjustRest(s, -15), -15);
    expect(remainingOf(s.timer!, T)).toBe(45_000);
  });

  it('skipping a rest moves on; skipping a set also drops its rest', () => {
    let s = initFlow(steps(STRENGTH), T);
    s = logSet(logSet(s, E, T), E, T);
    s = skipStep(s, T + 1_000);
    expect(currentStep(s)).toMatchObject({ exerciseId: 'a', setNo: 2 });
    s = logSet(s, E, T);
    s = skipStep(s, T); // skip b2, which drops the rest after it
    expect(currentStep(s)).toMatchObject({ exerciseId: 'c', setNo: 1 });
  });

  it('undo takes back the set just logged', () => {
    let s = initFlow(steps(STRENGTH), T);
    s = logSet(s, E, T);
    s = logSet(s, E, T);
    const undone = undoLast(s, T + 1_000);
    expect(currentStep(undone)).toMatchObject({ exerciseId: 'b', setNo: 1 });
    expect(undone.logs).toHaveLength(1);
    expect(undone.timer).toBeNull();
    const fresh = initFlow(steps(STRENGTH), T);
    expect(undoLast(fresh, T)).toBe(fresh);
  });

  it('ticking off a warm-up move logs nothing', () => {
    let s = initFlow(steps(STRENGTH, true), T);
    s = skipStep(s, T); // jacks
    expect(currentStep(s)).toMatchObject({ exerciseId: 'wu-inchworm' });
    s = logSet(s, E, T);
    expect(s.logs).toHaveLength(0);
    expect(currentStep(s)).toMatchObject({ exerciseId: 'a' });
  });
});

describe('holds and circuits', () => {
  const toC = (s: FlowState) => {
    let cur = s;
    while (currentStep(cur)?.kind === 'work' && (currentStep(cur) as { exerciseId: string }).exerciseId !== 'c') cur = skipStep(cur, T);
    return cur;
  };

  it('a manual hold counts down, logs its duration and finishes', () => {
    let s = toC(initFlow(steps(STRENGTH), T));
    expect(currentStep(s)).toMatchObject({ exerciseId: 'c', mode: 'timed', auto: false });
    expect(s.timer).toBeNull();
    s = startHold(s, T);
    expect(tick(s, T + 27_500, T + 26_500).events).toEqual([{ type: 'cue', n: 3 }]);
    const done = tick(s, T + 30_000, T + 29_900);
    expect(done.state.logs[0]).toMatchObject({ exerciseId: 'c', durationSec: 30, reps: 0, doneAt: T + 30_000 });
    expect(currentStep(done.state)?.kind).toBe('finisher');
  });

  it('a circuit that slept through several moves lands on the right one with no drift', () => {
    const s = initFlow(steps(CIRCUIT), 0);
    const r = tick(s, 130_000, 0);
    expect(currentStep(r.state)).toMatchObject({ exerciseId: 'c' });
    expect(r.state.logs.map((l) => l.exerciseId)).toEqual(['a', 'b']);
    expect(r.state.timer!.startedAt).toBe(120_000); // 40+20+40+20, exactly
    expect(r.events.filter((e) => e.type === 'cue')).toEqual([{ type: 'cue', n: 0 }]);
  });

  it('a circuit completes at the end timestamp of its last move', () => {
    const s = initFlow(steps(CIRCUIT), 0);
    const r = tick(s, 400_000, 0);
    expect(isComplete(r.state)).toBe(true);
    expect(r.state.endedAt).toBe(160_000);
    expect(r.state.logs).toHaveLength(3);
    expect(r.events).toContainEqual({ type: 'complete' });
    expect(activeMs(r.state, 999_999)).toBe(160_000);
  });
});

describe('finisher', () => {
  const toFinisher = (s: FlowState) => {
    let cur = s;
    while (currentStep(cur)?.kind !== 'finisher') cur = skipStep(cur, T);
    return cur;
  };

  it('counts AMRAP rounds and records them when time is up', () => {
    let s = toFinisher(initFlow(steps(STRENGTH), T));
    expect(s.timer).toBeNull();
    expect(addRound(s)).toBe(s); // not started yet
    s = startFinisher(s, T);
    s = addRound(addRound(addRound(s)));
    const r = tick(s, T + 61_000, T + 60_900);
    expect(isComplete(r.state)).toBe(true);
    expect(r.state.logs[r.state.logs.length - 1]).toMatchObject({ exerciseId: 'finisher', reps: 3, durationSec: 60 });
  });

  it('stopping early keeps what was done', () => {
    let s = startFinisher(toFinisher(initFlow(steps(STRENGTH), T)), T);
    s = addRound(s);
    s = skipStep(s, T + 20_000);
    expect(isComplete(s)).toBe(true);
    expect(s.logs[s.logs.length - 1]).toMatchObject({ exerciseId: 'finisher', reps: 1, durationSec: 20 });
  });

  it('works out work / rest phases for interval finishers', () => {
    expect(intervalPhase(0, 40, 20, 2)).toMatchObject({ phase: 'work', exerciseIdx: 0, phaseRemainingMs: 40_000, phaseNo: 0 });
    expect(intervalPhase(45_000, 40, 20, 2)).toMatchObject({ phase: 'rest', exerciseIdx: 0, phaseRemainingMs: 15_000, phaseNo: 1 });
    expect(intervalPhase(60_000, 40, 20, 2)).toMatchObject({ phase: 'work', exerciseIdx: 1, phaseNo: 2 });
    expect(intervalPhase(120_000, 40, 20, 2)).toMatchObject({ phase: 'work', exerciseIdx: 0, phaseNo: 4 });
  });
});

describe('pause, end early, progress, recovery', () => {
  it('pause freezes the rest timer and the clock for as long as it lasts', () => {
    let s = initFlow(steps(STRENGTH), 0);
    s = logSet(logSet(s, E, 0), E, 0); // rest 0..60 s
    s = pause(s, 10_000);
    expect(tick(s, 500_000, 400_000).state).toBe(s);
    s = resume(s, 500_000);
    expect(remainingOf(s.timer!, 500_000)).toBe(50_000);
    expect(s.pausedMs).toBe(490_000);
    expect(activeMs(s, 510_000)).toBe(20_000);
  });

  it('ignores logging while paused', () => {
    const s = pause(initFlow(steps(STRENGTH), 0), 1_000);
    expect(logSet(s, E, 2_000)).toBe(s);
  });

  it('end early stops the session, keeps the logs and excludes pauses', () => {
    let s = initFlow(steps(STRENGTH), 0);
    s = logSet(s, E, 5_000);
    s = pause(s, 10_000);
    s = endEarly(s, 50_000);
    expect(s.endedEarly).toBe(true);
    expect(isComplete(s)).toBe(true);
    expect(s.logs).toHaveLength(1);
    expect(activeMs(s, 99_999)).toBe(10_000);
  });

  it('reports progress and what is up next', () => {
    let s = initFlow(steps(STRENGTH), T);
    expect(progressOf(s)).toMatchObject({ done: 0, total: 6 });
    s = logSet(logSet(s, E, T), E, T);
    expect(progressOf(s)).toMatchObject({ done: 2, total: 6 });
    expect(progressOf(s).fraction).toBeCloseTo(2 / 6);
    expect(upNext(s)).toMatchObject({ kind: 'work', exerciseId: 'a', setNo: 2 });
  });

  it('survives a JSON round trip (crash recovery) and then behaves the same', () => {
    let s = initFlow(steps(STRENGTH), T);
    s = logSet(logSet(s, E, T), E, T);
    const back = restoreFlow(JSON.parse(JSON.stringify(s)));
    expect(back).toEqual(s);
    expect(tick(back!, T + 70_000, T + 69_000).state.idx).toBe(3);
    expect(restoreFlow(null)).toBeNull();
    expect(restoreFlow({})).toBeNull();
    expect(restoreFlow({ steps: [], idx: 0, logs: [], startedAt: 1 })).toBeNull();
  });
});

describe('totalVolume', () => {
  it('sums reps x kg and ignores holds and the finisher', () => {
    expect(
      totalVolume([
        { exerciseId: 'a', setNo: 1, reps: 10, weightKg: 10, doneAt: 1 },
        { exerciseId: 'a', setNo: 2, reps: 8, weightKg: 10, doneAt: 2 },
        { exerciseId: 'p', setNo: 1, reps: 0, weightKg: 0, durationSec: 40, doneAt: 3 },
        { exerciseId: 'finisher', setNo: 1, reps: 4, weightKg: 0, durationSec: 300, doneAt: 4 },
        { exerciseId: 'pushup', setNo: 1, reps: 15, weightKg: 0, doneAt: 5 },
      ]),
    ).toBe(180);
  });
});
