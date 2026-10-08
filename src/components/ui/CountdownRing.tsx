'use client';
import type { ReactNode } from 'react';

/**
 * Circular countdown. Unlike Ring it follows the value directly (no spring), because the value is
 * recomputed from timestamps several times a second and must never lag behind the clock.
 */
export function CountdownRing({
  fraction, size = 260, stroke = 12, color = 'var(--accent)', label, children,
}: {
  fraction: number; // 1 = full, 0 = empty
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '100%' }} role={label ? 'img' : undefined} aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - f)}
          style={{ transition: 'stroke-dashoffset 220ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
