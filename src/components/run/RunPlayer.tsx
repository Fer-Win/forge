'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRepos } from '@/data';
import type { RunLog, RunType, Settings } from '@/data/types';
import { addSample, emptyTrack, fmtDuration, fmtKm, fmtPace, paceOf, recentPace, type GeoSample, type Track } from '@/engine/geo';
import {
  actualMs, pauseRun, planElapsed, positionOf, restoreRun, resumeRun, skipSegment, startRun, stopRun, totalMs,
} from '@/engine/runFlow';
import { buildRun, programWeek, type RunGoal } from '@/engine/runPlan';
import { formatClock } from '@/engine/timer';
import { announce, useRun } from '@/hooks/useRun';
import { patchSettings } from '@/lib/actions';
import { toDateStr } from '@/lib/dates';
import { unlockAudio } from '@/services/audio';
import { useGeolocation } from '@/services/geo';
import { speak } from '@/services/speech';
import { useWakeLock } from '@/services/wakeLock';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PillButton } from '@/components/ui/PillButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stepper } from '@/components/ui/Stepper';
import { Toggle } from '@/components/ui/Toggle';
import { RouteMap, SegmentBar } from './parts';

interface Loaded { settings: Settings; week: number; goal: RunGoal }

const KIND_LABEL: Record<string, string> = {
  warmup: 'Warm-up', work: 'Hard', recovery: 'Easy', cooldown: 'Cooldown', steady: 'Steady',
};
const KIND_COLOR: Record<string, string> = {
  warmup: 'text-muted', cooldown: 'text-muted', steady: 'text-fg', recovery: 'text-rest', work: 'text-accent',
};

