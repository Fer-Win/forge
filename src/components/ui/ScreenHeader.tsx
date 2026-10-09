import type { ReactNode } from 'react';

export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {subtitle && <p className="text-sm font-medium text-muted">{subtitle}</p>}
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}
