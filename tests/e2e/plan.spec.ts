import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { expectNoHorizontalScroll, expectTapTargets, MONDAY, onboard } from './helpers';

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(MONDAY);
  await onboard(page);
  await page.goto('/plan/');
  await expect(page.getByRole('button', { name: /^Monday: Push/ })).toBeVisible();
});

test('lists the default week with no layout problems', async ({ page }) => {
  for (const d of ['Monday: Push', 'Tuesday: Pull', 'Wednesday: Run A', 'Thursday: Legs + Core', 'Friday: Upper mix', 'Saturday: Run B', 'Sunday: Rest day']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${d.replace('+', '\\+')}`) })).toBeVisible();
  }
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/plan.png' });
});

test('warns about intervals before leg day on an interval week and clears when fixed', async ({ page }) => {
  await expect(page.getByText(/day before leg day/i)).toBeVisible();
  await page.getByRole('button', { name: /^Wednesday: Run A/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Rest day/ }).click();
  await expect(page.getByText(/day before leg day/i)).toHaveCount(0);
});

test('changing a day is saved', async ({ page }) => {
  await page.getByRole('button', { name: /^Monday: Push/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'shots/plan-sheet.png' });
  await page.getByRole('dialog').getByRole('button', { name: /^Rest day/ }).click();
  await expect(page.getByRole('button', { name: /^Monday: Rest day/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Monday: Rest day/ })).toBeVisible();
});

test('warns when two hard sessions hit the same muscles back to back', async ({ page }) => {
  await page.getByRole('button', { name: /^Tuesday: Pull/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Push/ }).click();
  await expect(page.getByText(/Push follows Push/)).toBeVisible();
});

test('dragging a session to another day reorders the week and persists', async ({ page }) => {
  const handle = page.getByRole('button', { name: 'Drag Push to another day' });
  const target = page.getByRole('button', { name: 'Drag Pull to another day' });
  const a = (await handle.boundingBox())!;
  const b = (await target.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 10, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 20, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: /^Monday: Pull/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Tuesday: Push/ })).toBeVisible();
  // wait until IndexedDB really holds the new order before reloading
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            const open = indexedDB.open('forge');
            open.onsuccess = () => {
              const get = open.result.transaction('planDays').objectStore('planDays').get(0);
              get.onsuccess = () => resolve(get.result?.assignment?.workoutId ?? '');
            };
          }),
      ),
    )
    .toBe('w-pull');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Tuesday: Push/ })).toBeVisible();
});