export function RunPlayer({ type }: { type: RunType }) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [track, setTrack] = useState<Track>(emptyTrack());
  const [endOpen, setEndOpen] = useState(false);
  const [effort, setEffort] = useState(6);
  const [notes, setNotes] = useState('');
  const [manualKm, setManualKm] = useState(0);
  const [saving, setSaving] = useState(false);
  const date = useMemo(() => toDateStr(), []);

  const settings = data?.settings;
  const feedback = useMemo(
    () => ({ sound: settings?.sound ?? true, haptics: settings?.haptics ?? true, speech: settings?.speech ?? false }),
    [settings?.sound, settings?.haptics, settings?.speech],
  );
  const { run, now, act, start } = useRun(feedback);
  const live = run !== null && run.endedAt === null;
  const livePaused = live && run.pausedAt !== null;
  const liveRef = useRef(false);
  useEffect(() => {
    liveRef.current = live && !livePaused;
  }, [live, livePaused]);

  useWakeLock(live);

  const gpsWanted = settings?.gps !== false;
  const onSample = useCallback((s: GeoSample) => {
    if (liveRef.current) setTrack((t) => addSample(t, s));
  }, []);
  const gps = useGeolocation(live && gpsWanted, onSample);

  // Load settings and programme, and resume an interrupted run of the same type.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = getRepos();
      const [st, program, active] = await Promise.all([r.settings.get(), r.runs.program(), r.activeRun.get()]);
      if (!alive || !st) return;
      const startDate = program?.startDate ?? st.startDate;
      setData({ settings: st, week: programWeek(startDate, toDateStr()), goal: program?.goal ?? 'none' });
      const restored = active && active.type === type ? restoreRun(active.state) : null;
      if (restored) {
        start(restored);
        const t = active?.track as Track | undefined;
        if (t && Array.isArray(t.points)) setTrack(t);
      }
    })();
    return () => { alive = false; };
  }, [type, start]);

  const spec = useMemo(() => (data ? buildRun(type, data.week, data.goal) : null), [data, type]);

  // Crash recovery: the state on every change, plus the GPS track every 5 s while running.
  const trackRef = useRef(track);
  useEffect(() => {
    trackRef.current = track;
  }, [track]);
  useEffect(() => {
    if (!run) return;
    const put = () => void getRepos().activeRun.put({ id: 'active', date, type, updatedAt: Date.now(), state: run, track: trackRef.current });
    put();
    if (run.endedAt !== null) return;
    const id = setInterval(put, 5000);
    return () => clearInterval(id);
  }, [run, date, type]);

  if (!data || !spec) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4" style={{ paddingTop: 'calc(var(--safe-top) + 24px)' }}>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-6 h-40" />
      </main>
    );
  }

  const pad = { paddingTop: 'calc(var(--safe-top) + 12px)', paddingBottom: 'calc(var(--safe-bottom) + 132px)' };
  const shell = 'mx-auto flex min-h-dvh max-w-md flex-col px-4';

  // ------------------------------------------------------------ ready
  if (!run) {
    return (
      <div className={shell} style={pad}>
        <Link href="/run/" className="press -ml-2 inline-flex min-h-tap items-center self-start rounded-full px-3 text-sm font-bold text-muted">← Run</Link>
        <p className="mt-4 text-sm font-medium text-muted">{spec.light ? 'Lighter week' : 'Ready'}</p>
        <h1 className="text-4xl font-extrabold tracking-tight">{spec.title}</h1>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="num text-5xl">{Math.round(spec.totalSec / 60)}</span>
          <span className="text-lg font-semibold text-muted">min</span>
        </p>
        <p className="mt-2 text-muted">{spec.summary}</p>
        <div className="mt-4"><SegmentBar segments={spec.segments} /></div>
        <div className="mt-6 space-y-2">
          <Toggle label="Voice cues" hint="Speaks each change of segment" checked={settings?.speech ?? false} onChange={(v) => { setData({ ...data, settings: { ...data.settings, speech: v } }); void patchSettings({ speech: v }); }} />
          <Toggle label="GPS tracking" hint="Distance, pace and route. Keep Chrome open in the foreground." checked={gpsWanted} onChange={(v) => { setData({ ...data, settings: { ...data.settings, gps: v } }); void patchSettings({ gps: v }); }} />
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-bg px-4 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}>
          <div className="mx-auto max-w-md">
            <PillButton
              className="min-h-[56px] w-full text-lg"
              onClick={() => {
                unlockAudio();
                const first = spec.segments[0]!;
                if (settings?.speech) speak(announce(first.label, first.kind, first.durSec));
                setTrack(emptyTrack());
                start(startRun(spec.segments, Date.now()));
              }}
            >
              Start run
            </PillButton>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ summary
  if (run.endedAt !== null) {
    const durSec = Math.round(actualMs(run, run.endedAt) / 1000);
    const hasGps = track.points.length >= 2;
    const distanceM = hasGps ? track.distanceM : manualKm * 1000;
    const avg = paceOf(distanceM, durSec * 1000);
    const save = async () => {
      if (saving) return;
      setSaving(true);
      const r = getRepos();
      const log: RunLog = {
        id: `run-${run.startedAt}`, date, type, durationSec: durSec, distanceM: Math.round(distanceM),
        avgPaceSecPerKm: avg ? Math.round(avg) : 0, effort, notes: notes.trim() || undefined,
        route: hasGps ? track.points.map((p) => ({ lat: p.lat, lng: p.lng, t: p.t })) : undefined,
        source: hasGps ? 'gps' : 'manual',
      };
      await r.runs.add(log);
      await r.activeRun.clear();
      router.replace('/run/');
    };
    return (
      <div className={shell} style={pad}>
        <p className="text-sm font-medium text-muted">{run.stoppedEarly ? 'Run ended early' : 'Run complete'}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{spec.title}</h1>
        <section className="mt-5 rounded-[24px] border border-hair bg-card p-6" aria-label="Run summary">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Time</p>
          <p className="num text-7xl" data-testid="summary-time">{fmtDuration(durSec)}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">Distance</dt>
              <dd className="num text-3xl" data-testid="summary-distance">{distanceM > 0 ? `${fmtKm(distanceM)} km` : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">Avg pace</dt>
              <dd className="num text-3xl" data-testid="summary-pace">{avg ? `${fmtPace(avg)} /km` : '—'}</dd>
            </div>
          </dl>
        </section>
        {hasGps && <div className="mt-4"><RouteMap points={track.points} /></div>}
        <div className="mt-4 space-y-3">
          {!hasGps && (
            <Stepper label="Distance (optional)" value={manualKm} step={0.1} min={0} max={100} format={(v) => `${v.toFixed(1)} km`} onChange={setManualKm} testId="summary-km-input" />
          )}
          <Stepper label="Effort (1–10)" value={effort} step={1} min={1} max={10} onChange={setEffort} testId="effort-value" />
          <label className="block">
            <span className="text-sm font-medium text-muted">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 block w-full rounded-2xl border border-hair bg-card px-4 py-3 text-fg" />
          </label>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-bg px-4 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}>
          <div className="mx-auto flex max-w-md gap-3">
            <PillButton variant="secondary" onClick={() => { void getRepos().activeRun.clear().then(() => router.replace('/run/')); }}>Discard</PillButton>
            <PillButton className="min-h-[56px] flex-1 text-lg" disabled={saving} onClick={() => void save()}>Save run</PillButton>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ active
  const pos = positionOf(run, now);
  const total = totalMs(run.segments);
  const planned = planElapsed(run, now);
  const actual = actualMs(run, now);
  const segFrac = pos.segment.durSec > 0 ? pos.elapsedMs / (pos.segment.durSec * 1000) : 0;
  const kind = pos.segment.kind;
  const pace = recentPace(track);
  const multi = run.segments.length > 1;
  const gpsText =
    !gpsWanted ? null
    : gps === 'denied' ? 'GPS blocked. Allow location in Chrome site settings.'
    : gps === 'unavailable' ? 'GPS unavailable on this device.'
    : gps === 'locating' ? 'Finding GPS…'
    : gps === 'tracking' ? 'GPS on' : null;

  return (
    <div className={shell} style={pad}>
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setEndOpen(true)} aria-label="End run" className="press flex h-12 w-12 items-center justify-center rounded-full border border-hair bg-card text-xl">✕</button>
        <p className="text-sm font-bold text-muted" data-testid="plan-progress">{formatClock(total - planned)} left</p>
        <button type="button" onClick={() => act((s, t) => pauseRun(s, t))} aria-label="Pause run" className="press flex h-12 w-12 items-center justify-center rounded-full border border-hair bg-card">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><rect x="3" y="2" width="4" height="14" rx="1.5" fill="currentColor" /><rect x="11" y="2" width="4" height="14" rx="1.5" fill="currentColor" /></svg>
        </button>
      </header>
      <div className="mt-3"><SegmentBar segments={run.segments} activeIndex={pos.index} /></div>

      <p className={`mt-6 text-xl font-extrabold uppercase tracking-wide ${KIND_COLOR[kind]}`} data-testid="segment-label">
        {kind === 'steady' ? pos.segment.label : kind === 'work' ? pos.segment.label : KIND_LABEL[kind]}
      </p>
      <p className="num text-[96px] leading-none" data-testid="segment-time" aria-label="Segment time left">{formatClock(pos.remainingMs)}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Segment progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(segFrac * 100)}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${segFrac * 100}%`, transition: 'width 250ms linear' }} />
      </div>

      <div className="mt-5 rounded-card border border-hair bg-card p-4" data-testid="next-segment">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Next</p>
        <p className="mt-1 text-lg font-bold">
          {pos.next ? `${pos.next.label} · ${fmtDuration(pos.next.durSec)}` : 'Last segment. Finish strong.'}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-card border border-hair bg-card p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-muted">Elapsed</dt>
          <dd className="num text-2xl" data-testid="elapsed">{fmtDuration(Math.floor(actual / 1000))}</dd>
        </div>
        <div className="rounded-card border border-hair bg-card p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-muted">Distance</dt>
          <dd className="num text-2xl" data-testid="distance">{gpsWanted ? fmtKm(track.distanceM) : '—'}</dd>
        </div>
        <div className="rounded-card border border-hair bg-card p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-muted">Pace</dt>
          <dd className="num text-2xl" data-testid="pace">{gpsWanted ? fmtPace(pace) : '—'}</dd>
        </div>
      </dl>
      {gpsText && <p className="mt-3 text-sm text-muted" role="status" data-testid="gps-status">{gpsText}</p>}
      {track.points.length >= 2 && <div className="mt-3"><RouteMap points={track.points} height={130} /></div>}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-bg px-4 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}>
        <div className="mx-auto flex max-w-md items-center gap-3">
          {multi && <PillButton variant="secondary" onClick={() => act((s, t) => skipSegment(s, t))}>Next segment</PillButton>}
          <PillButton className="min-h-[56px] flex-1 text-lg" onClick={() => act((s, t) => pauseRun(s, t))}>Pause</PillButton>
        </div>
      </div>

      <BottomSheet open={livePaused} onClose={() => act((s, t) => resumeRun(s, t))} title="Paused">
        <p className="text-muted">Your run is paused. The clock and distance are stopped.</p>
        <div className="mt-5 grid gap-3 pb-2">
          <PillButton className="min-h-[56px] text-lg" onClick={() => act((s, t) => resumeRun(s, t))}>Resume</PillButton>
          <PillButton variant="secondary" onClick={() => setEndOpen(true)}>End run</PillButton>
        </div>
      </BottomSheet>
      <BottomSheet open={endOpen} onClose={() => setEndOpen(false)} title="End run?">
        <p className="text-muted">You can save what you have done so far.</p>
        <div className="mt-5 grid gap-3 pb-2">
          <PillButton variant="secondary" onClick={() => setEndOpen(false)}>Keep running</PillButton>
          <PillButton onClick={() => { setEndOpen(false); act((s, t) => stopRun(s, t)); }}>End and review</PillButton>
        </div>
      </BottomSheet>
    </div>
  );
}

