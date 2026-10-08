'use client';
import { motion, useReducedMotion } from 'framer-motion';

const COLORS = ['#FC4C02', '#34C759', '#FFB020', '#FFFFFF', '#5AC8FA'];

/** Deterministic pseudo-random in [0,1) so the burst is the same on every render. */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function Confetti({ count = 44 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-dvh overflow-hidden" aria-hidden data-testid="confetti">
      {Array.from({ length: count }, (_, i) => {
        const left = rnd(i, 1) * 100;
        const drift = (rnd(i, 2) - 0.5) * 140;
        const size = 6 + rnd(i, 3) * 8;
        return (
          <motion.span
            key={i}
            className="absolute top-0 block rounded-[2px]"
            style={{ left: `${left}%`, width: size, height: size * 1.6, background: COLORS[i % COLORS.length] }}
            initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
            animate={{ y: '105dvh', x: drift, rotate: 360 * (rnd(i, 4) > 0.5 ? 1 : -1) * (1 + rnd(i, 5)), opacity: [1, 1, 0] }}
            transition={{ duration: 2.2 + rnd(i, 6) * 1.6, delay: rnd(i, 7) * 0.5, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}
