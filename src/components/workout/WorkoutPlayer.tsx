'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRepos } from '@/data';
import type { ActiveSession, DayPrefs, Exercise, LoggedSet, Session, Workout } from '@/data/types';
import {
  buildSteps, endEarly, initFlow, mainLogs, pause, restoreFlow, resume, totalVolume,
} from '@/engine/flow';
import { bestsFromSessions, findPRs, type PR } from '@/engine/pr';
import { lastSetsByExercise } from '@/engine/prefill';
import { buildSession } from '@/engine/session';
import { useFlow } from '@/hooks/useFlow';
import { useSettings } from '@/hooks/useData';
import { unlockAudio } from '@/services/audio';
import { useWakeLock } from '@/services/wakeLock';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PillButton } from '@/components/ui/PillButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { ActiveView } from './ActiveView';
import { CompleteView } from './CompleteView';
import { ReadyView } from './ReadyView';

interface Loaded {
  workout: Workout;
  exercises: Map<string, Exercise>;
  prefs: DayPrefs;
  sessions: Session[];
  history: Map<string, LoggedSet[]>;
}
interface Saved { session: Session; prs: PR[] }

export function WorkoutPlayer({ workoutId, date }: { workoutId: string; date: string }) {
  const router = useRouter();
  const settings = useSettings();
  const units = settings?.value?.units ?? 'metric';
  const feedback = useMemo(
    () => ({ sound: settings?.value?.sound ?? true, haptics: settings?.value?.haptics ?? true }),
    [settings?.value?.sound, settings?.value?.haptics],
  );
  const { flow, now, act, start } = useFlow(feedback);

  const [data, setData] = useState<Loaded | 'missing' | null>(null);
  const [stale, setStale] = useState<{ active: ActiveSession; name: string } | null>(null);
  const [warmup, setWarmup] = useState(true);
  const [cooldown, setCooldown] = useState(true);
  const [endOpen, setEndOpen] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const savedFor = useRef<number | null>(null);

  const loaded = data && data !== 'missing' ? data : null;
  useWakeLock(flow !== null && flow.endedAt === null);

  // Load everything the screen needs, and resume an interrupted session of this same workout.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = getRepos();
      const [workout, exercises, prefs, sessions, active] = await Promise.all([
        r.workouts.get(workoutId), r.exercises.all(), r.prefs.get(date), r.sessions.all(), r.active.get(),
      ]);
      if (!alive) return;
      if (!workout) {
        setData('missing');
        return;
      }
      const same = active && active.workoutId === workoutId && active.date === date;
      const restored = same ? restoreFlow(active.state) : null;
      if (restored) start(restored);
      else if (active) {
        const other = await r.workouts.get(active.workoutId);
        if (!alive) return;
        setStale({ active, name: other?.name ?? 'workout' });
      }
      setData({
        workout,
        exercises: new Map(exercises.map((e) => [e.id, e])),
        prefs: prefs ?? { date, intensity: 'normal', short: false },
        sessions,
        history: lastSetsByExercise(sessions),
      });
    })();
    return () => { alive = false; };
  }, [workoutId, date, start]);

  // Crash recovery: write the state after every change (not every tick: the object only changes on real events).
  useEffect(() => {
    if (!flow || !loaded || flow.endedAt !== null) return;
    void getRepos().active.put({ id: 'active', date, workoutId, updatedAt: Date.now(), state: flow });
  }, [flow, loaded, date, workoutId]);

  // Save the session once the workout ends (finished or ended early).
  useEffect(() => {
    if (!flow || flow.endedAt === null || !loaded || savedFor.current === flow.startedAt) return;
    savedFor.current = flow.startedAt;
    void (async () => {
      const r = getRepos();
      if (flow.logs.length === 0) {
        await r.active.clear();
        router.replace('/today/');
        return;
      }
      const id = `${date}-${workoutId}-${flow.startedAt}`;
      const main = mainLogs(flow.logs);
      const prs = findPRs(main, bestsFromSessions(loaded.sessions, id));
      const session: Session = {
        id, date, workoutId,
        status: flow.endedEarly ? 'partial' : 'done',
        startedAt: flow.startedAt, endedAt: flow.endedAt!,
        intensity: loaded.prefs.intensity, energy: loaded.prefs.energy,
        sets: flow.logs, totalVolume: totalVolume(flow.logs),
      };
      await r.sessions.add(session);
      const doneIds = new Set(flow.logs.map((l) => l.exerciseId));
      for (const exId of doneIds) await r.checks.set(date, exId, 'done');
      await r.active.clear();
      setSaved({ session, prs });
    })();
  }, [flow, loaded, date, workoutId, router]);

  if (data === 'missing') {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4" style={{ paddingTop: 'calc(var(--safe-top) + 24px)' }}>
        <h1 className="text-3xl font-extrabold">Workout not found</h1>
        <p className="mt-2 text-muted">That workout is no longer in your library.</p>
        <Link href="/today/" className="press mt-6 inline-flex min-h-tap items-center rounded-full bg-card-2 px-6 font-bold">Back to Today</Link>
      </main>
    );
  }
  if (!loaded) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4" style={{ paddingTop: 'calc(var(--safe-top) + 24px)' }}>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-6 h-32" />
        <Skeleton className="mt-3 h-16" />
      </main>
    );
  }

  if (flow && flow.endedAt !== null) {
    if (!saved) return <main className="min-h-dvh" aria-busy="true" />;
    return (
      <CompleteView
        workoutName={loaded.workout.name} date={date} flow={flow}
        session={saved.session} prs={saved.prs} exercises={loaded.exercises} units={units}
      />
    );
  }

  if (flow) {
    return (
      <>
        <ActiveView
          flow={flow} now={now} exercises={loaded.exercises} history={loaded.history} sessions={loaded.sessions} units={units} act={act}
          onPause={() => act((s, t) => pause(s, t))}
          onEnd={() => setEndOpen(true)}
        />
        <BottomSheet open={flow.pausedAt !== null} onClose={() => act((s, t) => resume(s, t))} title="Paused">
          <p className="text-muted">Your timers are frozen. Nothing is lost.</p>
          <div className="mt-5 grid gap-3 pb-2">
            <PillButton className="min-h-[56px] text-lg" onClick={() => act((s, t) => resume(s, t))}>Resume</PillButton>
            <PillButton variant="secondary" onClick={() => setEndOpen(true)}>End workout</PillButton>
          </div>
        </BottomSheet>
        <EndSheet
          open={endOpen}
          loggedSets={mainLogs(flow.logs).length}
          onKeepGoing={() => setEndOpen(false)}
          onEnd={() => {
            setEndOpen(false);
            act((s, t) => endEarly(s, t));
          }}
        />
      </>
    );
  }

  const prefs = loaded.prefs;
  const built = buildSession(loaded.workout, { short: prefs.short, intensity: prefs.intensity });
  return (
    <>
      <ReadyView
        workout={loaded.workout} built={built} exercises={loaded.exercises}
        intensity={prefs.intensity} short={prefs.short}
        warmup={warmup} cooldown={cooldown} onWarmup={setWarmup} onCooldown={setCooldown}
        onStart={() => {
          unlockAudio();
          const steps = buildSteps(built, { kind: loaded.workout.kind, warmup, cooldown, exercises: loaded.exercises });
          start(initFlow(steps, Date.now()));
        }}
      />
      <BottomSheet open={stale !== null} onClose={() => setStale(null)} title="Unfinished workout">
        {stale && (
          <div className="pb-2">
            <p className="text-muted">You have an unfinished {stale.name} session. Pick up where you left off, or start this one fresh.</p>
            <div className="mt-5 grid gap-3">
              <PillButton onClick={() => router.replace(`/workout/?w=${stale.active.workoutId}&d=${stale.active.date}`)}>
                Resume {stale.name}
              </PillButton>
              <PillButton
                variant="secondary"
                onClick={() => {
                  void getRepos().active.clear();
                  setStale(null);
                }}
              >
                Discard it
              </PillButton>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function EndSheet({
  open, loggedSets, onKeepGoing, onEnd,
}: { open: boolean; loggedSets: number; onKeepGoing: () => void; onEnd: () => void }) {
  return (
    <BottomSheet open={open} onClose={onKeepGoing} title="End workout?">
      <p className="text-muted">
        {loggedSets > 0
          ? `Your ${loggedSets} logged ${loggedSets === 1 ? 'set' : 'sets'} will be saved as a partial session.`
          : 'Nothing has been logged yet, so nothing will be saved.'}
      </p>
      <div className="mt-5 grid gap-3 pb-2">
        <PillButton variant="secondary" onClick={onKeepGoing}>Keep going</PillButton>
        <PillButton onClick={onEnd}>{loggedSets > 0 ? 'End and save' : 'Leave workout'}</PillButton>
      </div>
    </BottomSheet>
  );
}
