'use client';
import { useState } from 'react';
import { getRepos } from '@/data';
import type { BodyweightEntry } from '@/data/types';
import { bodyweightTrend } from '@/engine/stats';
import { fmtWeight, toKg, weightUnit, weightValue, type Units } from '@/engine/units';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PillButton } from '@/components/ui/PillButton';
import { Stepper } from '@/components/ui/Stepper';
import { LineChart } from './charts';
import { Card, Empty, shortDate } from './shared';

export function BodyweightCard({ entries, today, units }: { entries: BodyweightEntry[]; today: string; units: Units }) {
  const [open, setOpen] = useState(false);
  const t = bodyweightTrend(entries);
  const wu = weightUnit(units);
  const start = t.latest ? weightValue(t.latest.kg, units) : units === 'imperial' ? 154 : 70;
  const [val, setVal] = useState(start);

  async function save() {
    await getRepos().bodyweight.put({ date: today, kg: Number(toKg(val, units).toFixed(1)) });
    setOpen(false);
  }

  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const trendWord = t.change === null ? null : t.change === 0 ? 'No change vs last week' : `${t.change < 0 ? 'Down' : 'Up'} ${fmtWeight(Math.abs(t.change), units)} vs last week`;

  return (
    <Card
      id="bodyweight-h"
      title="Bodyweight"
      action={
        <button type="button" onClick={() => { setVal(start); setOpen(true); }} className="press -mr-2 min-h-tap px-3 text-sm font-bold text-accent">
          Log weight
        </button>
      }
    >
      {t.latest ? (
        <>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="num text-4xl" data-testid="bw-latest">{fmtWeight(t.latest.kg, units)}</span>
            <span className="text-sm text-muted">{shortDate(t.latest.date)}</span>
          </p>
          {trendWord && <p className="text-sm text-muted" data-testid="bw-change">{trendWord}</p>}
          <div className="mt-3">
            <LineChart
              points={t.weeks.map((w) => ({ label: shortDate(w.weekStart), value: Number(weightValue(w.avg, units).toFixed(1)) }))}
              format={(v) => `${v} ${wu}`}
              label="Weekly average bodyweight"
              height={130}
              testId="bw-chart"
            />
          </div>
          <p className="text-xs text-muted">Weekly averages smooth out daily swings.</p>
        </>
      ) : (
        <Empty>Optional. Log your weight now and then to see the weekly trend.</Empty>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Log weight">
        <Stepper label="Weight" value={val} step={units === 'imperial' ? 0.2 : 0.1} min={20} max={400} format={(v) => `${v.toFixed(1)} ${wu}`} onChange={setVal} testId="bw-value" />
        <PillButton className="mt-4 w-full" onClick={save}>Save</PillButton>
        {recent.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {recent.map((e) => (
              <li key={e.date} className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl bg-card-2 pl-3">
                <span className="text-sm"><span className="font-semibold">{fmtWeight(e.kg, units)}</span> <span className="text-muted">· {shortDate(e.date)}</span></span>
                <button type="button" aria-label={`Remove ${e.date}`} onClick={() => void getRepos().bodyweight.remove(e.date)} className="press min-h-tap min-w-tap px-3 text-sm font-semibold text-muted">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </Card>
  );
}
