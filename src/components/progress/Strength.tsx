'use client';
import { useMemo, useState } from 'react';
import type { Exercise, Session } from '@/data/types';
import { overloadSuggestion } from '@/engine/overload';
import { allPRs, exerciseSeries, exercisesWithHistory } from '@/engine/stats';
import { fmtWeight, weightUnit, weightValue, type Units } from '@/engine/units';
import { Segmented } from '@/components/ui/Segmented';
import { LineChart } from './charts';
import { Card, Empty, shortDate, Stat } from './shared';


type Metric = 'weight' | 'reps' | 'volume' | 'hold';

export function StrengthCard({
  sessions, exercises, units,
}: { sessions: Session[]; exercises: Map<string, Exercise>; units: Units }) {
  const history = useMemo(() => exercisesWithHistory(sessions), [sessions]);
  const prs = useMemo(() => allPRs(sessions), [sessions]);
  const [picked, setPicked] = useState<string | null>(null);
  const [metricPick, setMetricPick] = useState<Metric>('weight');

  const name = (id: string) => exercises.get(id)?.name ?? id;

  if (history.length === 0) {
    return (
      <Card id="strength-h" title="Strength">
        <Empty>Finish a guided workout and your weight, reps and volume charts will appear here, with personal records flagged automatically.</Empty>
      </Card>
    );
  }

  const id = picked && history.some((h) => h.exerciseId === picked) ? picked : history[0]!.exerciseId;
  const series = exerciseSeries(sessions, id);
  const weighted = series.some((p) => p.maxWeight > 0);
  const holdOnly = series.some((p) => p.maxHold > 0) && !series.some((p) => p.bestReps > 0);
  const options: { value: Metric; label: string }[] = holdOnly
    ? [{ value: 'hold', label: 'Hold' }]
    : weighted
      ? [{ value: 'weight', label: 'Weight' }, { value: 'reps', label: 'Reps' }, { value: 'volume', label: 'Volume' }]
      : [{ value: 'reps', label: 'Reps' }];
  const metric = options.some((o) => o.value === metricPick) ? metricPick : options[0]!.value;

  const wu = weightUnit(units);
  const value = (p: (typeof series)[number]): number =>
    metric === 'weight' ? weightValue(p.maxWeight, units)
    : metric === 'volume' ? Math.round(weightValue(p.volume, units))
    : metric === 'hold' ? p.maxHold
    : p.bestReps;
  const fmt = (v: number) => (metric === 'weight' || metric === 'volume' ? `${v} ${wu}` : metric === 'hold' ? `${v}s` : `${v}`);
  const points = series.map((p) => ({ label: shortDate(p.date), value: value(p) }));

  const ex = exercises.get(id);
  const suggestion =
    ex && ex.mode === 'reps' && ex.repMax
      ? overloadSuggestion({ exercise: ex, repMax: ex.repMax, sets: ex.sets, sessions: sessions.filter((s) => s.sets.some((l) => l.exerciseId === id)) })
      : null;

  const best = Math.max(...points.map((p) => p.value));
  const exPrs = prs.filter((r) => r.pr.exerciseId === id);
  const recent = [...prs].reverse().slice(0, 5);

  const prText = (k: string, v: number) =>
    k === 'weight' ? fmtWeight(v, units) : k === 'volume' ? `${fmtWeight(v, units)} set` : k === 'hold' ? `${v}s hold` : `${v} reps`;

  return (
    <Card id="strength-h" title="Strength">
      <label className="mt-3 block">
        <span className="sr-only">Exercise</span>
        <select
          value={id}
          onChange={(e) => setPicked(e.target.value)}
          className="min-h-tap w-full rounded-2xl border border-hair bg-card-2 px-4 text-base font-semibold text-fg"
          data-testid="exercise-picker"
        >
          {history.map((h) => (
            <option key={h.exerciseId} value={h.exerciseId}>{name(h.exerciseId)} ({h.sessions})</option>
          ))}
        </select>
      </label>

      {options.length > 1 && (
        <div className="mt-3">
          <Segmented<Metric> label="Chart metric" options={options} value={metric} onChange={setMetricPick} />
        </div>
      )}

      <div className="mt-4">
        <LineChart points={points} format={fmt} label={`${name(id)} ${metric} per session`} testId="strength-chart" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Best" value={fmt(best)} />
        <Stat label="Sessions" value={String(series.length)} />
        <Stat label="PRs" value={String(exPrs.length)} testId="exercise-prs" />
      </div>

      {suggestion && (
        <div className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 p-3" data-testid="overload">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">Ready to progress</p>
          <p className="mt-0.5 font-bold">{suggestion.title}</p>
          <p className="text-sm text-muted">{suggestion.detail}</p>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Recent personal records</h3>
          <ul className="mt-2 space-y-1.5" data-testid="pr-list">
            {recent.map((r, i) => (
              <li key={i} className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl bg-card-2 px-3">
                <span className="min-w-0 truncate font-semibold">{name(r.pr.exerciseId)}</span>
                <span className="shrink-0 text-right text-sm"><span className="num text-accent">{prText(r.pr.kind, r.pr.value)}</span> <span className="text-muted">· {shortDate(r.date)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
