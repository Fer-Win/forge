import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { expectNoHorizontalScroll, expectTapTargets, MONDAY, onboard } from './helpers';

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY });
  await onboard(page);
});

const segTime = (p: Page) => p.getByTestId('segment-time');
const segLabel = (p: Page) => p.getByTestId('segment-label');

async function openRunTab(page: Page, gps: boolean) {
  await page.goto('/run/');
  await expect(page.getByRole('heading', { name: 'Run', level: 1 })).toBeVisible();
  const toggle = page.getByRole('switch', { name: 'GPS tracking' });
  if ((await toggle.getAttribute('aria-checked')) === String(!gps)) await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', String(gps));
}

async function startType(page: Page, type: string | null, gps: boolean) {
  await openRunTab(page, gps);
  if (type) await page.getByRole('radio', { name: type, exact: true }).click();
  await page.getByRole('link', { name: 'Start run' }).click();
  await expect(page).toHaveURL(/\/run\/active\/\?t=/);
  await expect(page.getByRole('button', { name: 'Start run' })).toBeVisible();
  await page.getByRole('button', { name: 'Start run' }).click();
}

async function activeRunExists(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('forge');
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('activeRun')) { db.close(); resolve(false); return; }
          const req = db.transaction('activeRun').objectStore('activeRun').get('active');
          req.onerror = () => { db.close(); resolve(false); };
          req.onsuccess = () => { db.close(); resolve(!!req.result); };
        };
      }),
  );
}

test('the Run tab recommends this week\'s run, lets you switch type, and has no layout problems', async ({ page }) => {
  await page.goto('/run/');
  await expect(page.getByText('Week 1 of 8')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Intervals', level: 2 })).toBeVisible();
  await expect(page.getByTestId('run-summary')).toContainText('6 × (2 min hard / 2 min easy)');
  await expect(page.getByText('No runs yet')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/run-tab.png' });

  await page.getByRole('radio', { name: 'Tempo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tempo run', level: 2 })).toBeVisible();
  await page.getByRole('radio', { name: 'Long', exact: true }).click();
  await expect(page.getByTestId('run-total')).toHaveText('45');
  await expect(page.getByRole('link', { name: 'Start run' })).toHaveAttribute('href', '/run/active/?t=long');
});

test('an interval run counts down, changes segment on time, and survives a long sleep', async ({ page }) => {
  await startType(page, null, false);
  await expect(segLabel(page)).toHaveText('Warm-up');
  await expect(segTime(page)).toHaveText(/^(10:00|9:5\d)$/);
  await expect(page.getByTestId('next-segment')).toContainText('Hard 1 of 6');
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/run-active-warmup.png' });

  await page.clock.fastForward('10:05');
  await expect(segLabel(page)).toHaveText('Hard 1 of 6');
  await expect(segTime(page)).toHaveText(/^1:[45]\d$/);
  await expect(page.getByTestId('next-segment')).toContainText('Easy');
  await page.screenshot({ path: 'shots/run-active-hard.png' });

  await page.clock.fastForward('02:00'); // lands in the easy segment
  await expect(segLabel(page)).toHaveText('Easy');

  await page.getByRole('button', { name: 'Next segment' }).click();
  await expect(segLabel(page)).toHaveText('Hard 2 of 6');
  await expect(segTime(page)).toHaveText(/^(2:00|1:5\d)$/);
});

test('pausing freezes the clock', async ({ page }) => {
  await startType(page, 'Easy', false);
  await expect(segLabel(page)).toHaveText('Easy run');
  await page.getByRole('button', { name: 'Pause run' }).click();
  const dialog = page.getByRole('dialog', { name: 'Paused' });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: 'shots/run-paused.png' });
  await page.clock.fastForward('05:00');
  await dialog.getByRole('button', { name: 'Resume' }).click();
  await expect(segTime(page)).toHaveText(/^(30:00|29:5\d|29:4\d)$/);
});

test('finishing a run shows a summary and saves it to the log', async ({ page }) => {
  await startType(page, 'Easy', false);
  await page.clock.fastForward('31:00');
  await expect(page.getByText('Run complete')).toBeVisible();
  await expect(page.getByTestId('summary-time')).toHaveText('30:00');
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/run-summary.png' });

  await page.getByRole('button', { name: 'Increase effort (1–10)' }).click();
  await expect(page.getByTestId('effort-value')).toHaveText('7');
  await page.getByRole('button', { name: 'Save run' }).click();
  await expect(page).toHaveURL(/\/run\/$/);
  const row = page.getByRole('button', { name: /Easy run$/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText('30:00');
  await expect(row).toContainText('7/10');
  await page.reload();
  await expect(page.getByRole('button', { name: /Easy run$/ })).toBeVisible();
});

test('ending a run early offers to save what was done', async ({ page }) => {
  await startType(page, 'Easy', false);
  await page.clock.fastForward('05:00');
  await page.getByRole('button', { name: 'End run' }).click();
  await page.getByRole('dialog', { name: 'End run?' }).getByRole('button', { name: 'End and review' }).click();
  await expect(page.getByText('Run ended early')).toBeVisible();
  await expect(page.getByTestId('summary-time')).toHaveText(/^5:0\d$/);
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page).toHaveURL(/\/run\/$/);
  await expect(page.getByText('No runs yet')).toBeVisible();
});

test('an interrupted run resumes after a reload', async ({ page }) => {
  await startType(page, 'Easy', false);
  await page.clock.fastForward('05:00');
  await expect(segTime(page)).toHaveText(/^2[4-5]:\d\d$/);
  await expect.poll(() => activeRunExists(page)).toBe(true);
  await page.reload();
  await expect(segLabel(page)).toHaveText('Easy run');
  await expect(segTime(page)).toHaveText(/^2[3-5]:\d\d$/);
});

test('GPS tracking measures distance and draws the route', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 12.9716, longitude: 77.5946 });
  await startType(page, 'Easy', true);
  await expect(page.getByTestId('gps-status')).toHaveText('GPS on');
  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(1200);
    await context.setGeolocation({ latitude: 12.9716 + i * 0.00006, longitude: 77.5946 });
  }
  await expect.poll(async () => page.getByTestId('distance').textContent()).not.toBe('0.00');
  await expect(page.getByTestId('route')).toBeVisible();
  await page.screenshot({ path: 'shots/run-active-gps.png' });

  await page.getByRole('button', { name: 'End run' }).click();
  await page.getByRole('dialog', { name: 'End run?' }).getByRole('button', { name: 'End and review' }).click();
  await expect(page.getByTestId('summary-distance')).toContainText('km');
  await expect(page.getByTestId('route')).toBeVisible();
  await page.screenshot({ path: 'shots/run-summary-gps.png' });
  await page.getByRole('button', { name: 'Save run' }).click();
  await expect(page.getByRole('button', { name: /Easy run$/ })).toContainText('km');
});

test('a run done without the app can be logged by hand', async ({ page }) => {
  await page.goto('/run/');
  await page.getByRole('button', { name: 'Log a run' }).click();
  const dialog = page.getByRole('dialog', { name: 'Log a run' });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: 'shots/run-manual.png' });
  await dialog.getByRole('radio', { name: 'Tempo', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save run' }).click();
  const row = page.getByRole('button', { name: /Tempo run$/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText('5.00 km');
  await expect(row).toContainText('30:00');
  await expect(row).toContainText('6:00 /km');
  await row.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete run' }).click();
  await expect(page.getByText('No runs yet')).toBeVisible();
});
