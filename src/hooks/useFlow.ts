'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { tick, type FlowEvent, type FlowState } from '@/engine/flow';
import { countdownBeep, doneChime } from '@/services/audio';
import { hapticCue, hapticDone, hapticGo } from '@/services/haptics';

interface Feedback { sound: boolean; haptics: boolean }

/**
 * Runs a FlowState against the real clock. The engine is pure; this hook only supplies `Date.now()`,
 * ticks it a few times a second (and the moment the tab becomes visible again), and turns events into beeps.
 */
export function useFlow(feedback: Feedback) {
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const flowRef = useRef<FlowState | null>(null);
  const lastRef = useRef(Date.now());
  const fbRef = useRef(feedback);

  useEffect(() => {
    fbRef.current = feedback;
  }, [feedback]);

  const commit = useCallback((next: FlowState | null) => {
    flowRef.current = next;
    setFlow(next);
  }, []);

  const handle = useCallback((events: FlowEvent[]) => {
    const fb = fbRef.current;
    const cues = events.filter((e): e is Extract<FlowEvent, { type: 'cue' }> => e.type === 'cue');
    const last = cues[cues.length - 1];
    if (last) {
      if (fb.sound) countdownBeep(last.n);
      if (fb.haptics) (last.n > 0 ? hapticCue : hapticGo)();
    }
    if (events.some((e) => e.type === 'complete')) {
      if (fb.sound) doneChime();
      if (fb.haptics) hapticDone();
    }
  }, []);

  const run = useCallback(() => {
    const cur = flowRef.current;
    const t = Date.now();
    if (cur) {
      const r = tick(cur, t, lastRef.current);
      handle(r.events);
      if (r.state !== cur) commit(r.state);
    }
    lastRef.current = t;
    setNow(t);
  }, [commit, handle]);

  const running = flow !== null && flow.endedAt === null;
  useEffect(() => {
    if (!running) return;
    lastRef.current = Date.now();
    const id = setInterval(run, 200);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running, run]);

  /** Apply a user action: catch the clock up first so the action sees the true current step. */
  const act = useCallback(
    (fn: (s: FlowState, now: number) => FlowState) => {
      const cur = flowRef.current;
      if (!cur) return;
      const t = Date.now();
      const r = tick(cur, t, lastRef.current);
      handle(r.events);
      lastRef.current = t;
      commit(fn(r.state, t));
      setNow(t);
    },
    [commit, handle],
  );

  const start = useCallback(
    (s: FlowState) => {
      lastRef.current = Date.now();
      commit(s);
      setNow(Date.now());
    },
    [commit],
  );

  return { flow, now, act, start };
}
