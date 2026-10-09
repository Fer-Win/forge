'use client';
import { useState } from 'react';
import type { Category, Exercise, Load } from '@/data/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PillButton } from '@/components/ui/PillButton';
import { Segmented } from '@/components/ui/Segmented';
import { Field, inputCls, MiniStepper } from './fields';

export const CATEGORIES: Category[] = [
  'Push', 'Pull', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Abs/Core', 'Mobility', 'Warm-up', 'Cooldown', 'Finishers',
];
export const LOADS: { value: Load; label: string }[] = [
  { value: 'BW', label: 'Bodyweight' },
  { value: '5kg', label: '5 kg (one)' },
  { value: '2x5kg', label: '2 × 5 kg' },
  { value: '10kg', label: '10 kg' },
  { value: '10+5kg', label: '10 + 5 kg' },
];

/** `initial` null = new exercise. An initial with an empty id is a copy and gets a fresh custom id on save. */
export function ExerciseEditor({
  open, initial, onClose, onSave,
}: { open: boolean; initial: Exercise | null; onClose: () => void; onSave: (e: Exercise) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Chest');
  const [mode, setMode] = useState<'reps' | 'timed'>(initial?.mode === 'timed' ? 'timed' : 'reps');
  const [load, setLoad] = useState<Load>(initial?.load ?? 'BW');
  const [sets, setSets] = useState(initial?.sets ?? 3);
  const [repMin, setRepMin] = useState(initial?.repMin ?? 8);
  const [repMax, setRepMax] = useState(initial?.repMax ?? 12);
  const [dur, setDur] = useState(initial?.durationSec ?? 30);
  const [rest, setRest] = useState(initial?.restSec ?? 60);
  const [muscles, setMuscles] = useState(initial?.muscles.join(', ') ?? '');
  const [cues, setCues] = useState(initial?.cues.join('\n') ?? '');
  const [easier, setEasier] = useState(initial?.easier ?? '');
  const [harder, setHarder] = useState(initial?.harder ?? '');

  const valid = name.trim().length > 0;

  function save() {
    if (!valid) return;
    const lo = Math.min(repMin, repMax);
    const hi = Math.max(repMin, repMax);
    const e: Exercise = {
      id: initial && initial.id ? initial.id : `custom-${Date.now()}`,
      name: name.trim(),
      category,
      muscles: muscles.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean),
      equipment: load === 'BW' ? 'Bodyweight' : 'Dumbbells',
      mode,
      sets,
      repMin: mode === 'reps' ? lo : undefined,
      repMax: mode === 'reps' ? hi : undefined,
      durationSec: mode === 'timed' ? dur : undefined,
      restSec: rest,
      load,
      cues: cues.split('\n').map((c) => c.trim()).filter(Boolean).slice(0, 3),
      easier: easier.trim(),
      harder: harder.trim(),
      isCustom: true,
    };
    onSave(e);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={initial && initial.id ? 'Edit exercise' : 'New exercise'}>
      <div className="space-y-3 pb-2">
        <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zottman curl" maxLength={60} /></Field>
        <Field label="Category">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Load">
          <select className={inputCls} value={load} onChange={(e) => setLoad(e.target.value as Load)}>
            {LOADS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Field>
        <Segmented<'reps' | 'timed'> label="Exercise type" value={mode} onChange={setMode} options={[{ value: 'reps', label: 'Reps' }, { value: 'timed', label: 'Timed hold' }]} />
        <div className="grid grid-cols-2 gap-2">
          <MiniStepper label="Sets" value={sets} min={1} max={10} onChange={setSets} />
          <MiniStepper label="Rest" value={rest} min={0} max={180} step={15} suffix="s" onChange={setRest} />
          {mode === 'reps' ? (
            <>
              <MiniStepper label="Min reps" value={repMin} min={1} max={60} onChange={setRepMin} />
              <MiniStepper label="Max reps" value={repMax} min={1} max={60} onChange={setRepMax} />
            </>
          ) : (
            <MiniStepper label="Hold" value={dur} min={10} max={180} step={5} suffix="s" onChange={setDur} />
          )}
        </div>
        <Field label="Muscles (comma separated)"><input className={inputCls} value={muscles} onChange={(e) => setMuscles(e.target.value)} placeholder="biceps, forearms" /></Field>
        <Field label="Form cues (one per line, up to 3)">
          <textarea className={`${inputCls} min-h-[96px] py-3`} value={cues} onChange={(e) => setCues(e.target.value)} rows={3} />
        </Field>
        <Field label="Easier version"><input className={inputCls} value={easier} onChange={(e) => setEasier(e.target.value)} /></Field>
        <Field label="Harder version"><input className={inputCls} value={harder} onChange={(e) => setHarder(e.target.value)} /></Field>
        <PillButton className="w-full" disabled={!valid} onClick={save}>Save exercise</PillButton>
      </div>
    </BottomSheet>
  );
}
