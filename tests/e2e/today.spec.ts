import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { expectNoHorizontalScroll, expectTapTargets, MONDAY, onboard } from './helpers';

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(MONDAY);
  await onboard(page);
});

const est = async (page: import('@playwright/test').Page) =>
  Number((await page.getByTestId('est-min').textContent()) ?? '0');

test('shows today\'s session, checklist and a one-tap start', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Push', level: 2 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start workout' })).toHaveAttribute('href', /w=w-push/);
  await expect(page.getByText('Dumbbell floor press', { exact: true })).toBeVisible();
  expect(await est(page)).toBeGreaterThanOrEqual(38);
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/today-push.png' });
  await page.screenshot({ path: 'shots/today-push-full.png', fullPage: true });
});

test('check off, skip and undo', async ({ page }) => {
  const done = page.getByRole('button', { name: 'Dumbbell floor press: mark done' });
  const skip = page.getByRole('button', { name: 'Dumbbell floor press: skip' });
  await done.click();
  await expect(done).toHaveAttribute('aria-pressed', 'true');
  await done.click(); // undo
  await expect(done).toHaveAttribute('aria-pressed', 'false');
  await skip.click();
  await expect(skip).toHaveAttribute('aria-pressed', 'true');
  await skip.click();
  await expect(skip).toHaveAttribute('aria-pressed', 'false');
  // state survives a reload (wait for the write to land first)
  await done.click();
  await expect(done).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Dumbbell floor press: mark done' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Partly done')).toBeVisible();
});

test('ticking every exercise completes the day and starts the streak', async ({ page }) => {
  const buttons = page.getByRole('button', { name: /: mark done$/ });
  await expect(page.getByRole('button', { name: 'Dumbbell floor press: mark done' })).toBeVisible();
  const n = await buttons.count();
  expect(n).toBeGreaterThan(4);
  for (let i = 0; i < n; i++) await buttons.nth(i).click();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start workout' })).toHaveCount(0);
  await expect(page.getByRole('img', { name: '1 day streak' })).toBeVisible();
  await page.screenshot({ path: 'shots/today-done.png' });
});

test('short on time and intensity change the session', async ({ page }) => {
  const before = await est(page);
  await expect(page.getByRole('button', { name: 'Dumbbell floor press: mark done' })).toBeVisible();
  const count = await page.getByRole('button', { name: /: mark done$/ }).count();
  await page.getByRole('button', { name: 'Short on time (20 min)' }).click();
  await expect(page.getByRole('button', { name: 'Short on time (20 min)' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => est(page)).toBeLessThanOrEqual(22);
  expect(await est(page)).toBeLessThan(before);
  expect(await page.getByRole('button', { name: /: mark done$/ }).count()).toBeLessThan(count);

  await page.getByRole('button', { name: 'Short on time (20 min)' }).click(); // off again
  await expect.poll(() => est(page)).toBe(before);
  await page.getByRole('radio', { name: 'Easy' }).click();
  await expect(page.getByRole('radio', { name: 'Easy' })).toBeChecked();
  await expect.poll(() => est(page)).toBeLessThan(before);
});

test('swap to another workout and go back to the plan', async ({ page }) => {
  await page.getByRole('button', { name: 'Swap workout' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: 'shots/today-swap-sheet.png' });
  await dialog.getByRole('button', { name: /^Pull/ }).click();
  await expect(page.getByRole('heading', { name: 'Pull', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Back to plan' }).click();
  await expect(page.getByRole('heading', { name: 'Push', level: 2 })).toBeVisible();
});

test('mark a rest day, then undo it', async ({ page }) => {
  await page.getByRole('button', { name: 'Mark rest day' }).click();
  await expect(page.getByRole('heading', { name: 'Rest day', level: 2 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start mobility flow' })).toBeVisible();
  await page.screenshot({ path: 'shots/today-rest.png' });
  await page.getByRole('button', { name: 'Back to plan' }).click();
  await expect(page.getByRole('heading', { name: 'Push', level: 2 })).toBeVisible();
});

test('low energy suggests a lighter day', async ({ page }) => {
  await page.getByRole('group', { name: 'Energy today' }).getByRole('button', { name: '2' }).click();
  await expect(page.getByText('Feeling low?')).toBeVisible();
  await page.getByRole('button', { name: 'Go lighter today' }).click();
  await expect(page.getByRole('radio', { name: 'Easy' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Short on time (20 min)' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Lighter plan is on')).toBeVisible();
});

test('a run day shows the run and a Start run action', async ({ page }) => {
  await page.getByRole('button', { name: 'Swap workout' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Run A/ }).click();
  await expect(page.getByRole('heading', { name: 'Run A', level: 2 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start run' })).toHaveAttribute('href', '/run/');
  await page.getByRole('button', { name: /Run A · Intervals: mark done/ }).click();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
});
