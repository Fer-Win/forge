'use client';
import { useState } from 'react';
import type { Exercise, Session } from '@/data/types';
import { activeMs, mainLogs, type FlowState } from '@/engine/flow';
import { prLabel, type PR } from '@/engine/pr';
import { formatClock } from '@/engine/timer';
import { Confetti } from '@/components/ui/Confetti';
import { PillButton } from '@/components/ui/PillButton';

export interface CompleteViewProps {
  workoutName: string;
  date: string;
  flow: FlowState;
  session: Session;
  prs: PR[];
  exercises: Map<string, Exercise>;
}

export function CompleteView({ workoutName, date, flow, session, prs, exercises }: CompleteViewProps) {
  const [note, setNote] = useState('');
  const duration = activeMs(flow, flow.endedAt ?? Date.now());
  const sets = mainLogs(flow.logs).length;
  const volume = session.totalVolume;
  const early = flow.endedEarly;
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const volumeLabel = volume > 0 ? `${volume.toLocaleString()} kg` : '—';
  const name = (id: string) => exercises.get(id)?.name ?? id;

  const summary =
    `Forge · ${workoutName} · ${formatClock(duration)} · ${sets} sets` +
    (volume > 0 ? ` · ${volume.toLocaleString()} kg total` : '') +
    (prs.length ? ` · ${prs.length} PR${prs.length > 1 ? 's' : ''}` : '');

  async function share() {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Forge workout', text: summary });
        return;
      }
      await navigator.clipboard.writeText(summary);
      setNote('Copied to clipboard');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setNote('Sharing is not available here');
    }
  }

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col px-4"
      style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 'calc(var(--safe-bottom) + 120px)' }}
    >
      {!early && <Confetti />}
      <p className="text-sm font-medium text-muted">{dateLabel}</p>
      <h1 className="text-3xl font-extrabold tracking-tight">{early ? 'Session saved' : 'Workout complete'}</h1>
      {early && <p className="mt-1 text-muted">Partial sessions still count toward your week.</p>}

      <section
        className="mt-6 rounded-[24px] border border-hair p-6"
        style={{ background: 'linear-gradient(160deg, #1F1F29 0%, #16161D 55%, rgba(252,76,2,0.22) 140%)' }}
        aria-label="Workout summary"
        data-testid="summary-card"
      >
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-accent">Forge</p>
        <p className="mt-1 text-lg font-bold">{workoutName}</p>
        <p className="mt-6 text-xs font-bold uppercase tracking-wide text-muted">Duration</p>
        <p className="num text-7xl" data-testid="duration">{formatClock(duration)}</p>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Volume</dt>
            <dd className="num text-2xl" data-testid="volume">{volumeLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Sets</dt>
            <dd className="num text-2xl" data-testid="sets">{sets}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">PRs</dt>
            <dd className="num text-2xl" data-testid="pr-count">{prs.length}</dd>
          </div>
        </dl>
      </section>

      {prs.length > 0 && (
        <section className="mt-6" aria-labelledby="pr-h">
          <h2 id="pr-h" className="text-lg font-extrabold">Personal records</h2>
          <ul className="mt-3 space-y-2">
            {prs.map((pr) => (
              <li key={pr.exerciseId} className="flex items-center gap-3 rounded-card border border-hair bg-card px-4 py-3">
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-extrabold text-white">PR</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{name(pr.exerciseId)}</p>
                  <p className="text-sm text-muted">{prLabel(pr)} · was {pr.previous}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-bg px-4 pt-3"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}
      >
        <div className="mx-auto max-w-md">
          <p className="mb-2 text-center text-sm text-muted" role="status">{note}</p>
          <div className="flex gap-3">
            <PillButton variant="secondary" onClick={() => void share()}>Share</PillButton>
            <PillButton href="/today/" className="min-h-[56px] flex-1 text-lg">Done</PillButton>
          </div>
        </div>
      </div>
    </div>
  );
}
