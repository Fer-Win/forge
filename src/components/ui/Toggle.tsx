'use client';

export function Toggle({
  label, hint, checked, onChange, disabled,
}: { label: string; hint?: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="press flex min-h-[56px] w-full items-center justify-between gap-3 rounded-card border border-hair bg-card px-4 py-2 text-left disabled:opacity-70"
    >
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span className={`flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors ${checked ? 'bg-accent' : 'bg-white/15'}`} aria-hidden>
        <span className={`h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}
