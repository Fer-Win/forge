'use client';
import { useMemo, useState } from 'react';
import { getRepos } from '@/data';
import type { Category, Exercise, Workout } from '@/data/types';
import { useAllExercises, usePlanWeek, useWorkoutMap } from '@/hooks/useData';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DemoLink } from '@/components/ui/DemoLink';
import { PillButton } from '@/components/ui/PillButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Segmented } from '@/components/ui/Segmented';
import { SettingsLink } from '@/components/ui/SettingsLink';
import { Skeleton } from '@/components/ui/Skeleton';
import { CATEGORIES, ExerciseEditor, LOADS } from '@/components/library/ExerciseEditor';
import { inputCls } from '@/components/library/fields';
import { blockText, WorkoutEditor } from '@/components/library/WorkoutEditor';

type Tab = 'exercises' | 'workouts';

const amount = (e: Exercise) => (e.mode === 'reps' ? `${e.sets} × ${e.repMin}–${e.repMax}` : `${e.sets} × ${e.durationSec}s`);
const loadLabel = (e: Exercise) => LOADS.find((l) => l.value === e.load)?.label ?? e.load;

export default function LibraryPage() {
  const exercises = useAllExercises();
  const workoutMap = useWorkoutMap();
  const week = usePlanWeek();
  const [tab, setTab] = useState<Tab>('exercises');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | 'All'>('All');

  const [viewEx, setViewEx] = useState<Exercise | null>(null);
  const [editEx, setEditEx] = useState<{ ex: Exercise | null } | null>(null);
  const [viewW, setViewW] = useState<Workout | null>(null);
  const [editW, setEditW] = useState<{ w: Workout | null } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const workouts = useMemo(() => [...(workoutMap?.values() ?? [])], [workoutMap]);
  const names = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e.name])), [exercises]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (exercises ?? [])
      .filter((e) => (cat === 'All' || e.category === cat) && (!q || e.name.toLowerCase().includes(q) || e.muscles.some((m) => m.includes(q))))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, cat]);

  if (!exercises || !workoutMap || !week) {
    return (
      <main>
        <ScreenHeader title="Library" subtitle="Exercises and workouts" />
        <Skeleton className="mt-6 h-16" />
        <Skeleton className="mt-4 h-64" />
      </main>
    );
  }

  const planWeek = week;
  const closeViews = () => { setViewEx(null); setViewW(null); setConfirm(false); setBlocked(null); };

  async function removeExercise(e: Exercise) {
    const used = workouts.find((w) => w.blocks.some((b) => b.exerciseIds.includes(e.id)) || w.finisher?.exerciseIds.includes(e.id));
    if (used) { setConfirm(false); setBlocked(`Used in "${used.name}". Remove it from that workout first.`); return; }
    await getRepos().exercises.remove(e.id);
    closeViews();
  }
  async function removeWorkout(w: Workout) {
    if (planWeek.some((d) => d.assignment.type === 'workout' && d.assignment.workoutId === w.id)) {
      setConfirm(false);
      setBlocked('This workout is in your weekly plan. Change that day in Plan first.');
      return;
    }
    await getRepos().workouts.remove(w.id);
    closeViews();
  }

  const copyOf = <T extends { name: string }>(x: T): T => ({ ...x, id: '', name: `${x.name} (copy)` });

  return (
    <main>
      <ScreenHeader title="Library" subtitle="Exercises and workouts" action={<SettingsLink />} />

      <div className="mt-5">
        <Segmented<Tab> label="Library section" value={tab} onChange={setTab} options={[{ value: 'exercises', label: 'Exercises' }, { value: 'workouts', label: 'Workouts' }]} />
      </div>

      {tab === 'exercises' ? (
        <>
          <input
            type="search" aria-label="Search exercises" placeholder="Search exercises or muscles"
            className={`${inputCls} mt-3`} value={query} onChange={(e) => setQuery(e.target.value)}
          />
          <div role="radiogroup" aria-label="Category" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {(['All', ...CATEGORIES] as const).map((c) => (
              <button
                key={c} type="button" role="radio" aria-checked={cat === c} onClick={() => setCat(c)}
                className={`press h-12 shrink-0 rounded-full border px-4 text-sm font-bold ${cat === c ? 'border-accent bg-accent text-white' : 'border-hair bg-card text-muted'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted" data-testid="exercise-count">{shown.length} {shown.length === 1 ? 'exercise' : 'exercises'}</p>
          {shown.length === 0 ? (
            <p className="mt-2 rounded-card border border-hair bg-card p-4 text-muted">Nothing matches. Try another search, or add your own exercise.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {shown.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => setViewEx(e)} className="press flex min-h-[64px] w-full items-center justify-between gap-3 rounded-card border border-hair bg-card px-4 py-2 text-left">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{e.name}</span>
                      <span className="block truncate text-sm text-muted">{e.category} · {loadLabel(e)}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm text-muted">
                      <span className="num block text-fg">{amount(e)}</span>
                      {e.isCustom && <span className="text-accent">Custom</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <ul className="mt-4 space-y-2">
          {workouts.map((w) => (
            <li key={w.id}>
              <button type="button" onClick={() => setViewW(w)} className="press flex min-h-[64px] w-full items-center justify-between gap-3 rounded-card border border-hair bg-card px-4 py-2 text-left">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{w.name}</span>
                  <span className="block truncate text-sm capitalize text-muted">{w.kind} · {w.muscles.slice(0, 3).join(', ')}</span>
                </span>
                <span className="shrink-0 text-right text-sm text-muted">
                  <span className="num block text-fg">{w.estMin} min</span>
                  {w.isCustom && <span className="text-accent">Custom</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 12px)' }}>
        <div className="mx-auto max-w-md">
          <PillButton className="w-full shadow-lg shadow-black/60" onClick={() => (tab === 'exercises' ? setEditEx({ ex: null }) : setEditW({ w: null }))}>
            {tab === 'exercises' ? 'New exercise' : 'New workout'}
          </PillButton>
        </div>
      </div>

      <BottomSheet open={viewEx !== null} onClose={closeViews} title={viewEx?.name ?? 'Exercise'}>
        {viewEx && (
          <div className="space-y-3 pb-2">
            <p className="text-sm text-muted">{viewEx.category} · {loadLabel(viewEx)} · {amount(viewEx)} · rest {viewEx.restSec}s</p>
            {viewEx.muscles.length > 0 && <p className="text-sm capitalize text-muted">{viewEx.muscles.join(', ')}</p>}
            {viewEx.cues.length > 0 && (
              <ul className="space-y-1.5 rounded-2xl bg-card-2 p-3 text-sm">
                {viewEx.cues.map((c, i) => <li key={i}>• {c}</li>)}
              </ul>
            )}
            {viewEx.easier && <p className="text-sm"><span className="font-bold">Easier: </span>{viewEx.easier}</p>}
            {viewEx.harder && <p className="text-sm"><span className="font-bold">Harder: </span>{viewEx.harder}</p>}
            <DemoLink name={viewEx.name} />
            {blocked && <p role="alert" className="rounded-2xl bg-partial/15 p-3 text-sm text-partial">{blocked}</p>}
            {viewEx.isCustom ? (
              confirm ? (
                <div className="flex gap-2">
                  <PillButton variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>Keep</PillButton>
                  <PillButton className="flex-1" onClick={() => void removeExercise(viewEx)}>Delete for good</PillButton>
                </div>
              ) : (
                <div className="flex gap-2">
                  <PillButton variant="secondary" className="flex-1" onClick={() => { setEditEx({ ex: viewEx }); closeViews(); }}>Edit</PillButton>
                  <PillButton variant="secondary" className="flex-1" onClick={() => setConfirm(true)}>Delete</PillButton>
                </div>
              )
            ) : (
              <PillButton className="w-full" onClick={() => { setEditEx({ ex: copyOf(viewEx) }); closeViews(); }}>Duplicate as custom</PillButton>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={viewW !== null} onClose={closeViews} title={viewW?.name ?? 'Workout'}>
        {viewW && (
          <div className="space-y-3 pb-2">
            <p className="text-sm capitalize text-muted">{viewW.kind} · about {viewW.estMin} min · {viewW.muscles.join(', ')}</p>
            <ol className="space-y-1.5">
              {viewW.blocks.map((b, i) => <li key={i} className="rounded-2xl bg-card-2 px-3 py-2.5 text-sm font-semibold">{blockText(b, names)}</li>)}
              {viewW.finisher && (
                <li className="rounded-2xl bg-card-2 px-3 py-2.5 text-sm font-semibold">
                  Finisher · {viewW.finisher.minutes} min {viewW.finisher.type === 'amrap' ? 'AMRAP' : 'intervals'}: {viewW.finisher.exerciseIds.map((id) => names.get(id) ?? id).join(' + ')}
                </li>
              )}
            </ol>
            {blocked && <p role="alert" className="rounded-2xl bg-partial/15 p-3 text-sm text-partial">{blocked}</p>}
            {viewW.isCustom ? (
              confirm ? (
                <div className="flex gap-2">
                  <PillButton variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>Keep</PillButton>
                  <PillButton className="flex-1" onClick={() => void removeWorkout(viewW)}>Delete for good</PillButton>
                </div>
              ) : (
                <div className="flex gap-2">
                  <PillButton variant="secondary" className="flex-1" onClick={() => { setEditW({ w: viewW }); closeViews(); }}>Edit</PillButton>
                  <PillButton variant="secondary" className="flex-1" onClick={() => setConfirm(true)}>Delete</PillButton>
                </div>
              )
            ) : (
              <PillButton className="w-full" onClick={() => { setEditW({ w: copyOf(viewW) }); closeViews(); }}>Duplicate as custom</PillButton>
            )}
          </div>
        )}
      </BottomSheet>

      {editEx && (
        <ExerciseEditor
          key={editEx.ex?.id ?? 'new'} open initial={editEx.ex} onClose={() => setEditEx(null)}
          onSave={(e) => { void getRepos().exercises.put(e); setEditEx(null); }}
        />
      )}
      {editW && (
        <WorkoutEditor
          key={editW.w?.id ?? 'new'} open initial={editW.w} exercises={exercises} onClose={() => setEditW(null)}
          onSave={(w) => { void getRepos().workouts.put(w); setEditW(null); }}
        />
      )}
    </main>
  );
}
