import type { DayStatus, RunLog, Session } from '../data/types';
import { addDays, startOfWeek, toDateStr } from '../lib/dates';
import { statusForDate, type DayData } from './dayStatus';
import { bestsFromSessions, findPRs, type PR } from './pr';
import { FINISHER_ID } from './session';
import { fmtDistance, fmtWeight, type Units } from './units';

/* ---------- calendar heatmap ---------- */

export type HeatStatus = DayStatus | 'future' | 'before';
export interface HeatCell { date: string; status: HeatStatus; run: boolean }

/** `weeks` columns (oldest first), each Monday..Sunday, ending with the current week. */
export function heatmap(today: string, startDate: string, data: DayData, weeks = 12): HeatCell[][] {
  const firstMonday = addDays(startOfWeek(today), -7 * (weeks - 1));
  const runDates = new Set(data.runs.map((r) => r.date));
  const out: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(firstMonday, w * 7 + d);
      const status: HeatStatus = date > today ? 'future' : date < startDate ? 'before' : statusForDate(date, today, data);
      col.push({ date, status, run: runDates.has(date) });
    }
    out.push(col);
  }
  return out;
}

/* ---------- weekly completion ---------- */

export interface WeekCompletion {
  weekStart: string;
  planned: number;
  completed: number;
  partial: number;
  /** 0..100, partial days count half */
  pct: number;
  current: boolean;
}

function weekStat(weekStart: string, today: string, startDate: string, data: DayData, current: boolean): WeekCompletion {
  let planned = 0;
  let completed = 0;
  let partial = 0;
  for (let d = 0; d < 7; d++) {
    const date = addDays(weekStart, d);
    if (date < startDate) continue;
    const s = statusForDate(date, today, data);
    if (s === 'rest') continue;
    planned++;
    if (s === 'completed') completed++;
    else if (s === 'partial') partial++;
  }
  const pct = planned === 0 ? 0 : Math.min(100, Math.round(((completed + partial * 0.5) / planned) * 100));
  return { weekStart, planned, completed, partial, pct, current };
}

export function weeklyCompletion(today: string, startDate: string, data: DayData, weeks = 8): WeekCompletion[] {
  const thisMonday = startOfWeek(today);
  const out: WeekCompletion[] = [];
  for (let w = weeks - 1; w >= 0; w--) out.push(weekStat(addDays(thisMonday, -7 * w), today, startDate, data, w === 0));
  return out;
}

/** A week counts toward the streak when at least half of its planned days are done (partial days count half). */
export const WEEK_HIT_PCT = 50;

/** Consecutive weeks that count, ending now. The current week is neutral until it counts, and rest-only weeks are skipped. */
export function weekStreak(today: string, startDate: string, data: DayData, lookbackWeeks = 16): { weeks: number; days: number } {
  const thisMonday = startOfWeek(today);
  let weeks = 0;
  let days = 0;
  for (let w = 0; w <= lookbackWeeks; w++) {
    const weekStart = addDays(thisMonday, -7 * w);
    if (addDays(weekStart, 6) < startDate) break;
    const st = weekStat(weekStart, today, startDate, data, w === 0);
    if (st.planned === 0) continue;
    if (st.pct >= WEEK_HIT_PCT) {
      weeks++;
      days += st.completed + st.partial;
    } else if (w > 0) break;
  }
  return { weeks, days };
}

export interface MonthRow {
  weekStart: string;
  /** null = the days of this row are in the future or the week has nothing planned */
  hit: boolean | null;
  current: boolean;
  /** Seven entries Monday..Sunday; null for days outside the month. */
  cells: (HeatCell | null)[];
}

/** Calendar rows for one month (month is 0-11), Monday first, with whether each week counts toward the streak. */
export function monthGrid(today: string, startDate: string, data: DayData, year: number, month: number): MonthRow[] {
  const runDates = new Set(data.runs.map((r) => r.date));
  const first = toDateStr(new Date(year, month, 1));
  const last = toDateStr(new Date(year, month + 1, 0));
  const rows: MonthRow[] = [];
  for (let weekStart = startOfWeek(first); weekStart <= last; weekStart = addDays(weekStart, 7)) {
    const cells = Array.from({ length: 7 }, (_, d): HeatCell | null => {
      const date = addDays(weekStart, d);
      if (date < first || date > last) return null;
      const status: HeatStatus = date > today ? 'future' : date < startDate ? 'before' : statusForDate(date, today, data);
      return { date, status, run: runDates.has(date) };
    });
    const st = weekStat(weekStart, today, startDate, data, startOfWeek(today) === weekStart);
    const hit = weekStart > today || st.planned === 0 ? null : st.pct >= WEEK_HIT_PCT;
    rows.push({ weekStart, hit, current: st.current, cells });
  }
  return rows;
}

