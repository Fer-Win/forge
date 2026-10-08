'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toDateStr } from '@/lib/dates';
import { WorkoutPlayer } from '@/components/workout/WorkoutPlayer';

function Inner() {
  const params = useSearchParams();
  const workoutId = params.get('w') ?? '';
  const dateParam = params.get('d');
  // The local date is only known on the client; waiting for mount avoids a mismatch with the static export.
  const [fallback, setFallback] = useState<string | null>(null);
  useEffect(() => setFallback(toDateStr()), []);
  const date = dateParam ?? fallback;
  if (!workoutId || !date) return null;
  return <WorkoutPlayer workoutId={workoutId} date={date} />;
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
