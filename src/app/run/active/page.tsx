'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RunType } from '@/data/types';
import { RunPlayer } from '@/components/run/RunPlayer';

const TYPES: RunType[] = ['easy', 'tempo', 'intervals', 'long'];

function Inner() {
  const t = useSearchParams().get('t');
  const type = TYPES.find((x) => x === t);
  if (!type) return null;
  return <RunPlayer type={type} />;
}

export default function ActiveRunPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
