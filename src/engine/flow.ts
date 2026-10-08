import type { Exercise, LoggedSet, Workout } from '../data/types';
import { FINISHER_ID, type BuiltSession } from './session';
import {
  adjustTimer, countdownCues, elapsedOf, endTimeOf, newTimer, pauseTimer, remainingOf, resumeTimer,
  type Timer,
} from './timer';
import { COOLDOWN_IDS, DEFAULT_EXTRA_SEC, WARMUP_IDS } from './warmup';

/**
 * Pure state machine for a guided workout. No React, no DOM, no clock: every function takes `now`.
 * The whole FlowState is JSON, so it can be written to IndexedDB after each change and restored after a crash.
 */

export type Section = 'warmup' | 'main' | 'cooldown';

export interface WorkStep {
  kind: 'work';
  exerciseId: string;
  section: Section;
  blockIdx: number;
  blockExerciseIds: string[]; // length > 1 = superset
  setNo: number;
  sets: number;
  mode: 'reps' | 'timed';
  repMin?: number;
  repMax?: number;
  durationSec?: number;
  tempo?: string;
  /** Timed step starts its own countdown as soon as it begins (circuits, warm-up, cooldown). */
  auto: boolean;
}
export interface RestStep { kind: 'rest'; durationSec: number }
export interface FinisherStep {
  kind: 'finisher';
  type: 'amrap' | 'interval';
  minutes: number;
  exerciseIds: string[];
  workSec: number;
  restSec: number;
}
export type Step = WorkStep | RestStep | FinisherStep;

export interface FlowState {
  steps: Step[];
  idx: number;
  timer: Timer | null;
  logs: LoggedSet[];
  rounds: number; // finisher AMRAP rounds
  startedAt: number;
  endedAt: number | null;
  endedEarly: boolean;
  pausedAt: number | null;
  pausedMs: number;
}

export type FlowEvent = { type: 'cue'; n: number } | { type: 'step' } | { type: 'complete' };

export interface BuildStepsOptions {
  kind: Workout['kind'];
  warmup: boolean;
  cooldown: boolean;
  exercises: Map<string, Exercise>;
}

// ---------------------------------------------------------------- building

export function buildSteps(built: BuiltSession, opts: BuildStepsOptions): Step[] {
  const steps: Step[] = [];
  const mobility = opts.kind === 'mobility';
  const circuit = opts.kind === 'circuit';

  const extras = (ids: string[], section: Section) => {
    for (const id of ids) {
      const ex = opts.exercises.get(id);
      if (!ex) continue;
      const timed = ex.mode !== 'reps';
      steps.push({
        kind: 'work', exerciseId: id, section, blockIdx: -1, blockExerciseIds: [id], setNo: 1, sets: 1,
        mode: timed ? 'timed' : 'reps',
        repMin: ex.repMin, repMax: ex.repMax,
        durationSec: timed ? ex.durationSec ?? DEFAULT_EXTRA_SEC : undefined,
        auto: timed,
      });
    }
  };
  const trimRest = () => {
    if (steps[steps.length - 1]?.kind === 'rest') steps.pop();
  };

  if (opts.warmup && !mobility) extras(WARMUP_IDS, 'warmup');

  built.blocks.forEach((b, blockIdx) => {
    const timed = b.durationSec !== undefined;
    for (let s = 1; s <= b.sets; s++) {
      b.exerciseIds.forEach((id, i) => {
        steps.push({
          kind: 'work', exerciseId: id, section: 'main', blockIdx, blockExerciseIds: b.exerciseIds,
          setNo: s, sets: b.sets, mode: timed ? 'timed' : 'reps',
          repMin: b.repMin, repMax: b.repMax, durationSec: b.durationSec, tempo: b.tempo,
          auto: circuit && timed,
        });
        const last = i === b.exerciseIds.length - 1;
        // circuits rest after every move, everything else once per round (supersets share one rest)
        if ((circuit || last) && b.restSec > 0) steps.push({ kind: 'rest', durationSec: b.restSec });
      });
    }
  });
  trimRest();

  if (built.finisher) {
    const f = built.finisher;
    steps.push({
      kind: 'finisher', type: f.type, minutes: f.minutes, exerciseIds: f.exerciseIds,
      workSec: f.workSec ?? 40, restSec: f.restSec ?? 20,
    });
  }
  if (opts.cooldown && !mobility) extras(COOLDOWN_IDS, 'cooldown');
  return steps;
}

