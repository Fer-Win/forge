import { describe, expect, it } from 'vitest';
import type { RunSegment } from '../data/types';
import {
  actualMs, isEnded, pauseRun, planElapsed, positionOf, restoreRun, resumeRun, segmentAt, skipSegment,
  startRun, stopRun, tickRun, totalMs,
} from './runFlow';

const SEGS: RunSegment[] = [
  { label: 'Warm-up', kind: 'warmup', durSec: 60 },
  { label: 'Hard 1 of 2', kind: 'work', durSec: 30 },
  { label: 'Easy', kind: 'recovery', durSec: 30 },
  { label: 'Cooldown', kind: 'cooldown', durSec: 60 },
];
const S = 1000;

describe('segmentAt', () => {
  it('finds the segment, its remaining time and the next one', () => {
    expect(segmentAt(SEGS, 0)).toMatchObject({ index: 0, remainingMs: 60_000, done: false });
    expect(segmentAt(SEGS, 59_999).index).toBe(0);
    const p = segmentAt(SEGS, 70_000);
    expect(p).toMatchObject({ index: 1, elapsedMs: 10_000, remainingMs: 20_000 });
    expect(p.next?.label).toBe('Easy');
    expect(segmentAt(SEGS, 120_000).index).toBe(3);
  });
  it('at or past the end it is the last segment with nothing left', () => {
    expect(segmentAt(SEGS, 180_000)).toMatchObject({ index: 3, remainingMs: 0, done: true });
    expect(segmentAt(SEGS, 999_999)).toMatchObject({ index: 3, remainingMs: 0, done: true });
    expect(segmentAt(SEGS, 180_000).next).toBeUndefined();
  });
  it('totals the plan', () => expect(totalMs(SEGS)).toBe(180_000));
});

describe('tickRun', () => {
  it('announces a segment change exactly once', () => {
    const s = startRun(SEGS, 0);
    expect(tickRun(s, 59_900, 59_000).events).toEqual([]);
    const r = tickRun(s, 60_100, 59_900);
    expect(r.events).toEqual([{ type: 'segment', index: 1, segment: SEGS[1] }]);
    expect(tickRun(s, 60_300, 60_100).events).toEqual([]);
  });

  it('fires 3-2-1 before the segment ends', () => {
    const s = startRun(SEGS, 0);
    expect(tickRun(s, 57_200, 56_900).events).toEqual([{ type: 'cue', n: 3 }]);
    expect(tickRun(s, 58_100, 57_900).events).toEqual([{ type: 'cue', n: 2 }]);
    expect(tickRun(s, 59_100, 58_900).events).toEqual([{ type: 'cue', n: 1 }]);
  });

  it('after a long sleep it lands in the right segment', () => {
    const s = startRun(SEGS, 0);
    const r = tickRun(s, 100_000, 10_000);
    expect(r.events).toEqual([{ type: 'segment', index: 2, segment: SEGS[2] }]);
    expect(positionOf(s, 100_000)).toMatchObject({ index: 2, remainingMs: 20_000 });
  });

  it('finishes at the end of the plan and records the exact end time', () => {
    const s = startRun(SEGS, 1_000);
    const r = tickRun(s, 500_000, 400_000);
    expect(r.events).toEqual([{ type: 'complete' }]);
    expect(isEnded(r.state)).toBe(true);
    expect(r.state.endedAt).toBe(181_000);
    expect(actualMs(r.state, 999_999)).toBe(180_000);
    expect(tickRun(r.state, 600_000).events).toEqual([]);
  });
});

describe('pause, skip, stop', () => {
  it('pausing freezes the plan position', () => {
    let s = startRun(SEGS, 0);
    s = pauseRun(s, 20_000);
    expect(tickRun(s, 900_000, 800_000).state).toBe(s);
    expect(planElapsed(s, 900_000)).toBe(20_000);
    s = resumeRun(s, 900_000);
    expect(planElapsed(s, 910_000)).toBe(30_000);
    expect(actualMs(s, 910_000)).toBe(30_000);
  });

  it('skip jumps to the start of the next segment without changing real time', () => {
    const s = startRun(SEGS, 0);
    const r = skipSegment(s, 10_000);
    expect(r.events).toEqual([{ type: 'segment', index: 1, segment: SEGS[1] }]);
    expect(positionOf(r.state, 10_000)).toMatchObject({ index: 1, elapsedMs: 0 });
    expect(actualMs(r.state, 10_000)).toBe(10_000);
    expect(planElapsed(r.state, 15_000)).toBe(65_000);
  });

  it('skipping the last segment ends the run', () => {
    let s = startRun(SEGS, 0);
    s = skipSegment(skipSegment(skipSegment(s, 1_000).state, 2_000).state, 3_000).state;
    const r = skipSegment(s, 4_000);
    expect(isEnded(r.state)).toBe(true);
    expect(r.events).toEqual([{ type: 'complete' }]);
    expect(actualMs(r.state, 99_999)).toBe(4_000);
  });

  it('stopping early keeps the real time run and excludes a final pause', () => {
    let s = startRun(SEGS, 0);
    s = pauseRun(s, 30_000);
    s = stopRun(s, 90_000);
    expect(s.stoppedEarly).toBe(true);
    expect(actualMs(s, 200_000)).toBe(30_000);
  });
});

describe('restoreRun', () => {
  it('round-trips through JSON and rejects junk', () => {
    const s = pauseRun(startRun(SEGS, 5_000), 25_000);
    expect(restoreRun(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(restoreRun(null)).toBeNull();
    expect(restoreRun({ segments: [] })).toBeNull();
    expect(S).toBe(1000);
  });
});
