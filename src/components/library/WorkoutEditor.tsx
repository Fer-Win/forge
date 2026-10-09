'use client';
import { useState } from 'react';
import type { Exercise, Workout, WorkoutBlock } from '@/data/types';
import { buildSession } from '@/engine/session';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PillButton } from '@/components/ui/PillButton';
import { Segmented } from '@/components/ui/Segmented';
import { Field, inputCls, MiniStepper } from './fields';

type Kind = 'strength' | 'circuit' | 'mobility';

function blockText(b: WorkoutBlock, names: Map<string, string>): string {
  const n = b.exerciseIds.map((id) => names.get(id) ?? id).join(' + ');
  const amount = b.durationSec ? `${b.durationSec}s` : `${b.repMin ?? '?'}–${b.repMax ?? '?'}`;
  return `${n} · ${b.sets} × ${amount}`;
}
export { blockText };

function fromExercise(e: Exercise, partner: string | null): WorkoutBlock {
  return {
    exerciseIds: partner ? [e.id, partner] : [e.id],
    sets: e.sets,
    repMin: e.repMin,
    repMax: e.repMax,
    durationSec: e.durationSec,
    restSec: e.restSec,
  };
}

/** `initial` null = new workout. An initial with an empty id is a copy and gets a fresh custom id on save. */
export function WorkoutEditor({
  open, initial, exercises, onClose, onSave,
}: { open: boolean; initial: Workout | null; exercises: Exercise[]; onClose: () => void; onSave: (w: Workout) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<Kind>(initial && initial.kind !== 'run' ? initial.kind : 'strength');
  const [blocks, setBlocks] = useState<WorkoutBlock[]>(initial?.blocks ?? []);
  const [sub, setSub] = useState<{ index: number; block: WorkoutBlock } | null>(null);

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name));
  const valid = name.trim().length > 0 && blocks.length > 0;

  function save() {
    if (!valid) return;
    const muscles = [...new Set(blocks.flatMap((b) => b.exerciseIds.flatMap((id) => byId.get(id)?.muscles ?? [])))];
    const w: Workout = {
      id: initial && initial.id ? initial.id : `custom-w-${Date.now()}`,
      name: name.trim(),
      kind,
      muscles,
      blocks,
      finisher: initial?.finisher,
      estMin: 0,
      hard: kind === 'strength',
      isCustom: true,
    };
    w.estMin = buildSession(w, { short: false, intensity: 'normal' }).estMin;
    onSave(w);
  }

  if (sub) {
    const b = sub.block;
    const first = byId.get(b.exerciseIds[0] ?? '');
    const partner = b.exerciseIds[1] ?? '';
    const timed = !!b.durationSec;
    const setBlock = (patch: Partial<WorkoutBlock>) => setSub({ index: sub.index, block: { ...b, ...patch } });
    const pick = (id: string, p: string) => {
      const e = byId.get(id);
      if (e) setSub({ index: sub.index, block: fromExercise(e, p || null) });
    };
    return (
      <BottomSheet open={open} onClose={onClose} title={sub.index < 0 ? 'Add block' : 'Edit block'}>
        <div className="space-y-3 pb-2">
          <Field label="Exercise">
            <select aria-label="Exercise" className={inputCls} value={first?.id ?? ''} onChange={(e) => pick(e.target.value, partner)}>
              {sorted.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Superset with (optional)">
            <select className={inputCls} value={partner} onChange={(e) => pick(first?.id ?? '', e.target.value)} aria-label="Superset partner">
              <option value="">None</option>
              {sorted.filter((e) => e.id !== first?.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <MiniStepper label="Sets" value={b.sets} min={1} max={10} onChange={(v) => setBlock({ sets: v })} />
            <MiniStepper label="Rest" value={b.restSec} min={0} max={180} step={15} suffix="s" onChange={(v) => setBlock({ restSec: v })} />
            {timed ? (
              <MiniStepper label="Hold" value={b.durationSec ?? 30} min={10} max={180} step={5} suffix="s" onChange={(v) => setBlock({ durationSec: v })} />
            ) : (
              <>
                <MiniStepper label="Min reps" value={b.repMin ?? 8} min={1} max={60} onChange={(v) => setBlock({ repMin: v, repMax: Math.max(v, b.repMax ?? v) })} />
                <MiniStepper label="Max reps" value={b.repMax ?? 12} min={1} max={60} onChange={(v) => setBlock({ repMax: v, repMin: Math.min(v, b.repMin ?? v) })} />
              </>
            )}
          </div>
          <PillButton
            className="w-full"
            disabled={!first}
            onClick={() => {
              setBlocks(sub.index < 0 ? [...blocks, b] : blocks.map((x, i) => (i === sub.index ? b : x)));
              setSub(null);
            }}
          >
            Save block
          </PillButton>
          <PillButton variant="ghost" className="w-full" onClick={() => setSub(null)}>Back</PillButton>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={initial && initial.id ? 'Edit workout' : 'New workout'}>
      <div className="space-y-3 pb-2">
        <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arms + abs" maxLength={40} /></Field>
        <Segmented<Kind> label="Workout type" value={kind} onChange={setKind} options={[{ value: 'strength', label: 'Strength' }, { value: 'circuit', label: 'Circuit' }, { value: 'mobility', label: 'Mobility' }]} />

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Blocks</p>
          {blocks.length === 0 && <p className="rounded-2xl bg-card-2 p-3 text-sm text-muted">No blocks yet. Add at least one exercise.</p>}
          <ul className="space-y-1.5">
            {blocks.map((b, i) => (
              <li key={i} className="flex items-center gap-1 rounded-2xl bg-card-2 pl-3">
                <button type="button" className="press min-h-[56px] min-w-0 flex-1 text-left text-sm font-semibold" onClick={() => setSub({ index: i, block: b })} aria-label={`Edit block ${i + 1}: ${blockText(b, names)}`}>
                  <span className="block truncate">{blockText(b, names)}</span>
                </button>
                <button type="button" className="press min-h-tap min-w-tap px-3 text-sm font-semibold text-muted" aria-label={`Remove block ${i + 1}`} onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <PillButton
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => {
              const e = sorted[0];
              if (e) setSub({ index: -1, block: fromExercise(e, null) });
            }}
          >
            Add block
          </PillButton>
        </div>

        <PillButton className="w-full" disabled={!valid} onClick={save}>Save workout</PillButton>
      </div>
    </BottomSheet>
  );
}
