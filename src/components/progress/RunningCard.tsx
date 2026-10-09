import type { RunLog } from '@/data/types';
import { fmtDuration, fmtPace } from '@/engine/geo';
import { runStats } from '@/engine/stats';
import { distanceValue, distUnit, fmtDistance, paceSuffix, paceValue, type Units } from '@/engine/units';
import { BarChart, LineChart } from './charts';
import { Card, Empty, shortDate, Stat } from './shared';

export function RunningCard({ runs, today, units }: { runs: RunLog[]; today: string; units: Units }) {
  if (runs.length === 0) {
    return (
      <Card id="running-h" title="Running">
        <Empty>Log or track a run and your weekly distance, pace trend and longest run will show up here.</Empty>
      </Card>
    );
  }
  const s = runStats(runs, today, 8);
  const du = distUnit(units);
  const bars = s.weeklyDistance.map((w) => ({ label: shortDate(w.weekStart), value: Number(distanceValue(w.meters, units).toFixed(1)) }));
  const pace = s.paceTrend.slice(-12).map((p) => ({ label: shortDate(p.date), value: Math.round(paceValue(p.pace, units)) }));
  return (
    <Card id="running-h" title="Running">
      <h3 className="mt-3 text-sm font-semibold">Weekly distance ({du})</h3>
      <div className="mt-1"><BarChart bars={bars} format={(v) => String(v)} label={`Weekly distance in ${du}`} testId="distance-chart" /></div>
      {pace.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold">Average pace ({paceSuffix(units)}) · lower is faster</h3>
          <div className="mt-1"><LineChart points={pace} format={(v) => fmtPace(v)} label="Pace trend" testId="pace-chart" /></div>
        </>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Longest" value={s.longest ? fmtDistance(s.longest.distanceM, units) : '–'} testId="longest-run" />
        <Stat label="Total" value={fmtDistance(s.totals.distanceM, units)} />
        <Stat label="Time" value={fmtDuration(s.totals.durationSec)} />
      </div>
    </Card>
  );
}
