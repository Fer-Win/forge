'use client';
import { useEffect } from 'react';
import { getRepos } from '@/data';
import { seedIfNeeded } from '@/data/seed';
import { toDateStr } from '@/lib/dates';

/** Seeds the local database on first run (idempotent). */
export function Bootstrap() {
  useEffect(() => {
    seedIfNeeded(getRepos(), toDateStr()).catch(() => {});
  }, []);
  return null;
}
