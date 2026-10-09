'use client';
import { useState } from 'react';
import type { DayData } from '@/engine/dayStatus';
import { monthGrid, weekStreak, type HeatCell } from '@/engine/stats';
import { addDays, parseDateStr, toDateStr } from '@/lib/dates';
import { Flame } from '@/components/ui/Flame';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Dumbbell() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
    </svg>
  );
}
function Shoe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 16.5V11l3.5-1.5 2 2.2c1.2.6 2.6.8 4 .8 2.8 0 5.5 1.2 7.5 2.6v1.4H3zM3 16.5h18" />
    </svg>
  );
}

const WORD: Record<string, string> = {
  completed: 'completed', partial: 'partly done', missed: 'missed', rest: 'rest day', pending: 'planned today', future: 'upcoming', before: 'before you started',
};

function Day({ c, today }: { c: HeatCell; today: string }) {
  const n = Number(c.date.slice(8));
  const isToday = c.date === today;
  const base = 'relative mx-auto flex h-11 w-11 items-center justify-center rounded-full';
  const ring = isToday ? ' ring-2 ring-accent ring-offset-2 ring-offset-card' : '';
  const label = `${c.date}: ${WORD[c.status]}${c.run ? ', run' : ''}`;
  const common = { 'data-status': c.status, role: 'img', 'aria-label': label, title: label } as const;
  if (c.status === 'completed') {
    return <div {...common} className={`${base} bg-accent text-white${ring}`}>{c.run ? <Shoe /> : <Dumbbell />}</div>;
  }
  if (c.status === 'partial') {
    return <div {...common} className={`${base} border-2 border-partial bg-partial/15 text-partial${ring}`}>{c.run ? <Shoe /> : <Dumbbell />}</div>;
  }
  if (c.status === 'missed') {
    return (
      <div {...common} className={`${base} text-fg/60${ring}`}>
        <span className="num text-[15px]">{n}</span>
        <span className="absolute bottom-[3px] h-[5px] w-[5px] rounded-full bg-[#ff453a]" />
      </div>
    );
  }
  const tone = c.status === 'pending' ? 'text-fg' : c.status === 'rest' ? 'text-muted/60' : 'text-muted/35';
  return <div {...common} className={`${base} ${tone}${ring}`}><span className="num text-[15px]">{n}</span></div>;
}

/** Strava-style month calendar: a badge on every day you trained, a check beside each week that counts toward the streak. */
export function StreakCalendar({ today, startDate, data }: { today: string; startDate: string; data: DayData }) {
  const [offset, setOffset] = useState(0);
  const t = parseDateStr(today);
  const shown = new Date(t.getFullYear(), t.getMonth() + offset, 1);
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const rows = monthGrid(today, startDate, data, year, month);
  const streak = weekStreak(today, startDate, data);

  // the loaded data reaches about four months back
  const earliest = startDate > addDays(today, -118) ? startDate : addDays(today, -118);
  const prevEnd = toDateStr(new Date(year, month, 0));
  const canPrev = prevEnd >= earliest;
  const canNext = offset < 0;
  const nav = 'press flex h-12 w-12 items-center justify-center rounded-full text-2xl text-muted disabled:opacity-25';

  return (
    <div data-testid="heatmap">
      <div className="mt-2 flex items-center justify-between">
        <button type="button" className={`${nav} -ml-3`} aria-label="Previous month" disabled={!canPrev} onClick={() => setOffset(offset - 1)}>‹</button>
        <h3 className="text-xl font-extrabold" data-testid="month-title">{MONTHS[month]} {year}</h3>
        <button type="button" className={`${nav} -mr-3`} aria-label="Next month" disabled={!canNext} onClick={() => setOffset(offset + 1)}>›</button>
      </div>

      <div className="mt-2 flex gap-8">
        <div>
          <p className="text-xs text-muted">Your streak</p>
          <p className="flex items-center gap-1 text-xl font-extrabold">
            <Flame size={20} className={streak.weeks > 0 ? 'text-accent' : 'text-rest'} />
            <span className="num" data-testid="week-streak">{streak.weeks}</span> {streak.weeks === 1 ? 'week' : 'weeks'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Streak activities</p>
          <p className="num text-xl" data-testid="streak-days">{streak.days}</p>
        </div>
      </div>

      <div className="mt-4 grid items-center gap-y-1.5" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr)) 40px' }}>
        {DAYS.map((d, i) => <span key={i} className="pb-1 text-center text-xs font-bold text-muted">{d}</span>)}
        <span />
        {rows.map((r) => (
          <div key={r.weekStart} className="contents">
            {r.cells.map((c, i) => (c ? <Day key={c.date} c={c} today={today} /> : <span key={i} />))}
            <div className="flex justify-center" data-week-hit={String(r.hit)}>
              {r.hit ? (
                <span role="img" aria-label="Week counts toward your streak" className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
              ) : r.hit === false ? (
                <span role="img" aria-label="Week did not count" className={`h-7 w-7 rounded-full border-2 ${r.current ? 'border-accent/60' : 'border-white/10'}`} />
              ) : (
                <span className="h-7 w-7 rounded-full border border-dashed border-white/10" aria-hidden />
              )}
            </div>
          </div>
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted" aria-label="Legend">
        <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white"><span className="scale-75"><Dumbbell /></span></span>Finished</li>
        <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-partial bg-partial/15 text-partial"><span className="scale-75"><Dumbbell /></span></span>Partly done</li>
        <li className="flex items-center gap-2"><span className="relative flex h-6 w-6 items-center justify-center text-fg/60">7<span className="absolute bottom-0 h-[4px] w-[4px] rounded-full bg-[#ff453a]" /></span>Missed</li>
        <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center text-muted/60">7</span>Rest or upcoming</li>
        <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center text-fg/80"><Shoe /></span>Run</li>
        <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>Week counts</li>
      </ul>
      <p className="mt-3 text-xs text-muted">A week counts toward your streak when you finish at least half of its planned days.</p>
    </div>
  );
}
