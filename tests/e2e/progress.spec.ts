import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { expectNoHorizontalScroll, expectTapTargets, MONDAY, mkSession, onboard, seedStore } from './helpers';

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY });
  await onboard(page);
});

test('an empty Progress screen says what will appear and has no layout problems', async ({ page }) => {
  await page.goto('/progress/');
  await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible();
  await expect(page.getByTestId('streak')).toHaveText('0');
  await expect(page.getByTestId('insight')).toContainText('Every session counts');
  await expect(page.getByText(/Finish a guided workout/)).toBeVisible();
  await expect(page.getByText(/Log or track a run/)).toBeVisible();
  await expect(page.getByText(/Optional\. Log your weight/)).toBeVisible();
  await expect(page.getByTestId('heatmap')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/progress-empty.png', fullPage: true });
});

test('charts, records, running and bodyweight come from logged data', async ({ page }) => {
  await seedStore(page, 'sessions', [
    mkSession('c1', '2026-09-21', 'db-curl', [[10, 10], [10, 10]]),
    mkSession('c2', '2026-09-28', 'db-curl', [[12.5, 10], [12.5, 10]]),
    mkSession('c3', '2026-10-05', 'db-curl', [[15, 10], [15, 8]]),
    mkSession('f1', '2026-09-14', 'db-floor-press', [[10, 16], [10, 16], [10, 16]]),
    mkSession('f2', '2026-09-17', 'db-floor-press', [[10, 16], [10, 16], [10, 16]]),
  ]);
  await seedStore(page, 'runs', [
    { id: 'r1', date: '2026-09-29', type: 'easy', durationSec: 1800, distanceM: 5000, avgPaceSecPerKm: 360, effort: 5, source: 'manual' },
    { id: 'r2', date: '2026-10-03', type: 'long', durationSec: 2040, distanceM: 6000, avgPaceSecPerKm: 340, effort: 6, source: 'manual' },
  ]);
  await seedStore(page, 'bodyweight', [
    { date: '2026-09-29', kg: 72 },
    { date: '2026-10-03', kg: 71.6 },
    { date: '2026-10-05', kg: 71 },
  ]);
  await page.goto('/progress/');

  // summary: today's partial session starts the streak, and the new best is the insight
  await expect(page.getByTestId('streak')).toHaveText('1');
  await expect(page.getByTestId('insight')).toContainText('New personal best on Dumbbell curl: 15 kg');
  await expect(page.locator('[data-testid="heatmap"] [data-status="partial"]')).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'Weekly completion percentage' })).toBeVisible();

  // strength: most recent exercise first, switchable metric, PR list
  const picker = page.getByTestId('exercise-picker');
  await expect(picker).toHaveValue('db-curl');
  await expect(page.getByRole('img', { name: 'Dumbbell curl weight per session' })).toBeVisible();
  await page.getByRole('radio', { name: 'Reps', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Dumbbell curl reps per session' })).toBeVisible();
  await expect(page.getByTestId('exercise-prs')).toHaveText('2');
  await expect(page.getByTestId('pr-list').getByRole('listitem')).toHaveCount(2);
  await expect(page.getByTestId('overload')).toHaveCount(0);

  // two sessions at the top of the range suggest the next step
  await picker.selectOption('db-floor-press');
  await expect(page.getByTestId('overload')).toContainText('Add 2 reps');

  // running
  await expect(page.getByTestId('longest-run')).toHaveText('6.00 km');
  await expect(page.getByTestId('distance-chart')).toBeVisible();
  await expect(page.getByTestId('pace-chart')).toBeVisible();

  // bodyweight
  await expect(page.getByTestId('bw-latest')).toHaveText('71 kg');
  await expect(page.getByTestId('bw-change')).toContainText('Down 0.8 kg');
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/progress-full.png', fullPage: true });

  await page.getByRole('button', { name: 'Log weight' }).click();
  const dialog = page.getByRole('dialog', { name: 'Log weight' });
  await page.screenshot({ path: 'shots/progress-log-weight.png' });
  await dialog.getByRole('button', { name: 'Increase weight' }).click();
  await expect(dialog.getByTestId('bw-value')).toHaveText('71.1 kg');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('bw-latest')).toHaveText('71.1 kg');
});
