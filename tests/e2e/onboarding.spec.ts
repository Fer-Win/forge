import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { expectNoHorizontalScroll, expectTapTargets, MONDAY } from './helpers';

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(MONDAY);
});

test('first visit goes to onboarding and three steps lead to Today', async ({ page }) => {
  await page.goto('/today/');
  await expect(page).toHaveURL(/\/onboarding\//);
  await expect(page.getByRole('heading', { name: 'Your equipment' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/onboarding-1.png' });

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Training days' })).toBeVisible();
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/onboarding-2.png' });

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Running level' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '30+ min' })).toBeChecked();
  await page.screenshot({ path: 'shots/onboarding-3.png' });

  await page.getByRole('button', { name: 'Start training' }).click();
  await expect(page).toHaveURL(/\/today\//);
  await expect(page.getByRole('heading', { name: 'Push', level: 2 })).toBeVisible();
});

test('needs at least 3 training days', async ({ page }) => {
  await page.goto('/onboarding/');
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const d of ['Monday', 'Tuesday', 'Wednesday']) await page.getByRole('switch', { name: d, exact: true }).click(); // 6 -> 3 days
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await page.getByRole('switch', { name: 'Thursday', exact: true }).click(); // 2 days
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

test('days you do not train become rest days in the plan', async ({ page }) => {
  await page.goto('/onboarding/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('switch', { name: 'Saturday', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start training' }).click();
  await page.waitForURL('**/today/');
  await page.goto('/plan/');
  await expect(page.getByRole('button', { name: /^Saturday: Rest day/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Monday: Push/ })).toBeVisible();
});