// ---------------------------------------------------------------- state

function enterStep(s: FlowState, idx: number, at: number): FlowState {
  if (idx >= s.steps.length) return { ...s, idx: s.steps.length, timer: null, endedAt: at };
  const step = s.steps[idx]!;
  let timer: Timer | null = null;
  if (step.kind === 'rest') timer = newTimer(step.durationSec * 1000, at);
  else if (step.kind === 'work' && step.mode === 'timed' && step.auto) {
    timer = newTimer((step.durationSec ?? DEFAULT_EXTRA_SEC) * 1000, at);
  }
  return { ...s, idx, timer };
}

export function initFlow(steps: Step[], now: number): FlowState {
  const base: FlowState = {
    steps, idx: 0, timer: null, logs: [], rounds: 0, startedAt: now, endedAt: null,
    endedEarly: false, pausedAt: null, pausedMs: 0,
  };
  return steps.length === 0 ? { ...base, endedAt: now } : enterStep(base, 0, now);
}

export function currentStep(s: FlowState): Step | undefined {
  return s.steps[s.idx];
}

export function isComplete(s: FlowState): boolean {
  return s.endedAt !== null;
}

export function isPaused(s: FlowState): boolean {
  return s.pausedAt !== null;
}

/** The next exercise or finisher after the current step ("Up next"). */
export function upNext(s: FlowState): WorkStep | FinisherStep | undefined {
  for (let i = s.idx + 1; i < s.steps.length; i++) {
    const st = s.steps[i]!;
    if (st.kind !== 'rest') return st;
  }
  return undefined;
}

export interface Progress { done: number; total: number; fraction: number }
export function progressOf(s: FlowState): Progress {
  const total = s.steps.filter((x) => x.kind !== 'rest').length;
  if (total === 0) return { done: 0, total: 0, fraction: 1 };
  const done = s.endedAt !== null && !s.endedEarly
    ? total
    : s.steps.slice(0, s.idx).filter((x) => x.kind !== 'rest').length;
  return { done, total, fraction: done / total };
}

/** Time actually spent working out: pauses are excluded. */
export function activeMs(s: FlowState, now: number): number {
  const end = s.endedAt ?? now;
  const pausedNow = s.pausedAt !== null ? Math.max(0, end - s.pausedAt) : 0;
  return Math.max(0, end - s.startedAt - s.pausedMs - pausedNow);
}

export function totalVolume(logs: LoggedSet[]): number {
  let v = 0;
  for (const l of logs) if (l.exerciseId !== FINISHER_ID && !l.durationSec) v += l.reps * l.weightKg;
  return Math.round(v);
}

export function mainLogs(logs: LoggedSet[]): LoggedSet[] {
  return logs.filter((l) => l.exerciseId !== FINISHER_ID);
}

// ---------------------------------------------------------------- finisher helpers

export interface IntervalPhase {
  phase: 'work' | 'rest';
  exerciseIdx: number;
  phaseRemainingMs: number;
  /** Counts every work/rest phase from the start, so a change of value means a phase change. */
  phaseNo: number;
}

export function intervalPhase(elapsedMs: number, workSec: number, restSec: number, nExercises: number): IntervalPhase {
  const work = workSec * 1000;
  const cycle = (workSec + restSec) * 1000;
  const e = Math.max(0, elapsedMs);
  const i = Math.floor(e / cycle);
  const within = e - i * cycle;
  const n = Math.max(1, nExercises);
  if (within < work) return { phase: 'work', exerciseIdx: i % n, phaseRemainingMs: work - within, phaseNo: i * 2 };
  return { phase: 'rest', exerciseIdx: i % n, phaseRemainingMs: cycle - within, phaseNo: i * 2 + 1 };
}

