import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { MONDAY, mkSession, noNativeShare, onboard, pngSize, seedStore } from './helpers';

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await noNativeShare(page);
  await page.clock.install({ time: MONDAY });
  await onboard(page);
});

const URL_PUSH = '/workout/?w=w-push&d=2026-10-05';

async function begin(page: import('@playwright/test').Page) {
  await page.goto(URL_PUSH);
  await expect(page.getByRole('heading', { name: 'Push', level: 1 })).toBeVisible();
  await page.getByRole('switch', { name: 'Warm-up' }).click();
  await page.getByRole('switch', { name: 'Cooldown' }).click();
  await page.getByRole('button', { name: "Let's go" }).click();
}

test('two sessions at the top of the rep range show a progression tip on the set screen', async ({ page }) => {
  await seedStore(page, 'sessions', [
    mkSession('f1', '2026-09-28', 'db-floor-press', [[10, 14], [10, 14], [10, 14]]),
    mkSession('f2', '2026-10-01', 'db-floor-press', [[10, 14], [10, 14], [10, 14]]),
  ]);
  await begin(page);
  await expect(page.getByRole('heading', { name: 'Dumbbell floor press', level: 1 })).toBeVisible();
  await expect(page.getByTestId('overload-chip')).toContainText('Add 2 reps');
  await page.screenshot({ path: 'shots/workout-overload.png' });
  // the tip shows on the first set only
  await page.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByRole('button', { name: 'Skip rest' }).click();
  await expect(page.getByText(/Set\s*2\s*of\s*3/)).toBeVisible();
  await expect(page.getByTestId('overload-chip')).toHaveCount(0);
});

test('a finished workout can be shared as a 1080 x 1920 image', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByRole('button', { name: 'End workout' }).click();
  await page.getByRole('dialog', { name: 'End workout?' }).getByRole('button', { name: 'End and save' }).click();
  await expect(page.getByRole('heading', { name: 'Session saved', level: 1 })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Share' }).click()]);
  expect(download.suggestedFilename()).toBe('forge-workout-2026-10-05.png');
  const path = test.info().outputPath('workout.png');
  await download.saveAs(path);
  expect(pngSize(path)).toEqual({ width: 1080, height: 1920 });
  await expect(page.getByRole('status').filter({ hasText: 'Image saved' })).toBeVisible();
  await page.screenshot({ path: 'shots/workout-shared.png' });
  await test.info().attach('workout-share-card', { path, contentType: 'image/png' });
});

test('a logged run can be shared as an image, with its route', async ({ page }) => {
  const route = Array.from({ length: 12 }, (_, i) => ({ lat: 12.9716 + i * 0.0004, lng: 77.5946 + Math.sin(i / 2) * 0.0005, t: i * 1000 }));
  await seedStore(page, 'runs', [
    { id: 'r1', date: '2026-10-03', type: 'tempo', durationSec: 1800, distanceM: 5000, avgPaceSecPerKm: 360, effort: 7, source: 'gps', route },
  ]);
  await page.goto('/run/');
  await page.getByRole('button', { name: /Tempo run$/ }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Share image' }).click()]);
  expect(download.suggestedFilename()).toBe('forge-run-2026-10-03.png');
  const path = test.info().outputPath('run.png');
  await download.saveAs(path);
  expect(pngSize(path)).toEqual({ width: 1080, height: 1920 });
  await test.info().attach('run-share-card', { path, contentType: 'image/png' });
});
