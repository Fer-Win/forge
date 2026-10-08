'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRepos } from '@/data';
import { seedIfNeeded } from '@/data/seed';
import type { Load, Settings } from '@/data/types';
import { toDateStr } from '@/lib/dates';
import { WEEKDAYS_LONG } from '@/lib/labels';
import { PillButton } from '@/components/ui/PillButton';
import { Segmented } from '@/components/ui/Segmented';

const STEPS = ['Equipment', 'Schedule', 'Running'] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [has5, setHas5] = useState(true);
  const [has10, setHas10] = useState(true);
  const [days, setDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5]));
  const [time, setTime] = useState('07:00');
  const [level, setLevel] = useState<number>(30);
  const [saving, setSaving] = useState(false);

  const canContinue = step !== 1 || days.size >= 3;

  function toggleDay(i: number) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function finish() {
    setSaving(true);
    const repos = getRepos();
    const today = toDateStr();
    await seedIfNeeded(repos, today);

    // Days the user does not train become rest; a chosen day that was rest gets a mobility flow.
    for (const d of await repos.plan.week()) {
      const on = days.has(d.weekday);
      if (!on && d.assignment.type !== 'rest') await repos.plan.setDay({ weekday: d.weekday, assignment: { type: 'rest' } });
      if (on && d.assignment.type === 'rest') {
        await repos.plan.setDay({ weekday: d.weekday, assignment: { type: 'workout', workoutId: 'w-mobility' } });
      }
    }

    const equipment: Load[] = ['BW'];
    if (has5) equipment.push('5kg', '2x5kg');
    if (has10) equipment.push('10kg');
    const settings: Settings = {
      id: 'settings',
      units: 'metric',
      sound: true,
      haptics: true,
      speech: false,
      accent: '#FC4C02',
      reminderTime: time,
      trainingDays: [...days].sort(),
      runningLevelMin: level,
      equipment,
      onboarded: true,
      startDate: today,
    };
    await repos.settings.put(settings);
    await repos.runs.setProgram({ id: 'program', startDate: today, goal: 'none' });
    router.replace('/today/');
  }

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col px-4"
      style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 'calc(var(--safe-bottom) + 112px)' }}
    >
      <p className="text-sm font-medium text-muted">Step {step + 1} of 3</p>
      <div className="mt-2 flex gap-2" aria-hidden>
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-white/10'}`} />
        ))}
      </div>

      {step === 0 && (
        <section className="mt-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Your equipment</h1>
          <p className="mt-2 text-muted">Every exercise is built around this. Change it any time.</p>
          <div className="mt-6 space-y-3">
            <Toggle label="2 × 5 kg dumbbells" checked={has5} onChange={setHas5} />
            <Toggle label="1 × 10 kg dumbbell" checked={has10} onChange={setHas10} />
            <Toggle label="Bodyweight, floor and wall" checked disabled />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="mt-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Training days</h1>
          <p className="mt-2 text-muted">4–5 days works well. Saturday&apos;s run is optional. Pick at least 3.</p>
          <div className="mt-6 space-y-2" role="group" aria-label="Training days">
            {WEEKDAYS_LONG.map((d, i) => (
              <Toggle key={d} label={d} checked={days.has(i)} onChange={() => toggleDay(i)} />
            ))}
          </div>
          <label className="mt-8 block">
            <span className="text-sm font-medium text-muted">Daily reminder</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-2 block min-h-tap w-full rounded-2xl border border-hair bg-card px-4 text-2xl font-bold text-fg"
              style={{ colorScheme: 'dark' }}
            />
          </label>
        </section>
      )}

      {step === 2 && (
        <section className="mt-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Running level</h1>
          <p className="mt-2 text-muted">How long can you run without stopping?</p>
          <div className="mt-6">
            <Segmented
              label="Running level"
              value={level}
              onChange={setLevel}
              options={[
                { value: 10, label: '< 15 min' },
                { value: 20, label: '15–30' },
                { value: 30, label: '30+ min' },
              ]}
            />
          </div>
        </section>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-bg/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          {step > 0 && (
            <PillButton variant="secondary" onClick={() => setStep(step - 1)}>
              Back
            </PillButton>
          )}
          <PillButton
            className="flex-1"
            disabled={!canContinue || saving}
            onClick={() => (step < 2 ? setStep(step + 1) : finish())}
          >
            {step < 2 ? 'Continue' : 'Start training'}
          </PillButton>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label, checked, onChange, disabled,
}: { label: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="press flex min-h-[56px] w-full items-center justify-between rounded-card border border-hair bg-card px-4 text-left font-semibold disabled:opacity-70"
    >
      {label}
      <span className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors ${checked ? 'bg-accent' : 'bg-white/15'}`} aria-hidden>
        <span className={`h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}