function finisherCues(prevElapsed: number, currElapsed: number, f: FinisherStep): number[] {
  if (f.type !== 'interval') return [];
  const a = intervalPhase(prevElapsed, f.workSec, f.restSec, f.exerciseIds.length);
  const b = intervalPhase(currElapsed, f.workSec, f.restSec, f.exerciseIds.length);
  if (a.phaseNo !== b.phaseNo) return [0];
  return countdownCues(a.phaseRemainingMs, b.phaseRemainingMs).filter((n) => n > 0);
}

// ---------------------------------------------------------------- transitions

function finisherLog(f: FinisherStep, rounds: number, durationSec: number, at: number): LoggedSet {
  return { exerciseId: FINISHER_ID, setNo: 1, reps: f.type === 'amrap' ? rounds : 0, weightKg: 0, durationSec, doneAt: at };
}

/** A timer reached zero at `end`: finish the step it belonged to and enter the next one at that same instant. */
function completeTimed(s: FlowState, end: number): FlowState {
  const step = s.steps[s.idx]!;
  if (step.kind === 'rest') return enterStep(s, s.idx + 1, end);
  if (step.kind === 'work') {
    const logs = step.section === 'main' && step.mode === 'timed'
      ? [...s.logs, { exerciseId: step.exerciseId, setNo: step.setNo, reps: 0, weightKg: 0, durationSec: step.durationSec ?? DEFAULT_EXTRA_SEC, doneAt: end }]
      : s.logs;
    return enterStep({ ...s, logs }, s.idx + 1, end);
  }
  const logs = [...s.logs, finisherLog(step, s.rounds, step.minutes * 60, end)];
  return enterStep({ ...s, logs }, s.idx + 1, end);
}

/**
 * Advances time. Steps whose timers ran out while the tab slept are completed in order, each one starting at the
 * previous one's end timestamp, so catching up never drifts. Returns the same object when nothing changed.
 */
export function tick(s: FlowState, now: number, prevNow: number = now): { state: FlowState; events: FlowEvent[] } {
  if (s.endedAt !== null || s.pausedAt !== null) return { state: s, events: [] };
  const events: FlowEvent[] = [];
  let cur = s;
  const startIdx = s.idx;
  let finishedCue = false;
  let guard = 0;

  while (cur.timer && remainingOf(cur.timer, now) <= 0 && guard++ < 1000) {
    const end = endTimeOf(cur.timer);
    if (end === null) break;
    if (!finishedCue && remainingOf(cur.timer, prevNow) > 0) {
      events.push({ type: 'cue', n: 0 });
      finishedCue = true;
    }
    cur = completeTimed(cur, end);
  }

  if (cur.endedAt !== null) {
    events.push({ type: 'step' }, { type: 'complete' });
    return { state: cur, events };
  }
  if (cur.idx !== startIdx) events.push({ type: 'step' });
  else if (cur.timer) {
    const step = cur.steps[cur.idx]!;
    if (step.kind === 'finisher') {
      for (const n of finisherCues(elapsedOf(cur.timer, prevNow), elapsedOf(cur.timer, now), step)) events.push({ type: 'cue', n });
      // the last seconds of the whole finisher
      for (const n of countdownCues(remainingOf(cur.timer, prevNow), remainingOf(cur.timer, now))) {
        if (n > 0) events.push({ type: 'cue', n });
      }
    } else {
      for (const n of countdownCues(remainingOf(cur.timer, prevNow), remainingOf(cur.timer, now))) events.push({ type: 'cue', n });
    }
  }
  return { state: cur, events };
}

export interface SetEntry { reps: number; weightKg: number; loadLabel?: string }

/** Log the current reps set (main section) or just tick off a warm-up / cooldown move, then move on. */
export function logSet(s: FlowState, entry: SetEntry, now: number): FlowState {
  const step = currentStep(s);
  if (s.endedAt !== null || s.pausedAt !== null || !step || step.kind !== 'work' || step.mode !== 'reps') return s;
  const logs = step.section === 'main'
    ? [...s.logs, {
        exerciseId: step.exerciseId, setNo: step.setNo, reps: entry.reps, weightKg: entry.weightKg,
        loadLabel: entry.loadLabel, tempo: step.tempo, doneAt: now,
      }]
    : s.logs;
  return enterStep({ ...s, logs }, s.idx + 1, now);
}

