import type { RunSegment } from '../data/types';
import { countdownCues, elapsedOf, newTimer, pauseTimer, resumeTimer, type Timer } from './timer';

/**
 * Timestamp-based run timeline. `timer` measures real running time (pauses excluded);
 * `skippedMs` is how much of the plan was skipped with "next segment".
 * Plan position = timer elapsed + skippedMs, so nothing ever counts ticks.
 */
export interface RunState {
  segments: RunSegment[];
  timer: Timer;
  skippedMs: number;
  startedAt: number;
  endedAt: number | null;
  stoppedEarly: boolean;
  pausedAt: number | null;
}

export type RunEvent =
  | { type: 'segment'; index: number; segment: RunSegment }
  | { type: 'cue'; n: number }
  | { type: 'complete' };

export const totalMs = (segments: RunSegment[]) => segments.reduce((t, s) => t + s.durSec * 1000, 0);

export interface Position {
  index: number;
  segment: RunSegment;
  elapsedMs: number;
  remainingMs: number;
  next: RunSegment | undefined;
  done: boolean;
}

/** Which segment a plan time falls in. At or past the end, it is the last segment with nothing left. */
export function segmentAt(segments: RunSegment[], planMs: number): Position {
  let start = 0;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]!;
    const end = start + s.durSec * 1000;
    if (planMs < end || i === segments.length - 1) {
      const elapsed = Math.min(Math.max(0, planMs - start), s.durSec * 1000);
      return {
        index: i, segment: s, elapsedMs: elapsed, remainingMs: s.durSec * 1000 - elapsed,
        next: segments[i + 1], done: planMs >= end && i === segments.length - 1,
      };
    }
    start = end;
  }
  throw new Error('a run needs at least one segment');
}

export function startRun(segments: RunSegment[], now: number): RunState {
  return {
    segments, timer: newTimer(Number.MAX_SAFE_INTEGER, now), skippedMs: 0,
    startedAt: now, endedAt: null, stoppedEarly: false, pausedAt: null,
  };
}

/** Plan time reached so far (including skipped parts), capped at the plan length. */
export function planElapsed(s: RunState, now: number): number {
  return Math.min(totalMs(s.segments), elapsedOf(s.timer, now) + s.skippedMs);
}

export function positionOf(s: RunState, now: number): Position {
  return segmentAt(s.segments, planElapsed(s, now));
}

/** Time actually spent running, pauses excluded. */
export function actualMs(s: RunState, now: number): number {
  return elapsedOf(s.timer, s.endedAt ?? now);
}

export function isEnded(s: RunState): boolean {
  return s.endedAt !== null;
}

export function tickRun(s: RunState, now: number, prevNow: number = now): { state: RunState; events: RunEvent[] } {
  if (s.endedAt !== null || s.pausedAt !== null) return { state: s, events: [] };
  const before = segmentAt(s.segments, planElapsed(s, prevNow));
  const raw = elapsedOf(s.timer, now) + s.skippedMs;
  const total = totalMs(s.segments);
  if (raw >= total) {
    const endedAt = now - (raw - total);
    return {
      state: { ...s, endedAt, timer: pauseTimer(s.timer, endedAt) },
      events: [{ type: 'complete' }],
    };
  }
  const after = segmentAt(s.segments, raw);
  if (after.index !== before.index) {
    return { state: s, events: [{ type: 'segment', index: after.index, segment: after.segment }] };
  }
  const cues = countdownCues(before.remainingMs, after.remainingMs).filter((n) => n > 0);
  return { state: s, events: cues.map((n) => ({ type: 'cue', n }) as RunEvent) };
}

export function pauseRun(s: RunState, now: number): RunState {
  if (s.endedAt !== null || s.pausedAt !== null) return s;
  return { ...s, pausedAt: now, timer: pauseTimer(s.timer, now) };
}

export function resumeRun(s: RunState, now: number): RunState {
  if (s.pausedAt === null) return s;
  return { ...s, pausedAt: null, timer: resumeTimer(s.timer, now) };
}

/** Jump to the start of the next segment. On the last segment this finishes the run. */
export function skipSegment(s: RunState, now: number): { state: RunState; events: RunEvent[] } {
  if (s.endedAt !== null || s.pausedAt !== null) return { state: s, events: [] };
  const pos = positionOf(s, now);
  const state = { ...s, skippedMs: s.skippedMs + pos.remainingMs };
  const next = tickRun(state, now, now);
  if (next.state.endedAt !== null) return next;
  return { state, events: [{ type: 'segment', index: pos.index + 1, segment: s.segments[pos.index + 1]! }] };
}

export function stopRun(s: RunState, now: number): RunState {
  if (s.endedAt !== null) return s;
  return { ...s, endedAt: now, stoppedEarly: true, timer: pauseTimer(s.timer, s.pausedAt ?? now) };
}

export function restoreRun(raw: unknown): RunState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<RunState>;
  if (!Array.isArray(r.segments) || r.segments.length === 0 || !r.timer || typeof r.startedAt !== 'number') return null;
  return {
    segments: r.segments, timer: r.timer, skippedMs: r.skippedMs ?? 0, startedAt: r.startedAt,
    endedAt: r.endedAt ?? null, stoppedEarly: r.stoppedEarly ?? false, pausedAt: r.pausedAt ?? null,
  };
}
