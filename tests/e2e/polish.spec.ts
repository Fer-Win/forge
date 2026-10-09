import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll, MONDAY, onboard } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY });
  await onboard(page);
});

test('an unknown page shows a friendly way back', async ({ page }) => {
  await page.goto('/no-such-page/');
  await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole('link', { name: 'Back to Today' }).click();
  await expect(page).toHaveURL(/\/today\//);
});

test('the manifest offers home-screen shortcuts and zoom is not blocked', async ({ page, request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.shortcuts.map((s: { url: string }) => s.url)).toEqual(['/today/', '/run/', '/progress/']);
  expect(m.id).toBe('/today/');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/);
});

test('warm-up and cooldown choices are remembered for the next workout', async ({ page }) => {
  await page.goto('/workout/?w=w-push&d=2026-10-05');
  await page.getByRole('switch', { name: 'Warm-up' }).click();
  await expect(page.getByRole('switch', { name: 'Warm-up' })).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => {
    await page.reload();
    return page.getByRole('switch', { name: 'Warm-up' }).getAttribute('aria-checked');
  }).toBe('false');
  await expect(page.getByRole('switch', { name: 'Cooldown' })).toHaveAttribute('aria-checked', 'true');
});
