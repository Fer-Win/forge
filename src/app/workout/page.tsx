'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWorkoutMap } from '@/hooks/useData';

function Inner() {
  const params = useSearchParams();
  const id = params.get('w') ?? '';
  const workouts = useWorkoutMap();
  const w = workouts?.get(id);
  return (
    <main
      className="mx-auto min-h-dvh max-w-md px-4"
      style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
    >
      <p className="text-sm font-medium text-muted">Guided workout</p>
      <h1 className="text-3xl font-extrabold tracking-tight">{w?.name ?? 'Workout'}</h1>
      <div className="mt-6 rounded-card border border-hair bg-card p-5 text-muted">
        The guided workout screen with timers and set logging arrives in Phase 3.
      </div>
      <Link href="/today/" className="press mt-6 inline-flex min-h-tap items-center rounded-full bg-card-2 px-6 font-bold">
        Back to Today
      </Link>
    </main>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
