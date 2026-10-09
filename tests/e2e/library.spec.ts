import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { expectNoHorizontalScroll, expectTapTargets, MONDAY, onboard } from './helpers';

mkdirSync('shots', { recursive: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY });
  await onboard(page);
  await page.goto('/library/');
  await expect(page.getByRole('heading', { name: 'Library', level: 1 })).toBeVisible();
});

const count = async (page: import('@playwright/test').Page) =>
  Number(((await page.getByTestId('exercise-count').textContent()) ?? '').split(' ')[0]);

test('browse, search and filter the seeded exercises', async ({ page }) => {
  await expect(page.getByTestId('exercise-count')).toHaveText(/^\d+ exercises$/);
  const all = await count(page);
  expect(all).toBeGreaterThanOrEqual(40);
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/library-exercises.png' });

  await page.getByRole('radio', { name: 'Legs', exact: true }).click();
  const legs = await count(page);
  expect(legs).toBeGreaterThan(0);
  expect(legs).toBeLessThan(all);
  await page.getByRole('radio', { name: 'All', exact: true }).click();

  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('goblet');
  await expect(page.getByTestId('exercise-count')).toHaveText('1 exercise');
  await page.getByRole('button', { name: /Goblet squat/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Goblet squat' });
  await expect(dialog.getByRole('button', { name: 'Duplicate as custom' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  await page.screenshot({ path: 'shots/library-detail.png' });

  await page.keyboard.press('Escape');
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('zzzz');
  await expect(page.getByText(/Nothing matches/)).toBeVisible();
});

test('create, edit and delete a custom exercise', async ({ page }) => {
  await page.getByRole('button', { name: 'New exercise' }).click();
  const editor = page.getByRole('dialog', { name: 'New exercise' });
  await expect(editor.getByRole('button', { name: 'Save exercise' })).toBeDisabled();
  await editor.getByLabel('Name').fill('Zottman curl');
  await editor.getByLabel('Category').selectOption('Arms');
  await editor.getByLabel('Muscles (comma separated)').fill('biceps, forearms');
  await page.screenshot({ path: 'shots/library-editor.png' });
  await editor.getByRole('button', { name: 'Save exercise' }).click();

  const row = page.getByRole('button', { name: /Zottman curl/ });
  await expect(row).toContainText('Custom');
  await page.reload();
  await expect(page.getByRole('button', { name: /Zottman curl/ })).toBeVisible();

  await page.getByRole('button', { name: /Zottman curl/ }).click();
  await page.getByRole('dialog', { name: 'Zottman curl' }).getByRole('button', { name: 'Edit' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit exercise' });
  await edit.getByLabel('Name').fill('Zottman curl (heavy)');
  await edit.getByRole('button', { name: 'Save exercise' }).click();
  await expect(page.getByRole('button', { name: /Zottman curl \(heavy\)/ })).toBeVisible();

  await page.getByRole('button', { name: /Zottman curl \(heavy\)/ }).click();
  const detail = page.getByRole('dialog', { name: 'Zottman curl (heavy)' });
  await detail.getByRole('button', { name: 'Delete', exact: true }).click();
  await detail.getByRole('button', { name: 'Delete for good' }).click();
  await expect(page.getByRole('button', { name: /Zottman curl/ })).toHaveCount(0);
});

test('a custom workout can be built, and an exercise it uses cannot be deleted', async ({ page }) => {
  await page.getByRole('button', { name: 'New exercise' }).click();
  const ex = page.getByRole('dialog', { name: 'New exercise' });
  await ex.getByLabel('Name').fill('Zottman curl');
  await ex.getByRole('button', { name: 'Save exercise' }).click();
  await expect(page.getByRole('button', { name: /Zottman curl/ })).toBeVisible();

  await page.getByRole('radio', { name: 'Workouts', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Push/ }).first()).toBeVisible();
  await page.screenshot({ path: 'shots/library-workouts.png' });
  await page.getByRole('button', { name: 'New workout' }).click();
  const w = page.getByRole('dialog', { name: 'New workout' });
  await expect(w.getByRole('button', { name: 'Save workout' })).toBeDisabled();
  await w.getByLabel('Name').fill('Arm day');
  await w.getByRole('button', { name: 'Add block' }).click();
  const block = page.getByRole('dialog', { name: 'Add block' });
  await block.getByLabel('Exercise', { exact: true }).selectOption({ label: 'Zottman curl' });
  await block.getByRole('button', { name: 'Increase sets' }).click();
  await block.getByRole('button', { name: 'Save block' }).click();
  await expect(w.getByRole('button', { name: /Edit block 1: Zottman curl · 4 × /i })).toBeVisible();
  await w.getByRole('button', { name: 'Save workout' }).click();

  const row = page.getByRole('button', { name: /Arm day/ });
  await expect(row).toContainText('Custom');
  await row.click();
  await expect(page.getByRole('dialog', { name: 'Arm day' })).toContainText('Zottman curl');
  await page.keyboard.press('Escape');

  // the exercise is in use
  await page.getByRole('radio', { name: 'Exercises', exact: true }).click();
  await page.getByRole('button', { name: /Zottman curl/ }).click();
  const detail = page.getByRole('dialog', { name: 'Zottman curl' });
  await detail.getByRole('button', { name: 'Delete', exact: true }).click();
  await detail.getByRole('button', { name: 'Delete for good' }).click();
  await expect(detail.getByRole('alert')).toContainText('Used in "Arm day"');
  await page.keyboard.press('Escape');

  // once the workout is gone the exercise can be deleted
  await page.getByRole('radio', { name: 'Workouts', exact: true }).click();
  await page.getByRole('button', { name: /Arm day/ }).click();
  const wd = page.getByRole('dialog', { name: 'Arm day' });
  await wd.getByRole('button', { name: 'Delete', exact: true }).click();
  await wd.getByRole('button', { name: 'Delete for good' }).click();
  await expect(page.getByRole('button', { name: /Arm day/ })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Exercises', exact: true }).click();
  await page.getByRole('button', { name: /Zottman curl/ }).click();
  const again = page.getByRole('dialog', { name: 'Zottman curl' });
  await again.getByRole('button', { name: 'Delete', exact: true }).click();
  await again.getByRole('button', { name: 'Delete for good' }).click();
  await expect(page.getByRole('button', { name: /Zottman curl/ })).toHaveCount(0);
});

test('a seeded workout can be duplicated and edited', async ({ page }) => {
  await page.getByRole('radio', { name: 'Workouts', exact: true }).click();
  await page.getByRole('button', { name: /^Push/ }).first().click();
  await page.getByRole('dialog', { name: 'Push' }).getByRole('button', { name: 'Duplicate as custom' }).click();
  const w = page.getByRole('dialog', { name: 'New workout' });
  await expect(w.getByLabel('Name')).toHaveValue('Push (copy)');
  await w.getByRole('button', { name: 'Save workout' }).click();
  await expect(page.getByRole('button', { name: /Push \(copy\)/ })).toContainText('Custom');
});
