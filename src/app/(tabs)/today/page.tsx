'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DayAssignment, DayPrefs } from '@/data/types';
import { dayPlan, statusForDate } from '@/engine/dayStatus';
import { resolveAssignment, runATypeForWeek } from '@/engine/schedule';
import { buildSession, FINISHER_ID, lighterSuggestion, type Intensity } from '@/engine/session';
import { computeStreak, weekProgress } from '@/engine/streak';
import { parseDateStr, startOfWeek } from '@/lib/dates';
import { describeAssignment, exerciseDetail, sameAssignment } from '@/lib/labels';
import { patchPrefs, setDayOverride, toggleCheck } from '@/lib/actions';
import { useActiveSession, useDayData, useExerciseMap, useRunProgram, useSettings, useToday } from '@/hooks/useData';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Flame } from '@/components/ui/Flame';
import { PillButton } from '@/components/ui/PillButton';
import { Ring } from '@/components/ui/Ring';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { CheckButtons } from '@/components/today/CheckButtons';
import { SwapSheet } from '@/components/today/SwapSheet';

export default function TodayPage() {
  const router = useRouter();
  const today = useToday();
  const settings = useSettings();
  const data = useDayData(today);
  const exercises = useExerciseMap();
  const program = useRunProgram();
  const active = useActiveSession();
  const [swapOpen, setSwapOpen] = useState(false);

  useEffect(() => {
    if (settings && !settings.value?.onboarded) router.replace('/onboarding/');
  }, [settings, router]);

  const ready = today && data && exercises && settings?.value?.onboarded && data.week.length > 0;

  if (!ready) {
    return (
      <main>
        <h1 className="text-3xl font-extrabold tracking-tight">Today</h1>
        <Skeleton className="mt-6 h-48" />
        <Skeleton className="mt-4 h-16" />
        <Skeleton className="mt-2 h-16" />
      </main>
    );
  }

  const cfg = settings.value!;
  const plan = dayPlan(today, data);
  const prefs: DayPrefs = data.prefs.get(today) ?? { date: today, intensity: 'normal', short: false };
  const status = statusForDate(today, today, data);
  const streak = computeStreak(today, cfg.startDate, data);
  const prog = weekProgress(today, data);
  const runA = runATypeForWeek(program?.value?.startDate ?? cfg.startDate, startOfWeek(today));
  const desc = describeAssignment(plan.assignment, data.workouts, runA);
  const built = plan.workout ? buildSession(plan.workout, { short: prefs.short, intensity: prefs.intensity }) : null;
  const marks = data.checks.get(today);
  const overridden = data.overrides.has(today);
  const suggestion = lighterSuggestion(prefs.energy);
  const lighterOn = prefs.intensity === 'easy' && prefs.short;
  const planned: DayAssignment = resolveAssignment(today, data.week, new Map());

  const dateLabel = parseDateStr(today).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  type Item = { id: string; name: string; detail: string };
  let items: Item[] = [];
  if (built && plan.workout) {
    items = built.itemIds.map((id) => {
      if (id === FINISHER_ID && built.finisher) {
        const f = built.finisher;
        return { id, name: 'Metabolic finisher', detail: `${f.minutes} min ${f.type === 'amrap' ? 'AMRAP' : 'work / rest intervals'}` };
      }
      const d = exerciseDetail(id, built.blocks, exercises);
      return { id, name: d.name, detail: d.detail };
    });
  } else if (plan.assignment.type === 'run') {
    items = [{ id: 'run', name: `${desc.title} · ${desc.sub}`, detail: desc.est }];
  }

  const isRest = desc.kind === 'rest';
  const barHref =
    plan.assignment.type === 'workout'
      ? `/workout/?w=${plan.assignment.workoutId}&d=${today}`
      : plan.assignment.type === 'run'
        ? '/run/'
        : '/workout/?w=w-mobility&d=' + today;
  const resuming =
    active?.value?.date === today &&
    barHref.startsWith('/workout/') &&
    barHref.includes(`w=${active.value.workoutId}&`);
  const barLabel = resuming ? 'Resume workout' : desc.kind === 'run' ? 'Start run' : isRest ? 'Start mobility flow' : 'Start workout';
  const showBar = status !== 'completed';

  const badge =
    status === 'completed' ? { text: 'Done', cls: 'bg-done text-black' }
    : status === 'partial' ? { text: 'Partly done', cls: 'bg-partial text-black' }
    : status === 'missed' && !isRest ? { text: 'Skipped', cls: 'bg-white/15 text-fg' }
    : null;

  function chooseAssignment(a: DayAssignment) {
    setSwapOpen(false);
    void setDayOverride(today!, sameAssignment(a, planned) ? null : a);
  }

  return (
    <main>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{dateLabel}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Today</h1>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-full border border-hair bg-card px-3 py-2 ${streak > 0 ? 'text-accent' : 'text-muted'}`}
            role="img"
            aria-label={`${streak} day streak`}
          >
            <Flame />
            <span className="num text-lg text-fg">{streak}</span>
          </div>
          <Ring value={prog.fraction} size={56} stroke={6} label={`${prog.completed} of ${prog.planned} sessions this week`}>
            <span className="num text-sm">{prog.completed}/{prog.planned}</span>
          </Ring>
        </div>
      </header>

      <section className="mt-6 rounded-card border border-hair bg-card p-5" aria-labelledby="hero-title">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">
            {desc.kind === 'run' ? 'Run' : isRest ? 'Rest' : 'Strength'}
          </span>
          {prefs.intensity !== 'normal' && !isRest && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold capitalize">{prefs.intensity}</span>
          )}
          {prefs.short && !isRest && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold">Short</span>}
          {badge && <span className={`ml-auto rounded-full px-3 py-1 text-xs font-extrabold ${badge.cls}`}>{badge.text}</span>}
        </div>
        <h2 id="hero-title" className="mt-2 text-4xl font-extrabold tracking-tight">{desc.title}</h2>
        <p className="mt-1 text-muted">{desc.sub}</p>
        {!isRest && (
          <p className="mt-5 flex items-baseline gap-2">
            {built ? (
              <>
                <span className="num text-5xl" data-testid="est-min">{built.estMin}</span>
                <span className="text-lg font-semibold text-muted">min</span>
              </>
            ) : (
              <span className="num text-4xl" data-testid="est-min">{desc.est}</span>
            )}
            <span className="ml-1 text-muted">· {items.length} {items.length === 1 ? 'item' : 'exercises'}</span>
          </p>
        )}
        {isRest && <p className="mt-4 text-muted">Recover today. A walk or stretch is plenty, or try a short mobility flow.</p>}
      </section>

      {!isRest && plan.assignment.type === 'workout' && (
        <div className="mt-4">
          <Segmented<Intensity>
            label="Intensity"
            value={prefs.intensity}
            onChange={(v) => void patchPrefs(today, { intensity: v })}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'normal', label: 'Normal' },
              { value: 'hard', label: 'Hard' },
            ]}
          />
        </div>
      )}

      <section aria-label="Quick actions" className="mt-3 grid grid-cols-2 gap-2">
        {plan.assignment.type === 'workout' && (
          <ActionChip pressed={prefs.short} onClick={() => void patchPrefs(today, { short: !prefs.short })}>
            Short on time (20 min)
          </ActionChip>
        )}
        <ActionChip onClick={() => setSwapOpen(true)}>{isRest ? 'Train today' : 'Swap workout'}</ActionChip>
        {!isRest && <ActionChip onClick={() => void setDayOverride(today, { type: 'rest' })}>Mark rest day</ActionChip>}
        {overridden && <ActionChip onClick={() => void setDayOverride(today, null)}>Back to plan</ActionChip>}
      </section>

      {items.length > 0 && (
        <section aria-labelledby="list-h" className="mt-8">
          <h2 id="list-h" className="text-lg font-extrabold">{plan.assignment.type === 'run' ? 'Run' : 'Exercises'}</h2>
          <ul className="mt-3 space-y-2">
            {items.map((it) => {
              const s = marks?.get(it.id);
              return (
                <li key={it.id} className="flex min-h-[64px] items-center gap-3 rounded-card border border-hair bg-card py-2 pl-4 pr-2">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${s === 'skipped' ? 'text-muted line-through' : ''}`}>{it.name}</p>
                    <p className="truncate text-sm text-muted">{it.detail}</p>
                  </div>
                  <CheckButtons
                    name={it.name}
                    state={s}
                    onDone={() => void toggleCheck(today, it.id, 'done')}
                    onSkip={() => void toggleCheck(today, it.id, 'skipped')}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!isRest && (
        <section aria-labelledby="energy-h" className="mt-8 rounded-card border border-hair bg-card p-5">
          <h2 id="energy-h" className="text-lg font-extrabold">How are you feeling?</h2>
          <p className="mt-1 text-sm text-muted">Optional. 1 is drained, 5 is great.</p>
          <div className="mt-3 grid grid-cols-5 gap-2" role="group" aria-label="Energy today">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={prefs.energy === n}
                onClick={() => void patchPrefs(today, { energy: prefs.energy === n ? undefined : n })}
                className={`press num min-h-tap rounded-2xl text-lg ${prefs.energy === n ? 'bg-accent text-white' : 'border border-hair bg-card-2 text-fg'}`}
              >
                {n}
              </button>
            ))}
          </div>
          {suggestion && (
            <div className="mt-4 rounded-2xl border border-hair bg-white/5 p-4">
              <p className="font-semibold">{suggestion.message}</p>
              {lighterOn ? (
                <p className="mt-2 text-sm text-muted">Lighter plan is on: easy intensity, about 20 minutes.</p>
              ) : (
                <PillButton
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => void patchPrefs(today, suggestion.apply)}
                >
                  Go lighter today
                </PillButton>
              )}
            </div>
          )}
        </section>
      )}

      {showBar && (
        <div
          className="pointer-events-none fixed inset-x-0 z-30 bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-8"
          style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom))', paddingBottom: 12 }}
        >
          <div className="pointer-events-auto mx-auto max-w-md">
            <PillButton href={barHref} className="w-full shadow-lg shadow-black/60">
              {barLabel}
            </PillButton>
          </div>
        </div>
      )}

      <BottomSheet open={swapOpen} onClose={() => setSwapOpen(false)} title="Choose today's session">
        <SwapSheet
          workouts={[...data.workouts.values()]}
          current={plan.assignment}
          onChoose={chooseAssignment}
        />
      </BottomSheet>
    </main>
  );
}

function ActionChip({
  children, onClick, pressed,
}: { children: React.ReactNode; onClick: () => void; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`press min-h-tap rounded-2xl border px-3 text-sm font-bold ${
        pressed ? 'border-accent bg-accent/15 text-accent' : 'border-hair bg-card text-fg'
      }`}
    >
      {children}
    </button>
  );
}
