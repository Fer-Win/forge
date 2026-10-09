'use client';
import { useEffect } from 'react';
import { getRepos } from '@/data';
import { seedIfNeeded } from '@/data/seed';
import { useSettings } from '@/hooks/useData';
import { toDateStr } from '@/lib/dates';

/** Seeds the local database on first run (idempotent) and applies the chosen accent colour. */
export function Bootstrap() {
  const settings = useSettings();
  const accent = settings?.value?.accent;

  useEffect(() => {
    seedIfNeeded(getRepos(), toDateStr()).catch(() => {});
  }, []);

  useEffect(() => {
    if (accent) document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  return null;
}
