import { describe, expect, it } from 'vitest';
import {
  adjustTimer, countdownCues, elapsedOf, endTimeOf, formatClock, isDone, isRunning,
  newTimer, pauseTimer, remainingOf, resumeTimer,
} from './timer';

describe('timer', () => {
  it('computes remaining from timestamps, not ticks', () => {
    const t = newTimer(60_000, 1_000);
    expect(remainingOf(t, 1_000)).toBe(60_000);
    expect(remainingOf(t, 31_000)).toBe(30_000);
    // a tab that slept for 10 minutes is simply finished
    expect(remainingOf(t, 1_000 + 600_000)).toBe(0);
    expect(isDone(t, 1_000 + 600_000)).toBe(true);
    expect(isDone(t, 2_000)).toBe(false);
  });

  it('pause freezes and resume continues', () => {
    let t = newTimer(60_000, 0);
    t = pauseTimer(t, 20_000);
    expect(isRunning(t)).toBe(false);
    expect(remainingOf(t, 20_000)).toBe(40_000);
    expect(remainingOf(t, 500_000)).toBe(40_000); // still frozen
    t = resumeTimer(t, 500_000);
    expect(remainingOf(t, 510_000)).toBe(30_000);
    expect(endTimeOf(t)).toBe(540_000);
  });

  it('pause and resume are idempotent', () => {
    const t = newTimer(10_000, 0);
    expect(resumeTimer(t, 5)).toBe(t);
    const p = pauseTimer(t, 1_000);
    expect(pauseTimer(p, 9_000)).toBe(p);
    expect(endTimeOf(p)).toBeNull();
  });

  it('adjusts by +/- 15 s and never goes negative', () => {
    let t = newTimer(60_000, 0);
    t = adjustTimer(t, 15_000);
    expect(remainingOf(t, 0)).toBe(75_000);
    t = adjustTimer(t, -15_000);
    t = adjustTimer(t, -15_000);
    expect(remainingOf(t, 0)).toBe(45_000);
    expect(adjustTimer(newTimer(5_000, 0), -15_000).durationMs).toBe(0);
  });

  it('elapsed never goes negative if the clock steps back', () => {
    expect(elapsedOf(newTimer(1_000, 5_000), 4_000)).toBe(0);
  });

  it('formats a clock, rounding up', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(59_001)).toBe('1:00');
    expect(formatClock(125_000)).toBe('2:05');
  });
});

describe('countdownCues', () => {
  it('fires 3, 2, 1 as each second is reached, then 0 at the end', () => {
    expect(countdownCues(3_200, 2_900)).toEqual([3]);
    expect(countdownCues(3_000, 2_600)).toEqual([]); // still showing 3: already fired
    expect(countdownCues(3_000, 1_900)).toEqual([2]);
    expect(countdownCues(1_900, 400)).toEqual([1]);
    expect(countdownCues(400, 0)).toEqual([0]);
  });

  it('never repeats a cue across consecutive readings', () => {
    const fired: number[] = [];
    let prev = 6_000;
    for (let now = 5_950; now >= -100; now -= 50) {
      const curr = Math.max(0, now);
      fired.push(...countdownCues(prev, curr));
      prev = curr;
    }
    expect(fired).toEqual([3, 2, 1, 0]);
  });

  it('reports every cue crossed in one long gap, and nothing once finished', () => {
    expect(countdownCues(5_000, 0)).toEqual([3, 2, 1, 0]);
    expect(countdownCues(0, 0)).toEqual([]);
    expect(countdownCues(10_000, 9_000)).toEqual([]);
  });
});
