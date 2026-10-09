/** JSON export / import of all user data. The envelope is versioned so future schema changes can migrate. */
export const BACKUP_VERSION = 1;

export const BACKUP_TABLES = [
  'exercises', 'workouts', 'planDays', 'planOverrides', 'exerciseChecks',
  'sessions', 'runs', 'runProgram', 'bodyweight', 'settings', 'dayPrefs',
] as const;

export interface BackupFile {
  app: 'forge';
  version: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

export function makeBackup(data: Record<string, unknown[]>, now: Date = new Date()): BackupFile {
  return { app: 'forge', version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `forge-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

export type ParsedBackup =
  | { ok: true; file: BackupFile; counts: Record<string, number> }
  | { ok: false; error: string };

/** Validates a backup file's text. Unknown tables are dropped; missing ones import as empty. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'That file is not a Forge backup.' };
  const o = raw as Record<string, unknown>;
  if (o.app !== 'forge') return { ok: false, error: 'That file is not a Forge backup.' };
  if (typeof o.version !== 'number' || o.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup comes from a newer version of Forge.' };
  }
  if (!o.data || typeof o.data !== 'object') return { ok: false, error: 'The backup has no data.' };
  const src = o.data as Record<string, unknown>;
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const t of BACKUP_TABLES) {
    const rows = src[t];
    if (rows !== undefined && !Array.isArray(rows)) return { ok: false, error: `The "${t}" section is damaged.` };
    data[t] = rows ?? [];
    counts[t] = data[t].length;
  }
  return {
    ok: true,
    file: { app: 'forge', version: o.version, exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : '', data },
    counts,
  };
}
