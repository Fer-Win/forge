import { fmtPace } from './geo';

export type Units = 'metric' | 'imperial';

const LB = 2.2046226218;
const MI = 1.609344;

export const weightUnit = (u: Units) => (u === 'imperial' ? 'lb' : 'kg');
export const distUnit = (u: Units) => (u === 'imperial' ? 'mi' : 'km');

const trim = (n: number, d: number) => String(Number(n.toFixed(d)));

/** Weights are always stored in kg; this is display only. */
export function fmtWeight(kg: number, u: Units): string {
  if (kg === 0) return 'BW';
  return u === 'imperial' ? `${trim(kg * LB, 1)} lb` : `${trim(kg, 1)} kg`;
}

/** Display value back to stored kg. */
export function toKg(v: number, u: Units): number {
  return u === 'imperial' ? v / LB : v;
}

export function weightValue(kg: number, u: Units): number {
  return u === 'imperial' ? Number((kg * LB).toFixed(1)) : kg;
}

/** Distances are stored in metres. */
export function fmtDistance(m: number, u: Units): string {
  const v = u === 'imperial' ? m / 1000 / MI : m / 1000;
  return `${v.toFixed(2)} ${distUnit(u)}`;
}

export function distanceValue(m: number, u: Units): number {
  return u === 'imperial' ? m / 1000 / MI : m / 1000;
}

/** Seconds per km -> seconds per display unit. */
export function paceValue(secPerKm: number, u: Units): number {
  return u === 'imperial' ? secPerKm * MI : secPerKm;
}

export const paceSuffix = (u: Units) => `/${distUnit(u)}`;

/** Personal-record value for display; `kind` matches the engine's PR kinds. */
export function fmtPRValue(kind: 'weight' | 'volume' | 'reps' | 'hold', value: number, u: Units): string {
  switch (kind) {
    case 'weight': return fmtWeight(value, u);
    case 'volume': return `${fmtWeight(value, u)} set volume`;
    case 'reps': return `${value} reps`;
    case 'hold': return `${value}s hold`;
  }
}

/** Pace as m:ss in the display unit (null/0 gives a placeholder). */
export function paceLabel(secPerKm: number | null, u: Units): string {
  return fmtPace(secPerKm === null || secPerKm <= 0 ? null : paceValue(secPerKm, u));
}

/** Distance number only, two decimals, in the display unit. */
export const distText = (m: number, u: Units): string => distanceValue(m, u).toFixed(2);
