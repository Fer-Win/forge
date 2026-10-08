import { addDays, startOfWeek } from '../lib/dates';
import { statusForDate, type DayData } from './dayStatus';

const MAX_LOOKBACK_DAYS = 400;

/**
 * Consecutive days with a completed or partial session, ending today.
 * Rest days neither add to nor break the streak; today still pending does not break it;
 * a missed day ends it. Days before the start date are ignored.
 */
export function computeStreak(today: string, startDate: string, data: DayData): number {
  let streak = 0;
  let d = today;
  for (let i = 0; i < MAX_LOOKBACK_DAYS && d >= startDate; i++) {
    const s = statusForDate(d, today, data);
    if (s === 'completed' || s === 'partial') streak++;
    else if (s === 'missed') break;
    // 'rest' and 'pending' (today only) are neutral
    d = addDays(d, -1);
  }
  return streak;
}

export interface WeekProgress {
  planned: number;
  completed: number;
  partial: number;
  /** 0..1, partial days count half */
  fraction: number;
}

export function weekProgress(today: string, data: DayData): WeekProgress {
  const monday = startOfWeek(today);
  let planned = 0;
  let completed = 0;
  let partial = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    const s = statusForDate(date, today, data);
    if (s === 'rest') continue;
    planned++;
    if (s === 'completed') completed++;
    else if (s === 'partial') partial++;
  }
  const fraction = planned === 0 ? 0 : Math.min(1, (completed + partial * 0.5) / planned);
  return { planned, completed, partial, fraction };
}
