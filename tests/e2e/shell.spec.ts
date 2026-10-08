import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { onboard } from './helpers';

const TABS = [
  { name: 'Today', path: '/today/' },
  { name: 'Plan', path: '/plan/' },
  { name: 'Run', path: '/run/' },
  { name: 'Progress', path: '/progress/' },
  { name: 'Library', path: '/library/' },
];

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await onboard(page);
});

for (const width of [360, 412, 430]) {
  test(`tabs render at ${width}px with no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 860 });
    await page.goto('/today/');
    for (const t of TABS) {
      await page.getByRole('link', { name: t.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(t.path));
      await expect(page.getByRole('heading', { name: t.name, exact: true, level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${t.name} @${width}`).toBeLessThanOrEqual(0);
      if (width === 412) await page.screenshot({ path: `shots/tab-${t.name.toLowerCase()}.png` });
    }
  });
}

test('tab bar tap targets are at least 48px', async ({ page }) => {
  await page.goto('/today/');
  const links = page.locator('nav[aria-label="Main"] a');
  expect(await links.count()).toBe(5);
  for (let i = 0; i < 5; i++) {
    const box = await links.nth(i).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.width).toBeGreaterThanOrEqual(48);
  }
});

test('manifest is valid and installable metadata is present', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.display).toBe('standalone');
  expect(m.theme_color).toBe('#0B0B0F');
  expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
});

test('seeds IndexedDB on first load', async ({ page }) => {
  await page.goto('/today/');
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const open = indexedDB.open('forge');
            open.onerror = () => resolve(-1);
            open.onsuccess = () => {
              const db = open.result;
              if (!db.objectStoreNames.contains('exercises')) return resolve(0);
              const c = db.transaction('exercises').objectStore('exercises').count();
              c.onsuccess = () => resolve(c.result);
            };
          }),
      ),
    )
    .toBeGreaterThanOrEqual(40);
});

test('works offline after first load', async ({ page, context }) => {
  await page.goto('/today/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // let the SW take control and cache assets
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.screenshot({ path: 'shots/offline-today.png' });
});
