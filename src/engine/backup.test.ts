import { describe, it, expect } from 'vitest';
import { backupFileName, makeBackup, parseBackup } from './backup';

describe('backup', () => {
  it('round-trips through JSON', () => {
    const file = makeBackup({ sessions: [{ id: 'a' }], bodyweight: [{ date: '2026-10-01', kg: 70 }] }, new Date(2026, 9, 7));
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.counts.sessions).toBe(1);
      expect(parsed.counts.bodyweight).toBe(1);
      expect(parsed.counts.runs).toBe(0);
      expect(parsed.file.data.sessions).toEqual([{ id: 'a' }]);
    }
  });
  it('names the file by local date', () => {
    expect(backupFileName(new Date(2026, 9, 7))).toBe('forge-backup-2026-10-07.json');
  });
  it('rejects bad input', () => {
    expect(parseBackup('nope')).toEqual({ ok: false, error: 'That file is not valid JSON.' });
    expect(parseBackup('{"app":"other"}').ok).toBe(false);
    expect(parseBackup('{"app":"forge","version":99,"data":{}}').ok).toBe(false);
    expect(parseBackup('{"app":"forge","version":1,"data":{"sessions":5}}').ok).toBe(false);
    expect(parseBackup('{"app":"forge","version":1}').ok).toBe(false);
  });
});
