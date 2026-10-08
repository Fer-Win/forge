'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { tickRun, type RunEvent, type RunState } from '@/engine/runFlow';
import { countdownBeep, doneChime } from '@/services/audio';
import { hapticCue, hapticDone, hapticGo } from '@/services/haptics';
import { speak, spokenDuration } from '@/services/speech';

interface Feedback { sound: boolean; haptics: boolean; speech: boolean }

/** Spoken text for entering a segment. */
export function announce(label: string, kind: string, durSec: number): string {
  if (kind === 'work') return `${label}. ${spokenDuration(durSec)}.`;
  if (kind === 'recovery') return `Easy. ${spokenDuration(durSec)}.`;
  return `${label}. ${spokenDuration(durSec)}.`;
}

/** Runs a RunState against the real clock and turns its events into beeps, vibration and speech. */
export function useRun(feedback: Feedback) {
  const [run, setRun] = useState<RunState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const runRef = useRef<RunState | null>(null);
  const lastRef = useRef(Date.now());
  const fb = useRef(feedback);
  useEffect(() => {
    fb.current = feedback;
  }, [feedback]);

  const commit = useCallback((next: RunState | null) => {
    runRef.current = next;
    setRun(next);
  }, []);

  const handle = useCallback((events: RunEvent[]) => {
    const f = fb.current;
    for (const e of events) {
      if (e.type === 'segment') {
        if (f.sound) countdownBeep(0);
        if (f.haptics) hapticGo();
        if (f.speech) speak(announce(e.segment.label, e.segment.kind, e.segment.durSec));
      } else if (e.type === 'cue') {
        if (f.sound) countdownBeep(e.n);
        if (f.haptics) hapticCue();
      } else {
        if (f.sound) doneChime();
        if (f.haptics) hapticDone();
        if (f.speech) speak('Run complete. Nice work.');
      }
    }
  }, []);

  const run_ = useCallback(() => {
    const cur = runRef.current;
    const t = Date.now();
    if (cur) {
      const r = tickRun(cur, t, lastRef.current);
      handle(r.events);
      if (r.state !== cur) commit(r.state);
    }
    lastRef.current = t;
    setNow(t);
  }, [commit, handle]);

  const running = run !== null && run.endedAt === null;
  useEffect(() => {
    if (!running) return;
    lastRef.current = Date.now();
    const id = setInterval(run_, 250);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run_();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running, run_]);

  /** Apply a user action after catching the clock up. The action may return events (e.g. skip segment). */
  const act = useCallback(
    (fn: (s: RunState, now: number) => RunState | { state: RunState; events: RunEvent[] }) => {
      const cur = runRef.current;
      if (!cur) return;
      const t = Date.now();
      const caught = tickRun(cur, t, lastRef.current);
      handle(caught.events);
      lastRef.current = t;
      const out = fn(caught.state, t);
      if ('state' in out && 'events' in out) {
        handle(out.events);
        commit(out.state);
      } else commit(out);
      setNow(t);
    },
    [commit, handle],
  );

  const start = useCallback(
    (s: RunState) => {
      lastRef.current = Date.now();
      commit(s);
      setNow(Date.now());
    },
    [commit],
  );

  return { run, now, act, start };
}
