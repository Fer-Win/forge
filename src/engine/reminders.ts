/**
 * When to nudge. Chrome cannot promise exact background notifications for a web app, so this decides
 * what is due whenever the app (or its periodic background sync) gets a chance to look.
 */
export type Nudge = 'daily' | 'evening';

export interface ReminderState {
  enabled: boolean;
  /** HH:mm the user chose. */
  time: string;
  /** Minutes since midnight, local. */
  nowMin: number;
  today: string;
  /** Today has training planned (not a rest day). */
  trainsToday: boolean;
  /** A session, run or exercise check-off is already recorded today. */
  loggedToday: boolean;
  lastDaily?: string;
  lastEvening?: string;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Evening "not logged yet" nudge time: 20:00, or 21:00 if the daily reminder is already after 19:00. */
export function eveningMinutes(daily: string): number {
  return toMinutes(daily) >= 19 * 60 ? 21 * 60 : 20 * 60;
}

/** Nudges that are due right now and have not been sent today. Nothing on rest days or after logging. */
export function dueNudges(s: ReminderState): Nudge[] {
  if (!s.enabled || !s.trainsToday || s.loggedToday) return [];
  const out: Nudge[] = [];
  const dailyAt = toMinutes(s.time);
  const eveningAt = eveningMinutes(s.time);
  if (s.nowMin >= eveningAt) {
    // by evening only the "not logged yet" message is useful
    if (s.lastEvening !== s.today) out.push('evening');
  } else if (s.nowMin >= dailyAt && s.lastDaily !== s.today) out.push('daily');
  return out;
}

export function nudgeText(n: Nudge): { title: string; body: string } {
  return n === 'daily'
    ? { title: "Time to train", body: "Today's session is ready. One tap to start." }
    : { title: 'Not logged yet', body: 'A short session still counts. Keep your week moving.' };
}

/** Milliseconds until the next moment a nudge could become due today (for an in-app timer); null if none. */
export function msUntilNext(s: ReminderState, nowMs: number): number | null {
  if (!s.enabled || !s.trainsToday || s.loggedToday) return null;
  const targets = [toMinutes(s.time), eveningMinutes(s.time)].filter((t) => t > s.nowMin);
  if (targets.length === 0) return null;
  const next = Math.min(...targets);
  return Math.max(1000, (next - s.nowMin) * 60_000 - (nowMs % 60_000));
}
