/** Local-date helpers. Dates are 'YYYY-MM-DD' strings in the device's local time zone. */
export function toDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}
/** Monday = 0 ... Sunday = 6 */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}
export function addDays(s: string, n: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
export function startOfWeek(s: string): string {
  return addDays(s, -weekdayIndex(parseDateStr(s)));
}
/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}
