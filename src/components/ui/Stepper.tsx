'use client';

/** Big +/- stepper for logging reps and weight with a thumb. */
export function Stepper({
  label, value, step, min = 0, max = 999, format, onChange, testId,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  testId?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  const btn = 'press flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-hair bg-card-2 text-3xl font-bold disabled:opacity-30';
  return (
    <div className="rounded-card border border-hair bg-card p-3">
      <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <button type="button" className={btn} aria-label={`Decrease ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
          −
        </button>
        <output className="num min-w-0 flex-1 text-center text-5xl" aria-label={label} data-testid={testId}>
          {format ? format(value) : value}
        </output>
        <button type="button" className={btn} aria-label={`Increase ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
          +
        </button>
      </div>
    </div>
  );
}
