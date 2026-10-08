import type { DayAssignment, Workout } from '@/data/types';
import { buildSession } from '@/engine/session';
import { cap, sameAssignment } from '@/lib/labels';

/** List of everything a day can be: any workout, a run, or rest. Shared by Today and Plan. */
export function SwapSheet({
  workouts, current, onChoose,
}: { workouts: Workout[]; current: DayAssignment; onChoose: (a: DayAssignment) => void }) {
  const options: { label: string; sub: string; a: DayAssignment }[] = [
    ...workouts.map((w) => ({
      label: w.name,
      sub: `${buildSession(w, { short: false, intensity: 'normal' }).estMin} min · ${w.muscles.map(cap).join(', ')}`,
      a: { type: 'workout', workoutId: w.id } as DayAssignment,
    })),
    { label: 'Run A', sub: 'Intervals or tempo', a: { type: 'run', slot: 'A' } },
    { label: 'Run B', sub: 'Long or easy run', a: { type: 'run', slot: 'B' } },
    { label: 'Rest day', sub: 'Recover', a: { type: 'rest' } },
  ];
  return (
    <ul className="space-y-2">
      {options.map((o) => {
        const active = sameAssignment(o.a, current);
        return (
          <li key={o.label}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onChoose(o.a)}
              className={`press flex min-h-[56px] w-full items-center justify-between rounded-2xl border px-4 py-2 text-left ${
                active ? 'border-accent bg-accent/15' : 'border-hair bg-card-2'
              }`}
            >
              <span>
                <span className="block font-bold">{o.label}</span>
                <span className="block text-sm text-muted">{o.sub}</span>
              </span>
              {active && <span className="text-sm font-bold text-accent">Selected</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
