'use client';
import Link from 'next/link';
import type { Exercise, Workout } from '@/data/types';
import { FINISHER_ID, type BuiltSession, type Intensity } from '@/engine/session';
import { exerciseDetail } from '@/lib/labels';
import { PillButton } from '@/components/ui/PillButton';
import { Toggle } from '@/components/ui/Toggle';

export interface ReadyViewProps {
  workout: Workout;
  built: BuiltSession;
  exercises: Map<string, Exercise>;
  intensity: Intensity;
  short: boolean;
  warmup: boolean;
  cooldown: boolean;
  onWarmup: (v: boolean) => void;
  onCooldown: (v: boolean) => void;
  onStart: () => void;
}

export function ReadyView(p: ReadyViewProps) {
  const mobility = p.workout.kind === 'mobility';
  const perExtra = mobility ? 0 : p.short ? 2.5 : 5; // minutes each for warm-up and cooldown (already in estMin)
  const est = Math.round(p.built.estMin - (p.warmup ? 0 : perExtra) - (p.cooldown ? 0 : perExtra));
  const items = p.built.itemIds.map((id) => {
    if (id === FINISHER_ID && p.built.finisher) {
      const f = p.built.finisher;
      return { id, name: 'Metabolic finisher', detail: `${f.minutes} min ${f.type === 'amrap' ? 'AMRAP' : 'work / rest intervals'}` };
    }
    const d = exerciseDetail(id, p.built.blocks, p.exercises);
    return { id, name: d.name, detail: d.detail };
  });

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col px-4"
      style={{ paddingTop: 'calc(var(--safe-top) + 12px)', paddingBottom: 'calc(var(--safe-bottom) + 112px)' }}
    >
      <Link href="/today/" className="press -ml-2 inline-flex min-h-tap items-center self-start rounded-full px-3 text-sm font-bold text-muted">
        ← Today
      </Link>
      <p className="mt-4 text-sm font-medium text-muted">Guided workout</p>
      <h1 className="text-4xl font-extrabold tracking-tight">{p.workout.name}</h1>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="num text-5xl" data-testid="ready-est">{est}</span>
        <span className="text-lg font-semibold text-muted">min · {items.length} {items.length === 1 ? 'item' : 'exercises'}</span>
      </p>
      {(p.intensity !== 'normal' || p.short) && (
        <div className="mt-3 flex gap-2">
          {p.intensity !== 'normal' && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold capitalize">{p.intensity}</span>}
          {p.short && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Short</span>}
        </div>
      )}

      {!mobility && (
        <div className="mt-6 space-y-2">
          <Toggle label="Warm-up" hint="About 2–3 min of movement prep" checked={p.warmup} onChange={p.onWarmup} />
          <Toggle label="Cooldown" hint="Stretch the muscles you just worked" checked={p.cooldown} onChange={p.onCooldown} />
        </div>
      )}

      <h2 className="mt-8 text-lg font-extrabold">Today&apos;s exercises</h2>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="rounded-card border border-hair bg-card px-4 py-3">
            <p className="font-semibold">{it.name}</p>
            <p className="text-sm text-muted">{it.detail}</p>
          </li>
        ))}
      </ul>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-bg px-4 pt-3"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}
      >
        <div className="mx-auto max-w-md">
          <PillButton className="min-h-[56px] w-full text-lg" onClick={p.onStart}>Let&apos;s go</PillButton>
        </div>
      </div>
    </div>
  );
}
