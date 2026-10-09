import { readFileSync } from 'fs';
import { expect, type Page } from '@playwright/test';

/** Monday 5 Oct 2026, 09:00 local time: the default plan puts Push on Monday. */
export const MONDAY = new Date('2026-10-05T09:00:00');

/** Walks the three onboarding steps with the defaults. */
export async function onboard(page: Page) {
  await page.goto('/onboarding/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start training' }).click();
  await page.waitForURL('**/today/');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
}

/** Every visible link/button must be at least 48px in both directions. */
export async function expectTapTargets(page: Page) {
  const small = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('a, button, input, [role="radio"], [role="switch"]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') return;
      if (r.height < 47.5 || r.width < 47.5) {
        out.push(`${el.tagName} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return out;
  });
  expect(small, 'tap targets under 48px').toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Writes rows straight into an IndexedDB store. Reload afterwards: live queries do not see raw writes. */
export async function seedStore(page: Page, store: string, rows: unknown[]) {
  await page.evaluate(
    ([s, r]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('forge');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(s as string, 'readwrite');
          for (const row of r as unknown[]) tx.objectStore(s as string).put(row);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

export async function countStore(page: Page, store: string): Promise<number> {
  return page.evaluate(
    (s) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('forge');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction(s).objectStore(s).count();
          req.onsuccess = () => { db.close(); resolve(req.result); };
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  );
}

/** A saved session with one exercise. `sets` are [weightKg, reps]. */
export function mkSession(id: string, date: string, exerciseId: string, sets: [number, number][], status: 'done' | 'partial' = 'partial') {
  const startedAt = new Date(`${date}T08:00:00`).getTime();
  return {
    id, date, workoutId: 'w-push', status, startedAt, endedAt: startedAt + 2_400_000,
    intensity: 'normal', totalVolume: sets.reduce((a, [kg, r]) => a + kg * r, 0),
    sets: sets.map(([weightKg, reps], i) => ({ exerciseId, setNo: i + 1, reps, weightKg, doneAt: startedAt + i * 60_000 })),
  };
}

/** Width and height from a PNG file's header. */
export function pngSize(path: string): { width: number; height: number } {
  const b = readFileSync(path);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** Desktop Chrome may have navigator.share; remove it so the share button falls back to a download. */
export async function noNativeShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
}
