/**
 * Timestamp-based timer. Nothing here counts ticks: every answer is computed from
 * Date.now()-style timestamps, so a throttled or backgrounded tab can never drift.
 * Plain JSON-serialisable data, so a running timer survives a reload.
 */
export interface Timer {
  durationMs: number;
  /** Timestamp the current run began; null while paused. */
  startedAt: number | null;
  /** Time already spent before the current run (from earlier pauses). */
  elapsedBeforeMs: number;
}

export function newTimer(durationMs: number, now: number, running = true): Timer {
  return { durationMs: Math.max(0, durationMs), startedAt: running ? now : null, elapsedBeforeMs: 0 };
}

export function isRunning(t: Timer): boolean {
  return t.startedAt !== null;
}

export function elapsedOf(t: Timer, now: number): number {
  const run = t.startedAt === null ? 0 : now - t.startedAt;
  return Math.max(0, t.elapsedBeforeMs + run);
}

export function remainingOf(t: Timer, now: number): number {
  return Math.max(0, t.durationMs - elapsedOf(t, now));
}

export function isDone(t: Timer, now: number): boolean {
  return remainingOf(t, now) <= 0;
}

export function pauseTimer(t: Timer, now: number): Timer {
  if (t.startedAt === null) return t;
  return { ...t, startedAt: null, elapsedBeforeMs: elapsedOf(t, now) };
}

export function resumeTimer(t: Timer, now: number): Timer {
  if (t.startedAt !== null) return t;
  return { ...t, startedAt: now };
}

/** Lengthen or shorten the timer (the +15 s / -15 s buttons). Never below zero. */
export function adjustTimer(t: Timer, deltaMs: number): Timer {
  return { ...t, durationMs: Math.max(0, t.durationMs + deltaMs) };
}

/** The timestamp at which a running timer reaches zero; null while paused. */
export function endTimeOf(t: Timer): number | null {
  if (t.startedAt === null) return null;
  return t.startedAt + (t.durationMs - t.elapsedBeforeMs);
}

/**
 * Beep cues crossed between two readings of the same countdown.
 * 3, 2, 1 fire when the displayed second first reaches that number; 0 fires on the finish.
 * Idempotent: the same pair of readings always gives the same answer, and a later pair never repeats a cue.
 */
export function countdownCues(prevRemainingMs: number, currRemainingMs: number): number[] {
  const prev = Math.ceil(prevRemainingMs / 1000);
  const curr = Math.ceil(currRemainingMs / 1000);
  const out: number[] = [];
  for (const s of [3, 2, 1]) if (prev > s && curr <= s) out.push(s);
  if (prevRemainingMs > 0 && currRemainingMs <= 0) out.push(0);
  return out;
}

/** mm:ss for a duration in ms (rounds up so 0:00 only shows at the very end). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
