import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { countStore, expectNoHorizontalScroll, expectTapTargets, MONDAY, onboard, seedStore } from './helpers';

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY });
  await onboard(page);
});

test('settings open from Progress and Library, and choices are saved', async ({ page }) => {
  await page.goto('/library/');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings\/$/);
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/settings.png', fullPage: true });

  await page.getByRole('radio', { name: 'lb · mi' }).click();
  await page.getByRole('switch', { name: 'Sound' }).click();
  await page.getByRole('radio', { name: 'Blue' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--accent'))).toBe('#3B82F6');

  await page.reload();
  await expect(page.getByRole('radio', { name: 'lb · mi' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--accent'))).toBe('#3B82F6');

  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.goto('/progress/');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings\/$/);
});

test('imperial units show pounds and miles', async ({ page }) => {
  await seedStore(page, 'bodyweight', [{ date: '2026-10-05', kg: 70 }]);
  await seedStore(page, 'runs', [
    { id: 'r1', date: '2026-10-03', type: 'easy', durationSec: 1800, distanceM: 5000, avgPaceSecPerKm: 360, effort: 5, source: 'manual' },
  ]);
  await page.goto('/settings/');
  await page.getByRole('radio', { name: 'lb · mi' }).click();
  await page.goto('/progress/');
  await expect(page.getByTestId('bw-latest')).toHaveText('154.3 lb');
  await expect(page.getByTestId('longest-run')).toHaveText('3.11 mi');
  await page.goto('/run/');
  await expect(page.getByRole('button', { name: /Easy run$/ })).toContainText('3.11 mi');
  await expect(page.getByRole('button', { name: /Easy run$/ })).toContainText('9:39 /mi');
});

test('reminders need permission, then save the toggle and the time', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  await page.goto('/settings/');
  const toggle = page.getByRole('switch', { name: 'Training reminders' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.getByLabel('Reminder time').fill('07:30');
  await expect(page.getByText(/more nudge/)).toContainText('20:00');
  await page.reload();
  await expect(page.getByLabel('Reminder time')).toHaveValue('07:30');
  await expect(page.getByRole('switch', { name: 'Training reminders' })).toHaveAttribute('aria-checked', 'true');
});

test('export a backup, change data, and import it back', async ({ page }, testInfo) => {
  await seedStore(page, 'bodyweight', [{ date: '2026-10-05', kg: 70.5 }]);
  await page.goto('/settings/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('forge-backup-2026-10-05.json');
  const path = testInfo.outputPath('backup.json');
  await download.saveAs(path);
  const file = JSON.parse(readFileSync(path, 'utf8'));
  expect(file.app).toBe('forge');
  expect(file.data.bodyweight).toHaveLength(1);
  expect(file.data.exercises.length).toBeGreaterThanOrEqual(40);
  expect(file.data.settings).toHaveLength(1);

  // a bad file is rejected and nothing changes
  const bad = testInfo.outputPath('bad.json');
  writeFileSync(bad, 'nope');
  await page.locator('input[type="file"]').setInputFiles(bad);
  await expect(page.getByTestId('settings-msg')).toContainText('not valid JSON');
  expect(await countStore(page, 'bodyweight')).toBe(1);

  // a valid backup with one more weigh-in replaces the data after confirmation
  file.data.bodyweight.push({ date: '2026-10-04', kg: 69 });
  const edited = testInfo.outputPath('edited.json');
  writeFileSync(edited, JSON.stringify(file));
  await page.locator('input[type="file"]').setInputFiles(edited);
  const dialog = page.getByRole('dialog', { name: 'Replace your data?' });
  await expect(dialog).toContainText('2 weigh-ins');
  await page.screenshot({ path: 'shots/settings-import.png' });
  await dialog.getByRole('button', { name: 'Replace everything' }).click();
  await expect(page).toHaveURL(/\/today\//);
  expect(await countStore(page, 'bodyweight')).toBe(2);
});
