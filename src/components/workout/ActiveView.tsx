'use client';
import { useState, type ReactNode } from 'react';
import type { Exercise, LoggedSet, Session } from '@/data/types';
import {
  addRound, adjustRest, intervalPhase, logSet, progressOf, skipStep, startFinisher, startHold, undoLast, upNext, activeMs,
  type FinisherStep, type FlowState, type RestStep, type WorkStep,
} from '@/engine/flow';
import { overloadSuggestion } from '@/engine/overload';
import { prefill } from '@/engine/prefill';
import { elapsedOf, formatClock, remainingOf } from '@/engine/timer';
import { fmtWeight, type Units } from '@/engine/units';
import { loadKg } from '@/engine/warmup';
import { loadLabel } from '@/lib/labels';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CountdownRing } from '@/components/ui/CountdownRing';
import { PillButton } from '@/components/ui/PillButton';
import { Stepper } from '@/components/ui/Stepper';

type Act = (fn: (s: FlowState, now: number) => FlowState) => void;

export interface ActiveViewProps {
  flow: FlowState;
  now: number;
  exercises: Map<string, Exercise>;
  history: Map<string, LoggedSet[]>;
  sessions: Session[];
  units: Units;
  act: Act;
  onPause: () => void;
  onEnd: () => void;
}

const nameOf = (ex: Map<string, Exercise>, id: string) => ex.get(id)?.name ?? id;
const secs = (ms: number) => Math.ceil(ms / 1000);

