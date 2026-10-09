'use client';
import { useMemo } from 'react';
import { computeStreak, weekProgress } from '@/engine/streak';
import { longestStreak, weeklyCompletion, weeklyInsight, runStats } from '@/engine/stats';
import { fmtDistance, fmtWeight, weightUnit } from '@/engine/units';
import { useAllExercises, useAllSessions, useBodyweight, useDayData, useRuns, useSettings, useToday } from '@/hooks/useData';
import { startOfWeek } from '@/lib/dates';
import { Flame } from '@/components/ui/Flame';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingsLink } from '@/components/ui/SettingsLink';
import { Skeleton } from '@/components/ui/Skeleton';
import { BodyweightCard } from '@/components/progress/BodyweightCard';
import { BarChart } from '@/components/progress/charts';
import { StreakCalendar } from '@/components/progress/StreakCalendar';
import { RunningCard } from '@/components/progress/RunningCard';
import { Card, shortDate, Stat } from '@/components/progress/shared';
import { StrengthCard } from '@/components/progress/Strength';

export default function ProgressPage() {
  const today = useToday();
  const settings = useSettings();
  const data = useDayData(today);
  const allSessions = useAllSessions();
  const exercises = useAllExercises();
  const runs = useRuns();
  const bodyweight = useBodyweight();

  const st = settings?.value;
  const exMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);

  if (!today || !data || !st || !allSessions || !exercises || !runs || !bodyweight) {
    return (
      <main>
        <ScreenHeader title="Progress" subtitle="How you're trending" />
        <Skeleton className="mt-6 h-40" />
        <Skeleton className="mt-4 h-52" />
      </main>
    );
  }

  const units = st.units;
  const full = { ...data, sessions: allSessions };
  const streak = computeStreak(today, st.startDate, data);
  const best = Math.max(streak, longestStreak(today, st.startDate, data));
  const wp = weekProgress(today, data);
  const insight = weeklyInsight({ today, startDate: st.startDate, data: full, exerciseNames: new Map([...exMap].map(([k, v]) => [k, v.name])), units });
  const monday = startOfWeek(today);
  const weekVolume = allSessions.filter((s) => s.date >= monday).reduce((a, s) => a + s.totalVolume, 0);
  const weekDist = runStats(runs, today, 1).weeklyDistance[0]?.meters ?? 0;
  const weeks = weeklyCompletion(today, st.startDate, data, 8);

  return (
    <main>
      <ScreenHeader title="Progress" subtitle="How you're trending" action={<SettingsLink />} />

      <section className="mt-5 rounded-card border border-hair bg-card p-5" aria-labelledby="streak-h" data-testid="summary-card">
        <h2 id="streak-h" className="text-xs font-bold uppercase tracking-wide text-muted">Day streak</h2>
        <div className="mt-1 flex items-center gap-2">
          <Flame size={34} className={streak > 0 ? 'text-accent' : 'text-rest'} />
          <span className="num text-6xl leading-none" data-testid="streak">{streak}</span>
          <span className="self-end pb-1 text-sm text-muted">Longest {best}</span>
        </div>
        <p className="mt-3 text-base font-semibold" data-testid="insight">{insight.text}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="This week" value={`${wp.completed + wp.partial}/${wp.planned}`} />
          <Stat label="Volume" value={weekVolume > 0 ? fmtWeight(weekVolume, units) : `0 ${weightUnit(units)}`} />
          <Stat label="Distance" value={fmtDistance(weekDist, units)} />
        </div>
      </section>

      <Card id="heat-h" title="Calendar">
        <StreakCalendar today={today} startDate={st.startDate} data={data} />
      </Card>

      <Card id="weeks-h" title="Weekly completion">
        <div className="mt-2">
          <BarChart
            bars={weeks.map((w) => ({ label: shortDate(w.weekStart), value: w.pct }))}
            format={(v) => `${v}%`}
            label="Weekly completion percentage"
            testId="completion-chart"
          />
        </div>
      </Card>

      <StrengthCard sessions={allSessions} exercises={exMap} units={units} />
      <RunningCard runs={runs} today={today} units={units} />
      <BodyweightCard entries={bodyweight} today={today} units={units} />
    </main>
  );
}
