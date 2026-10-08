'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/today/', label: 'Today', icon: 'M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z' },
  { href: '/plan/', label: 'Plan', icon: 'M5 4h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zm1 5v10h12V9zm2-6v3m8-3v3' },
  { href: '/run/', label: 'Run', icon: 'M13 4a2 2 0 110 4 2 2 0 010-4zM8 21l3-6-2-3 3-3 3 3h3M9 9l-3 2' },
  { href: '/progress/', label: 'Progress', icon: 'M4 20V10m6 10V4m6 16v-7m4 7H2' },
  { href: '/library/', label: 'Library', icon: 'M4 5h4v14H4zm6 0h4v14h-4zm6 2l4 1-3 11-4-1z' },
] as const;

export function TabBar() {
  const path = usePathname() ?? '';
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-bg/95 backdrop-blur"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = path.startsWith(t.href.slice(0, -1));
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`press flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