/** Start a manual hold countdown (timed step that does not start itself). */
export function startHold(s: FlowState, now: number): FlowState {
  const step = currentStep(s);
  if (s.endedAt !== null || s.pausedAt !== null || !step || step.kind !== 'work' || step.mode !== 'timed' || s.timer) return s;
  return { ...s, timer: newTimer((step.durationSec ?? DEFAULT_EXTRA_SEC) * 1000, now) };
}

export function startFinisher(s: FlowState, now: number): FlowState {
  const step = currentStep(s);
  if (s.endedAt !== null || s.pausedAt !== null || !step || step.kind !== 'finisher' || s.timer) return s;
  return { ...s, rounds: 0, timer: newTimer(step.minutes * 60_000, now) };
}

export function addRound(s: FlowState): FlowState {
  const step = currentStep(s);
  if (s.endedAt !== null || s.pausedAt !== null || !step || step.kind !== 'finisher' || !s.timer) return s;
  return { ...s, rounds: s.rounds + 1 };
}

/** Skip whatever is on screen. Skipping a set also drops the rest that would have followed it. */
export function skipStep(s: FlowState, now: number): FlowState {
  const step = currentStep(s);
  if (s.endedAt !== null || s.pausedAt !== null || !step) return s;
  if (step.kind === 'rest') return enterStep(s, s.idx + 1, now);
  if (step.kind === 'work') {
    let next = s.idx + 1;
    if (s.steps[next]?.kind === 'rest') next++;
    return enterStep(s, next, now);
  }
  // finisher: stopping a started one keeps what was done
  if (s.timer) {
    const spent = Math.round(elapsedOf(s.timer, now) / 1000);
    const logs = [...s.logs, finisherLog(step, s.rounds, spent, now)];
    return enterStep({ ...s, logs }, s.idx + 1, now);
  }
  return enterStep(s, s.idx + 1, now);
}

/** +15 s / -15 s on the rest timer. */
export function adjustRest(s: FlowState, deltaSec: number): FlowState {
  const step = currentStep(s);
  if (s.endedAt !== null || !step || step.kind !== 'rest' || !s.timer) return s;
  return { ...s, timer: adjustTimer(s.timer, deltaSec * 1000) };
}

/** Take back the set just logged (only while its rest is showing). */
export function undoLast(s: FlowState, now: number): FlowState {
  const step = currentStep(s);
  const prev = s.steps[s.idx - 1];
  const last = s.logs[s.logs.length - 1];
  if (s.endedAt !== null || s.pausedAt !== null || step?.kind !== 'rest' || prev?.kind !== 'work' || prev.mode !== 'reps') return s;
  if (!last || last.exerciseId !== prev.exerciseId || last.setNo !== prev.setNo) return s;
  return enterStep({ ...s, logs: s.logs.slice(0, -1) }, s.idx - 1, now);
}

export function pause(s: FlowState, now: number): FlowState {
  if (s.endedAt !== null || s.pausedAt !== null) return s;
  return { ...s, pausedAt: now, timer: s.timer ? pauseTimer(s.timer, now) : null };
}

export function resume(s: FlowState, now: number): FlowState {
  if (s.pausedAt === null) return s;
  return { ...s, pausedAt: null, pausedMs: s.pausedMs + Math.max(0, now - s.pausedAt), timer: s.timer ? resumeTimer(s.timer, now) : null };
}

export function endEarly(s: FlowState, now: number): FlowState {
  if (s.endedAt !== null) return s;
  return { ...s, endedAt: now, endedEarly: true, timer: null };
}

/** Validates data read back from IndexedDB; returns null if it is not a usable FlowState. */
export function restoreFlow(raw: unknown): FlowState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<FlowState>;
  if (!Array.isArray(r.steps) || r.steps.length === 0 || typeof r.idx !== 'number' || !Array.isArray(r.logs)) return null;
  if (typeof r.startedAt !== 'number') return null;
  return {
    steps: r.steps, idx: r.idx, timer: r.timer ?? null, logs: r.logs, rounds: r.rounds ?? 0,
    startedAt: r.startedAt, endedAt: r.endedAt ?? null, endedEarly: r.endedEarly ?? false,
    pausedAt: r.pausedAt ?? null, pausedMs: r.pausedMs ?? 0,
  };
}