/** Longest run of trained days (rest and today-pending are neutral, a missed day resets), within the data window. */
export function longestStreak(today: string, startDate: string, data: DayData, lookbackDays = 119): number {
  let d = addDays(today, -lookbackDays);
  if (d < startDate) d = startDate;
  let best = 0;
  let cur = 0;
  while (d <= today) {
    const s = statusForDate(d, today, data);
    if (s === 'completed' || s === 'partial') {
      cur++;
      best = Math.max(best, cur);
    } else if (s === 'missed') cur = 0;
    d = addDays(d, 1);
  }
  return best;
}

/* ---------- per-exercise series ---------- */

export interface ExercisePoint {
  sessionId: string;
  date: string;
  maxWeight: number;
  bestReps: number;
  volume: number;
  maxHold: number;
}

export function exerciseSeries(sessions: Session[], exerciseId: string): ExercisePoint[] {
  const out: ExercisePoint[] = [];
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const sets = s.sets.filter((l) => l.exerciseId === exerciseId);
    if (sets.length === 0) continue;
    let maxWeight = 0;
    let bestReps = 0;
    let volume = 0;
    let maxHold = 0;
    for (const l of sets) {
      if (l.durationSec) maxHold = Math.max(maxHold, l.durationSec);
      else {
        maxWeight = Math.max(maxWeight, l.weightKg);
        bestReps = Math.max(bestReps, l.reps);
        volume += l.reps * l.weightKg;
      }
    }
    out.push({ sessionId: s.id, date: s.date, maxWeight, bestReps, volume, maxHold });
  }
  return out;
}

/** Exercises with logged sets, most recently done first. */
export function exercisesWithHistory(sessions: Session[]): { exerciseId: string; sessions: number; last: string }[] {
  const m = new Map<string, { sessionIds: Set<string>; last: number; lastDate: string }>();
  for (const s of sessions) {
    for (const l of s.sets) {
      if (l.exerciseId === FINISHER_ID) continue;
      const e = m.get(l.exerciseId) ?? { sessionIds: new Set<string>(), last: 0, lastDate: '' };
      e.sessionIds.add(s.id);
      if (s.startedAt >= e.last) { e.last = s.startedAt; e.lastDate = s.date; }
      m.set(l.exerciseId, e);
    }
  }
  return [...m.entries()]
    .map(([exerciseId, e]) => ({ exerciseId, sessions: e.sessionIds.size, last: e.lastDate, at: e.last }))
    .sort((a, b) => b.at - a.at)
    .map(({ exerciseId, sessions: n, last }) => ({ exerciseId, sessions: n, last }));
}

export interface PRRecord { date: string; sessionId: string; pr: PR }

/** Every personal record ever set, oldest first. */
export function allPRs(sessions: Session[]): PRRecord[] {
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const out: PRRecord[] = [];
  sorted.forEach((s, i) => {
    const prior = bestsFromSessions(sorted.slice(0, i));
    for (const pr of findPRs(s.sets, prior)) out.push({ date: s.date, sessionId: s.id, pr });
  });
  return out;
}

/* ---------- running ---------- */

export interface RunStats {
  weeklyDistance: { weekStart: string; meters: number }[];
  paceTrend: { date: string; pace: number }[];
  longest: { distanceM: number; date: string } | null;
  totals: { count: number; distanceM: number; durationSec: number };
}

