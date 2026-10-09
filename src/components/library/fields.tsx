'use client';
import type { ReactNode } from 'react';

export const inputCls =
  'min-h-tap w-full rounded-2xl border border-hair bg-card-2 px-4 text-base text-fg placeholder:text-muted';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Compact - value + control for forms. */
export function MiniStepper({
  label, value, onChange, min = 0, max = 999, step = 1, suffix = '',
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const btn = 'press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card-2 text-2xl font-bold disabled:opacity-30';
  return (
    <div>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex items-center justify-between gap-1 rounded-2xl border border-hair bg-card-2 p-1">
        <button type="button" className={btn} aria-label={`Decrease ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <output className="num min-w-0 flex-1 text-center text-lg" aria-label={label}>{value}{suffix}</output>
        <button type="button" className={btn} aria-label={`Increase ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </div>
    </div>
  );
}
