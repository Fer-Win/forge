'use client';
import { useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { getRepos } from '@/data';
import type { DayAssignment } from '@/data/types';
import { checkWeek, runATypeForWeek } from '@/engine/schedule';
import { parseDateStr, startOfWeek, weekdayIndex } from '@/lib/dates';
import { describeAssignment, WEEKDAYS, WEEKDAYS_LONG } from '@/lib/labels';
import { usePlanWeek, useRunProgram, useSettings, useToday, useWorkoutMap } from '@/hooks/useData';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SwapSheet } from '@/components/today/SwapSheet';

type Row = { id: string; assignment: DayAssignment };
const ROW_H = 72;

export default function PlanPage() {
  const today = useToday();
  const week = usePlanWeek();
  const workouts = useWorkoutMap();
  const program = useRunProgram();
  const settings = useSettings();
  const [rows, setRows] = useState<Row[] | null>(null);
  const rowsRef = useRef<Row[] | null>(null);
  rowsRef.current = rows;
  const [editing, setEditing] = useState<number | null>(null);

  // The page owns the list once loaded so dragging stays smooth; every change is saved right away.
  useEffect(() => {
    if (rows === null && week && week.length === 7) {
      setRows([...week].sort((a, b) => a.weekday - b.weekday).map((d, i) => ({ id: `row-${i}`, assignment: d.assignment })));
    }
  }, [week, rows]);

  async function persist(list: Row[]) {
    await getRepos().plan.setWeek(list.map((r, i) => ({ weekday: i, assignment: r.assignment })));
  }

  if (!rows || !workouts || !today) {
    return (
      <main>
        <ScreenHeader title="Plan" subtitle="Your week" />
        <Skeleton className="mt-6 h-[540px]" />
      </main>
    );
  }

  const startDate = program?.value?.startDate ?? settings?.value?.startDate ?? today;
  const runA = runATypeForWeek(startDate, startOfWeek(today));
  const warnings = checkWeek(rows.map((r) => r.assignment), workouts, { runAIntervals: runA === 'intervals' });
  const todayIdx = weekdayIndex(parseDateStr(today));
  const sessions = rows.filter((r) => r.assignment.type !== 'rest').length;

  function choose(a: DayAssignment) {
    if (editing === null) return;
    const next = rowsRef.current!.map((r, i) => (i === editing ? { ...r, assignment: a } : r));
    setRows(next);
    setEditing(null);
    void persist(next);
  }

  return (
    <main>
      <ScreenHeader title="Plan" subtitle={`${sessions} sessions · drag to move, tap to change`} />

      {warnings.length > 0 && (
        <ul className="mt-5 space-y-2" aria-label="Heads up">
          {warnings.map((w, i) => (
            <li key={i} className="rounded-2xl border border-partial/40 bg-white/5 p-4 text-sm">
              <span className="font-bold text-partial">{WEEKDAYS_LONG[w.weekday]}: </span>
              {w.message}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex gap-3">
        <div className="flex flex-col gap-2" aria-hidden>
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`flex w-10 items-center text-sm font-extrabold ${i === todayIdx ? 'text-accent' : 'text-muted'}`}
              style={{ height: ROW_H }}
            >
              {d}
            </div>
          ))}
        </div>
        <Reorder.Group
          as="ul"
          axis="y"
          values={rows}
          onReorder={setRows}
          className="flex min-w-0 flex-1 flex-col gap-2"
        >
          {rows.map((r, i) => {
            const d = describeAssignment(r.assignment, workouts, runA);
            return (
              <PlanRow
                key={r.id}
                row={r}
                label={`${WEEKDAYS_LONG[i]}: ${d.title}`}
                title={d.title}
                sub={d.sub}
                est={d.est}
                kind={d.kind}
                warn={warnings.some((w) => w.weekday === i)}
                onEdit={() => setEditing(i)}
                onDragEnd={() => void persist(rowsRef.current!)}
              />
            );
          })}
        </Reorder.Group>
      </div>

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing !== null ? `Change ${WEEKDAYS_LONG[editing]}` : 'Change day'}
      >
        {editing !== null && (
          <SwapSheet
            workouts={[...workouts.values()]}
            current={rows[editing]!.assignment}
            onChoose={choose}
          />
        )}
      </BottomSheet>
    </main>
  );
}

function PlanRow({
  row, label, title, sub, est, kind, warn, onEdit, onDragEnd,
}: {
  row: Row; label: string; title: string; sub: string; est: string; kind: 'workout' | 'run' | 'rest';
  warn: boolean; onEdit: () => void; onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const dot = kind === 'workout' ? 'bg-accent' : kind === 'run' ? 'bg-white/70' : 'bg-rest';
  return (
    <Reorder.Item
      as="li"
      value={row}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, zIndex: 10 }}
      className="flex items-center rounded-card border border-hair bg-card"
      style={{ height: ROW_H }}
    >
      <button
        type="button"
        aria-label={`${label}. Change session`}
        onClick={onEdit}
        className="press flex h-full min-w-0 flex-1 items-center gap-3 rounded-l-card pl-4 text-left"
      >
        <span className={`h-3 w-3 shrink-0 rounded-full ${dot}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{title}</span>
          <span className="block truncate text-sm text-muted">{sub}</span>
        </span>
        {est && <span className="num shrink-0 text-sm font-semibold text-muted">{est}</span>}
        {warn && <span className="text-lg font-extrabold text-partial" aria-label="Heads up">!</span>}
      </button>
      <button
        type="button"
        aria-label={`Drag ${title} to another day`}
        onPointerDown={(e) => controls.start(e)}
        className="flex h-full w-14 shrink-0 items-center justify-center rounded-r-card text-muted"
        style={{ touchAction: 'none' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M5 9h14M5 15h14" />
        </svg>
      </button>
    </Reorder.Item>
  );
}
