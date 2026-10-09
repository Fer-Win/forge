import type { ReactNode } from 'react';
import { parseDateStr } from '@/lib/dates';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2026-10-07' -> '7 Oct' */
export function shortDate(d: string): string {
  const x = parseDateStr(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

export function Card({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-card border border-hair bg-card p-5" aria-labelledby={id}>
      <div className="flex min-h-[28px] items-center justify-between gap-3">
        <h2 id={id} className="text-xs font-bold uppercase tracking-wide text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-card-2 px-3 py-2.5">
      <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="num mt-0.5 truncate text-lg" data-testid={testId}>{value}</p>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-muted">{children}</p>;
}
