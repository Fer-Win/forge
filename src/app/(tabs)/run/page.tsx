'use client';
import { useState } from 'react';
import { getRepos } from '@/data';
import type { RunLog, RunType } from '@/data/types';
import { dayPlan } from '@/engine/dayStatus';
import { fmtDuration, paceOf } from '@/engine/geo';
import { buildRun, cyclePos, PROGRAM_WEEKS, programWeek, RUN_TYPE_LABEL, RUN_TYPES, typeForSlot } from '@/engine/runPlan';
import { runATypeForWeek } from '@/engine/schedule';
import { distText, distUnit, fmtDistance, paceLabel } from '@/engine/units';
import { useDayData, useRunProgram, useRuns, useSettings, useToday } from '@/hooks/useData';
import { patchSettings } from '@/lib/actions';
import { runCard } from '@/lib/shareCards';
import { shareCard } from '@/services/shareImage';
import { parseDateStr, startOfWeek } from '@/lib/dates';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PillButton } from '@/components/ui/PillButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toggle } from '@/components/ui/Toggle';
import { ManualRunSheet, SegmentBar, type ManualRun } from '@/components/run/parts';

const dateLabel = (d: string) => parseDateStr(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export default function RunPage() {
  const today = useToday();
  const settings = useSettings();
  const program = useRunProgram();
  const data = useDayData(today);
  const runs = useRuns();
  const [picked, setPicked] = useState<RunType | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<RunLog | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const st = settings?.value;
  if (!today || !data || !st || !runs || !program) {
    return (
      <main>
        <h1 className="text-3xl font-extrabold tracking-tight">Run</h1>
        <Skeleton className="mt-6 h-56" />
        <Skeleton className="mt-4 h-16" />
      </main>
    );
  }

  const startDate = program.value?.startDate ?? st.startDate;
  const goal = program.value?.goal ?? 'none';
  const week = programWeek(startDate, today);
  const runA = runATypeForWeek(startDate, startOfWeek(today));
  const a = dayPlan(today, data).assignment;
  const recommended = typeForSlot(a.type === 'run' ? a.slot : 'A', runA, week);
  const type = picked ?? recommended;
  const spec = buildRun(type, week, goal);
  const gpsOn = st.gps !== false;

  async function shareRun(r: RunLog) {
    try {
      const res = await shareCard(runCard(r, dateLabel(r.date), st!.units), `Forge · ${RUN_TYPE_LABEL[r.type]} run`, `forge-run-${r.date}.png`);
      setShareNote(res === 'saved' ? 'Image saved to your downloads' : null);
    } catch {
      setShareNote('Sharing is not available here');
    }
  }

  async function saveManual(m: ManualRun) {
    const durationSec = m.durationMin * 60;
    const distanceM = Math.round(m.distanceKm * 1000);
    const pace = paceOf(distanceM, durationSec * 1000);
    await getRepos().runs.add({
      id: `run-manual-${Date.now()}`, date: m.date, type: m.type, durationSec, distanceM,
      avgPaceSecPerKm: pace ? Math.round(pace) : 0, effort: m.effort, notes: m.notes.trim() || undefined, source: 'manual',
    });
    setManualOpen(false);
  }

  return (
    <main>
      <ScreenHeader
        title="Run"
        subtitle={`Week ${cyclePos(week) + 1} of ${PROGRAM_WEEKS}${spec.light ? ' · lighter week' : ''}`}
      />

      <div className="mt-5">
        <Segmented<RunType>
          label="Run type" value={type} onChange={setPicked}
          options={RUN_TYPES.map((t) => ({ value: t, label: RUN_TYPE_LABEL[t] }))}
        />
      </div>

      <section className="mt-4 rounded-card border border-hair bg-card p-5" aria-labelledby="run-hero">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">{type === recommended ? 'Recommended this week' : 'Your pick'}</span>
        </div>
        <h2 id="run-hero" className="mt-2 text-4xl font-extrabold tracking-tight">{spec.title}</h2>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="num text-5xl" data-testid="run-total">{Math.round(spec.totalSec / 60)}</span>
          <span className="text-lg font-semibold text-muted">min</span>
        </p>
        <p className="mt-2 text-sm text-muted" data-testid="run-summary">{spec.summary}</p>
        <div className="mt-4"><SegmentBar segments={spec.segments} /></div>
        <p className="mt-4 text-muted">{spec.blurb}</p>
      </section>

      <section className="mt-4 space-y-2" aria-label="Run cues">
        <Toggle label="Voice cues" hint="Speaks each change of segment" checked={st.speech} onChange={(v) => void patchSettings({ speech: v })} />
        <Toggle label="GPS tracking" hint="Distance, pace and route. Keep Chrome open in the foreground." checked={gpsOn} onChange={(v) => void patchSettings({ gps: v })} />
      </section>

      <section className="mt-8" aria-labelledby="runs-h">
        <div className="flex items-center justify-between gap-3">
          <h2 id="runs-h" className="text-lg font-extrabold">Your runs</h2>
          <button type="button" onClick={() => setManualOpen(true)} className="press min-h-tap rounded-full border border-hair bg-card px-4 text-sm font-bold">
            Log a run
          </button>
        </div>
        {runs.length === 0 ? (
          <p className="mt-3 rounded-card border border-hair bg-card p-4 text-muted">No runs yet. Your first one will show up here.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {runs.slice(0, 12).map((r) => (
              <li key={r.id}>
                <button
                  type="button" onClick={() => setSelected(r)}
                  aria-label={`${dateLabel(r.date)}, ${RUN_TYPE_LABEL[r.type]} run`}
                  className="press flex min-h-[64px] w-full items-center justify-between gap-3 rounded-card border border-hair bg-card px-4 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{RUN_TYPE_LABEL[r.type]} · {dateLabel(r.date)}</span>
                    <span className="block text-sm text-muted">
                      {r.distanceM > 0 ? `${fmtDistance(r.distanceM, st.units)} · ` : ''}{fmtDuration(r.durationSec)}
                      {r.avgPaceSecPerKm > 0 ? ` · ${paceLabel(r.avgPaceSecPerKm, st.units)} /${distUnit(st.units)}` : ''}
                    </span>
                  </span>
                  <span className="num shrink-0 text-lg text-muted" aria-label={`Effort ${r.effort} of 10`}>{r.effort}/10</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 12px)' }}>
        <div className="mx-auto max-w-md">
          <PillButton href={`/run/active/?t=${type}`} className="w-full shadow-lg shadow-black/60">Start run</PillButton>
        </div>
      </div>

      <ManualRunSheet key={manualOpen ? 'open' : 'closed'} open={manualOpen} onClose={() => setManualOpen(false)} defaultDate={today} onSave={(m) => void saveManual(m)} />

      <BottomSheet open={selected !== null} onClose={() => setSelected(null)} title={selected ? `${RUN_TYPE_LABEL[selected.type]} · ${dateLabel(selected.date)}` : 'Run'}>
        {selected && (
          <div className="pb-2">
            <dl className="grid grid-cols-3 gap-3">
              <div><dt className="text-xs font-bold uppercase text-muted">Time</dt><dd className="num text-2xl">{fmtDuration(selected.durationSec)}</dd></div>
              <div><dt className="text-xs font-bold uppercase text-muted">Distance</dt><dd className="num text-2xl">{selected.distanceM > 0 ? distText(selected.distanceM, st.units) : '—'}</dd></div>
              <div><dt className="text-xs font-bold uppercase text-muted">Pace</dt><dd className="num text-2xl">{paceLabel(selected.avgPaceSecPerKm || null, st.units)}</dd></div>
            </dl>
            {selected.notes && <p className="mt-4 text-muted">{selected.notes}</p>}
            {shareNote && <p className="mt-3 text-sm text-muted" role="status">{shareNote}</p>}
            <div className="mt-5 grid gap-3">
              <PillButton variant="secondary" onClick={() => void shareRun(selected)}>Share image</PillButton>
              <PillButton variant="secondary" onClick={() => setSelected(null)}>Close</PillButton>
              <PillButton variant="secondary" onClick={() => { const id = selected.id; setSelected(null); void getRepos().runs.remove(id); }}>Delete run</PillButton>
            </div>
          </div>
        )}
      </BottomSheet>
    </main>
  );
}
