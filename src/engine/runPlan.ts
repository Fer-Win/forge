import type { RunSegment, RunType } from '../data/types';
import { diffDays, startOfWeek } from '../lib/dates';

/**
 * Run programme: 8 weeks, repeating. Every 4th week (weeks 4 and 8) is a lighter week.
 * Run A alternates intervals / tempo (decided by runATypeForWeek in schedule.ts); Run B is a long run,
 * or an easy run in a lighter week.
 */
export const PROGRAM_WEEKS = 8;
export type RunGoal = 'none' | '5k' | '10k';

export interface RunSpec {
  type: RunType;
  title: string;
  blurb: string;
  summary: string;
  segments: RunSegment[];
  totalSec: number;
  light: boolean;
}

/** Zero-based week of the programme that contains `date`. */
export function programWeek(startDate: string, date: string): number {
  return Math.max(0, Math.floor(diffDays(startOfWeek(startDate), startOfWeek(date)) / 7));
}

export const cyclePos = (week: number) => week % PROGRAM_WEEKS;
export const isLightWeek = (week: number) => cyclePos(week) % 4 === 3;
/** How many harder weeks have come before this one in the cycle (drives progression). */
const level = (week: number) => {
  const c = cyclePos(week);
  return c - Math.floor(c / 4);
};

const min = (m: number) => m * 60;
const seg = (label: string, kind: RunSegment['kind'], durSec: number): RunSegment => ({ label, kind, durSec });
const total = (s: RunSegment[]) => s.reduce((t, x) => t + x.durSec, 0);

function easy(week: number): RunSpec {
  const light = isLightWeek(week);
  const m = light ? 30 : Math.min(45, 30 + 5 * Math.min(level(week), 3));
  const segments = [seg('Easy run', 'steady', min(m))];
  return {
    type: 'easy', title: 'Easy run', light, segments, totalSec: total(segments),
    blurb: 'Conversational pace. You should be able to speak in full sentences.',
    summary: `${m} min easy`,
  };
}

function tempo(week: number): RunSpec {
  const light = isLightWeek(week);
  const L = level(week);
  const tempoMin = light ? 12 : Math.min(20, 15 + L);
  const coolMin = L >= 3 && !light ? 10 : 5;
  const segments = [
    seg('Warm-up', 'warmup', min(10)),
    seg('Tempo', 'work', min(tempoMin)),
    seg('Cooldown', 'cooldown', min(coolMin)),
  ];
  return {
    type: 'tempo', title: 'Tempo run', light, segments, totalSec: total(segments),
    blurb: 'Comfortably hard: short phrases only, steady effort.',
    summary: `10 min warm-up · ${tempoMin} min tempo · ${coolMin} min cooldown`,
  };
}

function intervals(week: number): RunSpec {
  const light = isLightWeek(week);
  const L = level(week);
  const variant = Math.floor(cyclePos(week) / 2) % 2; // 0 = 2/2, 1 = 3/2
  const hard = variant === 0 ? 2 : 3;
  const rest = 2;
  const reps = light ? 5 : variant === 0 ? Math.min(8, 6 + Math.floor(L / 2)) : Math.min(6, 5 + Math.floor(L / 3));
  const segments: RunSegment[] = [seg('Warm-up', 'warmup', min(10))];
  for (let i = 1; i <= reps; i++) {
    segments.push(seg(`Hard ${i} of ${reps}`, 'work', min(hard)));
    if (i < reps) segments.push(seg('Easy', 'recovery', min(rest)));
  }
  segments.push(seg('Cooldown', 'cooldown', min(10)));
  return {
    type: 'intervals', title: 'Intervals', light, segments, totalSec: total(segments),
    blurb: `${reps} hard efforts with easy jogging between. Hard means about 8 out of 10.`,
    summary: `10 min warm-up · ${reps} × (${hard} min hard / ${rest} min easy) · 10 min cooldown`,
  };
}

function long(week: number, goal: RunGoal): RunSpec {
  const light = isLightWeek(week);
  const cap = goal === '5k' ? 60 : 75;
  const base = Math.min(cap, 45 + 5 * level(week));
  const m = light ? Math.max(30, base - 15) : base;
  const segments = [seg('Long run', 'steady', min(m))];
  return {
    type: 'long', title: 'Long run', light, segments, totalSec: total(segments),
    blurb: 'Slow and steady. Walk breaks are fine.',
    summary: `${m} min steady`,
  };
}

export function buildRun(type: RunType, week: number, goal: RunGoal = 'none'): RunSpec {
  switch (type) {
    case 'easy': return easy(week);
    case 'tempo': return tempo(week);
    case 'intervals': return intervals(week);
    case 'long': return long(week, goal);
  }
}

/** Run type for a plan slot in a given programme week. `runAType` comes from runATypeForWeek. */
export function typeForSlot(slot: 'A' | 'B', runAType: 'intervals' | 'tempo', week: number): RunType {
  if (slot === 'A') return runAType;
  return isLightWeek(week) ? 'easy' : 'long';
}

export const RUN_TYPES: RunType[] = ['easy', 'tempo', 'intervals', 'long'];
export const RUN_TYPE_LABEL: Record<RunType, string> = {
  easy: 'Easy', tempo: 'Tempo', intervals: 'Intervals', long: 'Long',
};