function elapsedLabel(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function ActiveView(p: ActiveViewProps) {
  const { flow, now } = p;
  const step = flow.steps[flow.idx];
  const prog = progressOf(flow);
  const [info, setInfo] = useState<Exercise | null>(null);

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col px-4"
      style={{ paddingTop: 'calc(var(--safe-top) + 12px)', paddingBottom: 'calc(var(--safe-bottom) + 132px)' }}
    >
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={p.onEnd} aria-label="End workout" className="press flex h-12 w-12 items-center justify-center rounded-full border border-hair bg-card text-xl">
          ✕
        </button>
        <p className="num text-lg text-muted" aria-label="Workout time" data-testid="elapsed">{elapsedLabel(activeMs(flow, now))}</p>
        <button type="button" onClick={p.onPause} aria-label="Pause workout" className="press flex h-12 w-12 items-center justify-center rounded-full border border-hair bg-card" >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><rect x="3" y="2" width="4" height="14" rx="1.5" fill="currentColor" /><rect x="11" y="2" width="4" height="14" rx="1.5" fill="currentColor" /></svg>
        </button>
      </header>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar" aria-label="Workout progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(prog.fraction * 100)}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${prog.fraction * 100}%`, transition: 'width 300ms ease' }} />
      </div>

      {step?.kind === 'work' && step.mode === 'reps' && (
        <RepsView key={flow.idx} step={step} p={p} onInfo={setInfo} />
      )}
      {step?.kind === 'work' && step.mode === 'timed' && (
        <HoldView key={flow.idx} step={step} p={p} onInfo={setInfo} />
      )}
      {step?.kind === 'rest' && <RestView key={flow.idx} step={step} p={p} />}
      {step?.kind === 'finisher' && <FinisherView key={flow.idx} step={step} p={p} />}

      <BottomSheet open={info !== null} onClose={() => setInfo(null)} title={info ? `${info.name}: form and variations` : 'Form'}>
        {info && (
          <div className="space-y-5 pb-2">
            <section aria-label="Form cues">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Form cues</h3>
              <ul className="mt-2 space-y-2">
                {info.cues.map((c) => <li key={c} className="flex gap-2"><span className="text-accent" aria-hidden>•</span>{c}</li>)}
              </ul>
            </section>
            <section className="rounded-2xl border border-hair bg-card-2 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-done">Easier</h3>
              <p className="mt-1">{info.easier}</p>
            </section>
            <section className="rounded-2xl border border-hair bg-card-2 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-accent">Harder</h3>
              <p className="mt-1">{info.harder}</p>
            </section>
            <PillButton variant="secondary" className="w-full" onClick={() => setInfo(null)}>Got it</PillButton>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-bg px-4 pt-3"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">{children}</div>
    </div>
  );
}

function ExerciseHeading({ step, ex, exercises, onInfo }: { step: WorkStep; ex: Exercise | undefined; exercises: Map<string, Exercise>; onInfo: (e: Exercise) => void }) {
  const n = step.blockExerciseIds.length;
  const pos = step.blockExerciseIds.indexOf(step.exerciseId) + 1;
  const tag =
    step.section === 'warmup' ? 'Warm-up'
    : step.section === 'cooldown' ? 'Cooldown'
    : n > 2 ? `Circuit · ${pos} of ${n}`
    : n === 2 ? `Superset · ${pos} of ${n}`
    : 'Strength';
  const partner = n === 2 && pos === 1 ? step.blockExerciseIds[1] : undefined;
  return (
    <div className="mt-6">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">{tag}</p>
      <h1 className="mt-1 text-4xl font-extrabold leading-tight tracking-tight">{ex?.name ?? step.exerciseId}</h1>
      {step.section === 'main' && (
        <p className="mt-2 text-lg font-semibold">
          Set <span className="num">{step.setNo}</span> of <span className="num">{step.sets}</span>
          {partner && <span className="ml-2 text-base font-medium text-muted">then {nameOf(exercises, partner)}</span>}
        </p>
      )}
      {ex && (
        <button type="button" onClick={() => onInfo(ex)} className="press mt-3 inline-flex min-h-tap items-center rounded-full border border-hair bg-card px-4 text-sm font-bold">
          Form &amp; variations
        </button>
      )}
    </div>
  );
}

function Cues({ ex }: { ex: Exercise | undefined }) {
  if (!ex || ex.cues.length === 0) return null;
  return (
    <ul className="mt-4 space-y-1.5 text-muted" aria-label="Form cues">
      {ex.cues.slice(0, 3).map((c) => (
        <li key={c} className="flex gap-2"><span className="text-accent" aria-hidden>•</span>{c}</li>
      ))}
    </ul>
  );
}

function RepsView({ step, p, onInfo }: { step: WorkStep; p: ActiveViewProps; onInfo: (e: Exercise) => void }) {
  const ex = p.exercises.get(step.exerciseId);
  const main = step.section === 'main';
  const pre = prefill({
    exerciseId: step.exerciseId, setNo: step.setNo, repMin: step.repMin, repMax: step.repMax,
    defaultKg: ex ? loadKg(ex.load) : 0, current: p.flow.logs, history: p.history,
  });
  const [reps, setReps] = useState(pre.reps);
  const [kg, setKg] = useState(pre.weightKg);
  const target = step.repMin && step.repMax ? `${step.repMin}–${step.repMax} reps` : 'reps';
  const tip = main && step.setNo === 1 && ex && step.repMax
    ? overloadSuggestion({ exercise: ex, repMax: step.repMax, sets: step.sets, sessions: p.sessions })
    : null;

  return (
    <>
      <ExerciseHeading step={step} ex={ex} exercises={p.exercises} onInfo={onInfo} />
      <p className="mt-3 text-muted" data-testid="target">
        Target {target}
        {ex && ex.load !== 'BW' ? ` · ${loadLabel(ex.load)}` : ''}
        {step.tempo ? ` · tempo ${step.tempo}` : ''}
      </p>
      {tip && (
        <p className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm" data-testid="overload-chip">
          <span className="font-bold text-accent">Ready to progress: {tip.title}.</span> {tip.detail}
        </p>
      )}
      <Cues ex={ex} />
      {main && (
        <div className="mt-5 grid grid-cols-1 gap-3">
          <Stepper label="Reps" value={reps} step={1} min={0} max={100} onChange={setReps} testId="reps-value" />
          <Stepper label="Weight" value={kg} step={2.5} min={0} max={60} onChange={setKg} format={(v) => fmtWeight(v, p.units)} testId="weight-value" />
        </div>
      )}
      <ActionBar>
        <PillButton variant="secondary" onClick={() => p.act((s, t) => skipStep(s, t))}>Skip</PillButton>
        <PillButton
          className="min-h-[56px] flex-1 text-lg"
          onClick={() => p.act((s, t) => logSet(s, { reps, weightKg: kg, loadLabel: ex ? loadLabel(ex.load) : undefined }, t))}
        >
          {main ? 'Log set' : 'Done'}
        </PillButton>
      </ActionBar>
    </>
  );
}

function HoldView({ step, p, onInfo }: { step: WorkStep; p: ActiveViewProps; onInfo: (e: Exercise) => void }) {
  const ex = p.exercises.get(step.exerciseId);
  const total = (step.durationSec ?? 30) * 1000;
  const timer = p.flow.timer;
  const rem = timer ? remainingOf(timer, p.now) : total;
  return (
    <>
      <ExerciseHeading step={step} ex={ex} exercises={p.exercises} onInfo={onInfo} />
      <div className="mt-6">
        <CountdownRing fraction={timer ? rem / total : 1} size={240} label={timer ? 'Hold countdown' : 'Hold duration'}>
          <span className="num text-7xl" data-testid="hold-seconds">{secs(rem)}</span>
          <span className="text-sm font-bold uppercase tracking-wide text-muted">{timer ? 'seconds left' : 'seconds'}</span>
        </CountdownRing>
      </div>
      <Cues ex={ex} />
      <ActionBar>
        <PillButton variant="secondary" onClick={() => p.act((s, t) => skipStep(s, t))}>Skip</PillButton>
        {!timer && (
          <PillButton className="min-h-[56px] flex-1 text-lg" onClick={() => p.act((s, t) => startHold(s, t))}>
            Start hold
          </PillButton>
        )}
      </ActionBar>
    </>
  );
}

function UpNextCard({ p }: { p: ActiveViewProps }) {
  const next = upNext(p.flow);
  if (!next) return null;
  if (next.kind === 'finisher') {
    return (
      <div className="mt-6 rounded-card border border-hair bg-card p-4" data-testid="up-next">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Up next</p>
        <p className="mt-1 text-lg font-bold">Finisher · {next.minutes} min</p>
      </div>
    );
  }
  const ex = p.exercises.get(next.exerciseId);
  const detail =
    next.mode === 'timed' ? `${next.durationSec ?? 30}s`
    : next.repMin && next.repMax ? `${next.repMin}–${next.repMax} reps` : 'reps';
  return (
    <div className="mt-6 rounded-card border border-hair bg-card p-4" data-testid="up-next">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Up next</p>
      <p className="mt-1 text-lg font-bold">{ex?.name ?? next.exerciseId}</p>
      <p className="text-sm text-muted">
        {next.section === 'main' ? `Set ${next.setNo} of ${next.sets} · ` : ''}{detail}
        {ex && ex.load !== 'BW' && next.section === 'main' ? ` · ${loadLabel(ex.load)}` : ''}
      </p>
    </div>
  );
}

function RestView({ step, p }: { step: RestStep; p: ActiveViewProps }) {
  const timer = p.flow.timer;
  const rem = timer ? remainingOf(timer, p.now) : step.durationSec * 1000;
  const total = timer ? timer.durationMs : step.durationSec * 1000;
  const canUndo = p.flow.logs.length > 0 && p.flow.steps[p.flow.idx - 1]?.kind === 'work';
  const adj = 'press min-h-tap min-w-[88px] rounded-full border border-hair bg-card-2 px-5 text-base font-bold';
  return (
    <>
      <p className="mt-6 text-xs font-bold uppercase tracking-wide text-rest">Rest</p>
      <div className="mt-3">
        <CountdownRing fraction={total > 0 ? rem / total : 0} size={260} color="var(--accent)" label="Rest countdown">
          <span className="num text-7xl" data-testid="rest-time">{formatClock(rem)}</span>
          <span className="text-sm text-muted">remaining</span>
        </CountdownRing>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button type="button" className={adj} onClick={() => p.act((s) => adjustRest(s, -15))}>−15 s</button>
        <button type="button" className={adj} onClick={() => p.act((s) => adjustRest(s, 15))}>+15 s</button>
      </div>
      <UpNextCard p={p} />
      {canUndo && (
        <button type="button" onClick={() => p.act((s, t) => undoLast(s, t))} className="press mx-auto mt-3 min-h-tap rounded-full px-5 text-sm font-bold text-muted">
          Undo last set
        </button>
      )}
      <ActionBar>
        <PillButton className="min-h-[56px] flex-1 text-lg" onClick={() => p.act((s, t) => skipStep(s, t))}>Skip rest</PillButton>
      </ActionBar>
    </>
  );
}

function FinisherView({ step, p }: { step: FinisherStep; p: ActiveViewProps }) {
  const timer = p.flow.timer;
  const names = step.exerciseIds.map((id) => nameOf(p.exercises, id));
  const totalMs = step.minutes * 60_000;

  if (!timer) {
    return (
      <>
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">Finisher</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{step.minutes} minutes</h1>
          <p className="mt-2 text-muted">
            {step.type === 'interval'
              ? `${step.workSec}s work, ${step.restSec}s rest. Alternate ${names.join(' and ')}.`
              : `As many rounds as you can of ${names.join(' and ')}. Tap once per round.`}
          </p>
        </div>
        <ul className="mt-5 space-y-2">
          {names.map((n) => <li key={n} className="rounded-card border border-hair bg-card px-4 py-3 font-semibold">{n}</li>)}
        </ul>
        <ActionBar>
          <PillButton variant="secondary" onClick={() => p.act((s, t) => skipStep(s, t))}>Skip</PillButton>
          <PillButton className="min-h-[56px] flex-1 text-lg" onClick={() => p.act((s, t) => startFinisher(s, t))}>Start finisher</PillButton>
        </ActionBar>
      </>
    );
  }

  const remTotal = remainingOf(timer, p.now);
  if (step.type === 'interval') {
    const ph = intervalPhase(elapsedOf(timer, p.now), step.workSec, step.restSec, names.length);
    const phaseTotal = (ph.phase === 'work' ? step.workSec : step.restSec) * 1000;
    const shown = ph.phase === 'work' ? names[ph.exerciseIdx] : names[(ph.exerciseIdx + 1) % names.length];
    return (
      <>
        <p className={`mt-6 text-xs font-bold uppercase tracking-wide ${ph.phase === 'work' ? 'text-accent' : 'text-rest'}`}>
          Finisher · {formatClock(remTotal)} left
        </p>
        <div className="mt-3">
          <CountdownRing fraction={ph.phaseRemainingMs / phaseTotal} size={260} color={ph.phase === 'work' ? 'var(--accent)' : 'var(--rest)'} label={ph.phase === 'work' ? 'Work interval' : 'Rest interval'}>
            <span className="text-sm font-extrabold uppercase tracking-wide" data-testid="phase">{ph.phase === 'work' ? 'Work' : 'Rest'}</span>
            <span className="num text-7xl" data-testid="phase-seconds">{secs(ph.phaseRemainingMs)}</span>
          </CountdownRing>
        </div>
        <h1 className="mt-5 text-center text-3xl font-extrabold tracking-tight">
          {ph.phase === 'work' ? shown : <span className="text-muted">Next: {shown}</span>}
        </h1>
        <ActionBar>
          <PillButton variant="secondary" className="flex-1" onClick={() => p.act((s, t) => skipStep(s, t))}>Finish early</PillButton>
        </ActionBar>
      </>
    );
  }

  return (
    <>
      <p className="mt-6 text-xs font-bold uppercase tracking-wide text-accent">Finisher · AMRAP</p>
      <div className="mt-3">
        <CountdownRing fraction={remTotal / totalMs} size={240} label="Finisher time left">
          <span className="num text-6xl" data-testid="amrap-time">{formatClock(remTotal)}</span>
          <span className="text-sm text-muted">left</span>
        </CountdownRing>
      </div>
      <p className="mt-5 text-center text-muted">Each round: {names.join(' + ')}</p>
      <p className="mt-2 text-center">
        <span className="num text-6xl" data-testid="rounds">{p.flow.rounds}</span>
        <span className="ml-2 text-lg font-semibold text-muted">{p.flow.rounds === 1 ? 'round' : 'rounds'}</span>
      </p>
      <ActionBar>
        <PillButton variant="secondary" onClick={() => p.act((s, t) => skipStep(s, t))}>Finish</PillButton>
        <PillButton className="min-h-[56px] flex-1 text-lg" onClick={() => p.act((s) => addRound(s))}>Add round</PillButton>
      </ActionBar>
    </>
  );
}
