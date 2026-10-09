import type { RunLog } from '@/data/types';
import { fmtDuration } from '@/engine/geo';
import { RUN_TYPE_LABEL } from '@/engine/runPlan';
import { distUnit, fmtDistance, paceLabel, type Units } from '@/engine/units';
import type { ShareCard } from '@/services/shareImage';

export function workoutCard(o: {
  name: string; dateLabel: string; duration: string; sets: number; volume: string; prLines: string[];
}): ShareCard {
  return {
    kind: 'Workout',
    title: o.name,
    subtitle: o.dateLabel,
    heroLabel: 'Duration',
    heroValue: o.duration,
    stats: [
      { label: 'Volume', value: o.volume },
      { label: 'Sets', value: String(o.sets) },
      { label: 'PRs', value: String(o.prLines.length) },
    ],
    badges: o.prLines,
  };
}

export function runCard(r: RunLog, dateLabel: string, units: Units): ShareCard {
  const hasDist = r.distanceM > 0;
  return {
    kind: 'Run',
    title: `${RUN_TYPE_LABEL[r.type]} run`,
    subtitle: dateLabel,
    heroLabel: hasDist ? 'Distance' : 'Time',
    heroValue: hasDist ? fmtDistance(r.distanceM, units) : fmtDuration(r.durationSec),
    stats: [
      { label: 'Time', value: fmtDuration(r.durationSec) },
      { label: `Pace /${distUnit(units)}`, value: r.avgPaceSecPerKm > 0 ? paceLabel(r.avgPaceSecPerKm, units) : '–' },
      { label: 'Effort', value: `${r.effort}/10` },
    ],
    route: r.route,
  };
}