export function runStats(runs: RunLog[], today: string, weeks = 8): RunStats {
  const thisMonday = startOfWeek(today);
  const weeklyDistance: RunStats['weeklyDistance'] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = addDays(thisMonday, -7 * w);
    const end = addDays(weekStart, 6);
    const meters = runs.filter((r) => r.date >= weekStart && r.date <= end).reduce((a, r) => a + r.distanceM, 0);
    weeklyDistance.push({ weekStart, meters });
  }
  const sorted = [...runs].sort((a, b) => a.date.localeCompare(b.date));
  const paceTrend = sorted
    .filter((r) => r.distanceM >= 1000 && r.avgPaceSecPerKm > 0)
    .map((r) => ({ date: r.date, pace: r.avgPaceSecPerKm }));
  let longest: RunStats['longest'] = null;
  for (const r of runs) if (r.distanceM > 0 && (!longest || r.distanceM > longest.distanceM)) longest = { distanceM: r.distanceM, date: r.date };
  return {
    weeklyDistance,
    paceTrend,
    longest,
    totals: {
      count: runs.length,
      distanceM: runs.reduce((a, r) => a + r.distanceM, 0),
      durationSec: runs.reduce((a, r) => a + r.durationSec, 0),
    },
  };
}

/* ---------- bodyweight ---------- */

export interface BodyweightTrend {
  weeks: { weekStart: string; avg: number }[];
  latest: { date: string; kg: number } | null;
  /** Latest weekly average minus the one before it (kg); null with under two weeks of data. */
  change: number | null;
}

export function bodyweightTrend(entries: { date: string; kg: number }[]): BodyweightTrend {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const byWeek = new Map<string, number[]>();
  for (const e of sorted) {
    const k = startOfWeek(e.date);
    byWeek.set(k, [...(byWeek.get(k) ?? []), e.kg]);
  }
  const weeks = [...byWeek.entries()]
    .map(([weekStart, v]) => ({ weekStart, avg: Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)) }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const last = sorted[sorted.length - 1];
  const a = weeks[weeks.length - 1];
  const b = weeks[weeks.length - 2];
  return {
    weeks,
    latest: last ? { date: last.date, kg: last.kg } : null,
    change: a && b ? Number((a.avg - b.avg).toFixed(2)) : null,
  };
}

/* ---------- weekly insight ---------- */

export interface InsightInput {
  today: string;
  startDate: string;
  data: DayData;
  exerciseNames: Map<string, string>;
  units?: Units;
}

export interface Insight { kind: 'pr' | 'streak' | 'consistency' | 'distance' | 'start'; text: string }

function streakNow(today: string, startDate: string, data: DayData): number {
  let n = 0;
  let d = today;
  while (d >= startDate && n < 400) {
    const s = statusForDate(d, today, data);
    if (s === 'completed' || s === 'partial') n++;
    else if (s === 'missed') break;
    d = addDays(d, -1);
  }
  return n;
}

/** One sentence for the weekly summary card. Priority: new PR, streak, consistency, distance, then a nudge. */
export function weeklyInsight(input: InsightInput): Insight {
  const { today, startDate, data, exerciseNames } = input;
  const units = input.units ?? 'metric';
  const monday = startOfWeek(today);

  const prs = allPRs(data.sessions).filter((r) => r.date >= monday);
  const top = prs[prs.length - 1];
  if (top) {
    const name = exerciseNames.get(top.pr.exerciseId) ?? 'an exercise';
    const v =
      top.pr.kind === 'weight' || top.pr.kind === 'volume' ? fmtWeight(top.pr.value, units)
      : top.pr.kind === 'reps' ? `${top.pr.value} reps`
      : `${top.pr.value}s`;
    return { kind: 'pr', text: `New personal best on ${name}: ${v}.` };
  }

  const streak = streakNow(today, startDate, data);
  if (streak >= 3) return { kind: 'streak', text: `${streak} days in a row. Keep the chain going.` };

  const weeks = weeklyCompletion(today, startDate, data, 2);
  const cur = weeks[1];
  const prev = weeks[0];
  if (cur && prev && prev.planned > 0) {
    const c = cur.completed + cur.partial;
    const p = prev.completed + prev.partial;
    if (c > p && c > 0) return { kind: 'consistency', text: `${c} sessions done this week, ahead of ${p} last week.` };
  }

  const rs = runStats(data.runs, today, 2);
  const [last, now] = rs.weeklyDistance;
  if (last && now && now.meters > 0 && now.meters > last.meters && last.meters > 0) {
    return { kind: 'distance', text: `${fmtDistance(now.meters, units)} run this week, up from ${fmtDistance(last.meters, units)}.` };
  }

  return { kind: 'start', text: 'Every session counts. Pick the next one and get it done.' };
}
