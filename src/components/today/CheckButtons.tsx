import type { CheckStatus } from '@/data/types';

/** Done / skip pair. Pressing the active one again clears it (undo). */
export function CheckButtons({
  name, state, onDone, onSkip,
}: { name: string; state: CheckStatus | undefined; onDone: () => void; onSkip: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={`${name}: mark done`}
        aria-pressed={state === 'done'}
        onClick={onDone}
        className={`press flex h-12 w-12 items-center justify-center rounded-full ${
          state === 'done' ? 'bg-done text-black' : 'border border-hair bg-card-2 text-muted'
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={`${name}: skip`}
        aria-pressed={state === 'skipped'}
        onClick={onSkip}
        className={`press flex h-12 w-12 items-center justify-center rounded-full ${
          state === 'skipped' ? 'bg-white/25 text-fg' : 'border border-hair bg-card-2 text-muted'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 5l8 7-8 7M18 5v14" />
        </svg>
      </button>
    </div>
  );
}
