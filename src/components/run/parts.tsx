'use client';
import { useState } from 'react';
import type { RunSegment, RunType } from '@/data/types';
import { routePath, type GeoSample } from '@/engine/geo';
import { RUN_TYPES, RUN_TYPE_LABEL } from '@/engine/runPlan';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PillButton } from '@/components/ui/PillButton';
import { Segmented } from '@/components/ui/Segmented';
import { Stepper } from '@/components/ui/Stepper';

const KIND_COLOR: Record<RunSegment['kind'], string> = {
  warmup: 'rgba(255,255,255,0.28)',
  cooldown: 'rgba(255,255,255,0.28)',
  steady: 'rgba(255,255,255,0.45)',
  recovery: 'var(--rest)',
  work: 'var(--accent)',
};

/** Whole-run overview: one block per segment, width proportional to its length. `activeIndex` highlights progress. */
export function SegmentBar({ segments, activeIndex }: { segments: RunSegment[]; activeIndex?: number }) {
  return (
    <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Run structure">
      {segments.map((s, i) => (
        <div
          key={i}
          style={{
            flexGrow: s.durSec, flexBasis: 0, background: KIND_COLOR[s.kind],
            opacity: activeIndex === undefined || i === activeIndex ? 1 : i < activeIndex ? 0.35 : 0.7,
          }}
        />
      ))}
    </div>
  );
}

export function RouteMap({ points, height = 150 }: { points: GeoSample[]; height?: number }) {
  const w = 360;
  const r = routePath(points, w, height, 14);
  if (!r) return null;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full rounded-card border border-hair bg-card" role="img" aria-label="Route" data-testid="route">
      <path d={r.d} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={r.start.x} cy={r.start.y} r="5" fill="var(--done)" />
      <circle cx={r.end.x} cy={r.end.y} r="6" fill="#fff" stroke="var(--accent)" strokeWidth="3" />
    </svg>
  );
}

export interface ManualRun {
  date: string;
  type: RunType;
  durationMin: number;
  distanceKm: number;
  effort: number;
  notes: string;
}

/** Manual entry after a run done without the app. */
export function ManualRunSheet({
  open, onClose, defaultDate, onSave,
}: { open: boolean; onClose: () => void; defaultDate: string; onSave: (r: ManualRun) => void }) {
  const [type, setType] = useState<RunType>('easy');
  const [date, setDate] = useState(defaultDate);
  const [durationMin, setDuration] = useState(30);
  const [distanceKm, setDistance] = useState(5);
  const [effort, setEffort] = useState(5);
  const [notes, setNotes] = useState('');
  return (
    <BottomSheet open={open} onClose={onClose} title="Log a run">
      <div className="space-y-3 pb-2">
        <Segmented<RunType>
          label="Run type" value={type} onChange={setType}
          options={RUN_TYPES.map((t) => ({ value: t, label: RUN_TYPE_LABEL[t] }))}
        />
        <label className="block">
          <span className="text-sm font-medium text-muted">Date</span>
          <input
            type="date" value={date} max={defaultDate} onChange={(e) => setDate(e.target.value || defaultDate)}
            className="mt-1 block min-h-tap w-full rounded-2xl border border-hair bg-card-2 px-4 text-lg font-bold text-fg"
            style={{ colorScheme: 'dark' }}
          />
        </label>
        <Stepper label="Duration" value={durationMin} step={1} min={1} max={400} format={(v) => `${v} min`} onChange={setDuration} testId="manual-duration" />
        <Stepper label="Distance" value={distanceKm} step={0.1} min={0} max={100} format={(v) => `${v.toFixed(1)} km`} onChange={setDistance} testId="manual-distance" />
        <Stepper label="Effort (1–10)" value={effort} step={1} min={1} max={10} onChange={setEffort} testId="manual-effort" />
        <label className="block">
          <span className="text-sm font-medium text-muted">Notes</span>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="mt-1 block w-full rounded-2xl border border-hair bg-card-2 px-4 py-3 text-fg"
          />
        </label>
        <PillButton className="min-h-[56px] w-full text-lg" onClick={() => onSave({ date, type, durationMin, distanceKm, effort, notes })}>
          Save run
        </PillButton>
      </div>
    </BottomSheet>
  );
}
