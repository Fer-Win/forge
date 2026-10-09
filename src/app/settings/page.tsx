'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getRepos } from '@/data';
import { backupFileName, makeBackup, parseBackup, type BackupFile } from '@/engine/backup';
import { eveningMinutes } from '@/engine/reminders';
import { useSettings } from '@/hooks/useData';
import { patchSettings } from '@/lib/actions';
import { notify, permission, requestPermission, setPeriodicReminders, type Perm } from '@/services/notifications';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PillButton } from '@/components/ui/PillButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toggle } from '@/components/ui/Toggle';

const ACCENTS = [
  { name: 'Orange', value: '#FC4C02' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
];

const TABLE_NAMES: Record<string, string> = {
  sessions: 'workouts', runs: 'runs', bodyweight: 'weigh-ins', exercises: 'exercises', workouts: 'workout templates',
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6" aria-labelledby={id}>
      <h2 id={id} className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default function SettingsPage() {
  const router = useRouter();
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [perm, setPerm] = useState<Perm>('default');
  useEffect(() => { setPerm(permission()); }, []);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: BackupFile; counts: Record<string, number> } | null>(null);

  const st = settings?.value;
  const back = () => (window.history.length > 1 ? router.back() : router.push('/today/'));

  const header = (
    <div>
      <button type="button" onClick={back} className="press -ml-3 flex min-h-tap items-center gap-1 px-3 text-sm font-bold text-muted">
        <span aria-hidden>←</span> Back
      </button>
      <ScreenHeader title="Settings" />
    </div>
  );

  if (!st) {
    return (
      <main>
        {header}
        <Skeleton className="mt-6 h-40" />
      </main>
    );
  }

  async function setReminders(on: boolean) {
    setMsg(null);
    if (on) {
      const p = permission() === 'granted' ? 'granted' : await requestPermission();
      setPerm(p);
      if (p !== 'granted') {
        setMsg(p === 'unsupported' ? 'This browser does not support notifications.' : 'Notifications are blocked. Allow them in your browser or site settings, then try again.');
        return;
      }
      await patchSettings({ reminders: true });
      void setPeriodicReminders(true);
      void notify('Reminders are on', `You will get a nudge at ${st!.reminderTime} on training days.`, 'forge-test');
    } else {
      await patchSettings({ reminders: false });
      void setPeriodicReminders(false);
    }
  }

  async function exportData() {
    const data = await getRepos().exportAll();
    const blob = new Blob([JSON.stringify(makeBackup(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg('Backup saved to your downloads.');
  }

  async function onFile(f: File | undefined) {
    setMsg(null);
    if (!f) return;
    const parsed = parseBackup(await f.text());
    if (!parsed.ok) { setMsg(parsed.error); return; }
    setPending({ file: parsed.file, counts: parsed.counts });
  }

  async function confirmImport() {
    if (!pending) return;
    await getRepos().importAll(pending.file.data);
    window.location.href = '/today/';
  }

  const summary = pending
    ? Object.entries(TABLE_NAMES).map(([k, label]) => `${pending.counts[k] ?? 0} ${label}`).join(', ')
    : '';

  return (
    <main>
      {header}

      <Section id="units-h" title="Units">
        <Segmented<'metric' | 'imperial'>
          label="Units" value={st.units} onChange={(v) => void patchSettings({ units: v })}
          options={[{ value: 'metric', label: 'kg · km' }, { value: 'imperial', label: 'lb · mi' }]}
        />
      </Section>

      <Section id="feedback-h" title="Feedback">
        <Toggle label="Sound" hint="Beeps for countdowns and finishes" checked={st.sound} onChange={(v) => void patchSettings({ sound: v })} />
        <Toggle label="Haptics" hint="Vibration on sets, rests and segments" checked={st.haptics} onChange={(v) => void patchSettings({ haptics: v })} />
        <Toggle label="Voice cues" hint="Spoken run segments" checked={st.speech} onChange={(v) => void patchSettings({ speech: v })} />
        <Toggle label="GPS tracking" hint="Distance and route on runs" checked={st.gps !== false} onChange={(v) => void patchSettings({ gps: v })} />
      </Section>

      <Section id="accent-h" title="Accent colour">
        <div role="radiogroup" aria-label="Accent colour" className="flex gap-3 rounded-card border border-hair bg-card p-3">
          {ACCENTS.map((a) => {
            const on = st.accent.toLowerCase() === a.value.toLowerCase();
            return (
              <button
                key={a.value} type="button" role="radio" aria-checked={on} aria-label={a.name}
                onClick={() => void patchSettings({ accent: a.value })}
                className={`press flex h-12 w-12 items-center justify-center rounded-full ${on ? 'ring-2 ring-fg ring-offset-2 ring-offset-card' : ''}`}
                style={{ background: a.value }}
              >
                {on && <span className="text-lg font-black text-white" aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section id="reminders-h" title="Reminders">
        <Toggle label="Training reminders" hint="A nudge on training days" checked={!!st.reminders} onChange={(v) => void setReminders(v)} />
        {st.reminders && (perm === 'denied' || perm === 'unsupported') && (
          <p role="alert" className="px-1 text-sm text-partial">Notifications are blocked for Forge in this browser, so reminders cannot appear.</p>
        )}
        <label className="flex min-h-[56px] items-center justify-between gap-3 rounded-card border border-hair bg-card px-4 py-2">
          <span className="font-semibold">Reminder time</span>
          <input
            type="time" aria-label="Reminder time" value={st.reminderTime}
            onChange={(e) => e.target.value && void patchSettings({ reminderTime: e.target.value, lastDailyNudge: undefined, lastEveningNudge: undefined })}
            className="num min-h-tap rounded-xl border border-hair bg-card-2 px-3 text-base text-fg"
          />
        </label>
        <p className="px-1 text-sm text-muted">
          If nothing is logged by {hhmm(eveningMinutes(st.reminderTime))} you get one more nudge. Chrome cannot promise exact timing for a web app, so a reminder can arrive late, especially if battery saver is on. Installing Forge to your home screen helps.
        </p>
      </Section>

      <Section id="data-h" title="Your data">
        <p className="px-1 text-sm text-muted">Everything lives on this phone. Export a backup now and then, or to move to a new device.</p>
        <PillButton variant="secondary" className="w-full" onClick={() => void exportData()}>Export backup</PillButton>
        <PillButton variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>Import backup</PillButton>
        <input
          ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Backup file"
          onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }}
        />
      </Section>

      {msg && <p role="status" className="mt-4 rounded-card border border-hair bg-card p-4 text-sm" data-testid="settings-msg">{msg}</p>}

      <p className="mt-8 text-center text-xs text-muted">Forge 0.1 · single user, no account</p>

      <BottomSheet open={pending !== null} onClose={() => setPending(null)} title="Replace your data?">
        <p className="text-sm text-muted">This backup holds {summary}. Importing replaces everything currently on this device.</p>
        <div className="mt-4 flex gap-2 pb-2">
          <PillButton variant="secondary" className="flex-1" onClick={() => setPending(null)}>Cancel</PillButton>
          <PillButton className="flex-1" onClick={() => void confirmImport()}>Replace everything</PillButton>
        </div>
      </BottomSheet>
    </main>
  );
}
