'use client';
import { useEffect, useState } from 'react';
import { dayPlan, statusForDate } from '@/engine/dayStatus';
import { dueNudges, nudgeText, type ReminderState } from '@/engine/reminders';
import { useDayData, useSettings, useToday } from '@/hooks/useData';
import { patchSettings } from '@/lib/actions';
import { notify, permission } from '@/services/notifications';

/**
 * Sends the daily and evening nudges while Forge is open in the background. (With the app closed the
 * service worker's periodic sync can do the same, when Chrome allows it.) Each nudge is sent once per day.
 */
export function Reminders() {
  const today = useToday();
  const settings = useSettings();
  const data = useDayData(today);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const t = setInterval(bump, 30_000);
    document.addEventListener('visibilitychange', bump);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', bump);
    };
  }, []);

  useEffect(() => {
    const st = settings?.value;
    if (!today || !data || !st?.reminders || permission() !== 'granted') return;
    // Someone looking at the app does not need a notification about it.
    if (document.visibilityState === 'visible') return;
    const now = new Date();
    const status = statusForDate(today, today, data);
    const state: ReminderState = {
      enabled: true,
      time: st.reminderTime,
      nowMin: now.getHours() * 60 + now.getMinutes(),
      today,
      trainsToday: dayPlan(today, data).assignment.type !== 'rest',
      loggedToday:
        status === 'completed' || status === 'partial' ||
        data.sessions.some((s) => s.date === today) || data.runs.some((r) => r.date === today),
      lastDaily: st.lastDailyNudge,
      lastEvening: st.lastEveningNudge,
    };
    const due = dueNudges(state)[0];
    if (!due) return;
    const text = nudgeText(due);
    void patchSettings(due === 'daily' ? { lastDailyNudge: today } : { lastEveningNudge: today }).then(() =>
      notify(text.title, text.body, `forge-${due}`),
    );
  }, [today, settings, data, tick]);

  return null;
}
