import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { expectNoHorizontalScroll, expectTapTargets, MONDAY, onboard } from './helpers';

mkdirSync('shots', { recursive: true });

// A controllable clock that still runs in real time, so we can "close the laptop lid" with fastForward.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY });
  await onboard(page);
});

const URL_PUSH = '/workout/?w=w-push&d=2026-10-05';

async function openReady(page: Page, url = URL_PUSH, name = 'Push') {
  await page.goto(url);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
}

/** Opens a workout with warm-up and cooldown off and taps "Let's go". */
async function begin(page: Page, url = URL_PUSH, name = 'Push') {
  await openReady(page, url, name);
  await page.getByRole('switch', { name: 'Warm-up' }).click();
  await page.getByRole('switch', { name: 'Cooldown' }).click();
  await page.getByRole('button', { name: "Let's go" }).click();
}

const logSetBtn = (page: Page) => page.getByRole('button', { name: 'Log set', exact: true });
const restTime = (page: Page) => page.getByTestId('rest-time');

/** Logs the superset round of Push block 1 (floor press, then push-up) and lands on the rest screen. */
async function logRound(page: Page) {
  await logSetBtn(page).click();
  await logSetBtn(page).click();
  await expect(restTime(page)).toBeVisible();
}

async function activeLogCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('forge');
        open.onerror = () => resolve(-1);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('activeSession')) { db.close(); resolve(-1); return; }
          const req = db.transaction('activeSession').objectStore('activeSession').get('active');
          req.onerror = () => { db.close(); resolve(-1); };
          req.onsuccess = () => {
            const v = req.result as { state?: { logs?: unknown[] } } | undefined;
            db.close();
            resolve(v?.state?.logs ? v.state.logs.length : -1);
          };
        };
      }),
  );
}

async function skipUntil(page: Page, heading: string) {
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('heading', { name: heading, level: 1 }).isVisible()) return;
    const skip = page.getByRole('button', { name: /^Skip( rest)?$/ });
    if (await skip.first().isVisible()) await skip.first().click();
    else await page.waitForTimeout(50);
  }
  throw new Error(`never reached ${heading}`);
}

test('Today starts the workout and the ready screen has no layout problems', async ({ page }) => {
  await page.getByRole('link', { name: 'Start workout' }).click();
  await expect(page).toHaveURL(/\/workout\/\?w=w-push/);
  await expect(page.getByRole('heading', { name: 'Push', level: 1 })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Warm-up' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Cooldown' })).toBeChecked();
  const withBoth = Number(await page.getByTestId('ready-est').textContent());
  await page.getByRole('switch', { name: 'Warm-up' }).click();
  await expect(page.getByRole('switch', { name: 'Warm-up' })).not.toBeChecked();
  expect(Number(await page.getByTestId('ready-est').textContent())).toBeLessThan(withBoth);
  await page.getByRole('switch', { name: 'Warm-up' }).click();
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/workout-ready.png' });
});

test('the set screen shows target, cues and prefilled steppers; a superset flows straight to its partner', async ({ page }) => {
  await begin(page);
  await expect(page.getByRole('heading', { name: 'Dumbbell floor press', level: 1 })).toBeVisible();
  await expect(page.getByText('Superset · 1 of 2')).toBeVisible();
  await expect(page.getByText(/Set\s*1\s*of\s*3/)).toBeVisible();
  await expect(page.getByTestId('target')).toContainText('8–14 reps');
  await expect(page.getByTestId('target')).toContainText('2×5 kg');
  await expect(page.getByTestId('reps-value')).toHaveText('8');
  await expect(page.getByTestId('weight-value')).toHaveText('10 kg');
  await expect(page.getByRole('list', { name: 'Form cues' }).getByRole('listitem')).toHaveCount(3);
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/workout-set.png' });

  await page.getByRole('button', { name: 'Increase reps' }).click();
  await expect(page.getByTestId('reps-value')).toHaveText('9');
  await logSetBtn(page).click();
  await expect(page.getByRole('heading', { name: 'Push-up', level: 1 })).toBeVisible(); // no rest between a superset pair
  await expect(page.getByTestId('weight-value')).toHaveText('BW');
});

test('form and variations open in a bottom sheet', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: /Form & variations/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Easier')).toBeVisible();
  await expect(dialog.getByText('Harder')).toBeVisible();
  await page.screenshot({ path: 'shots/workout-info.png' });
  await dialog.getByRole('button', { name: 'Got it' }).click();
  await expect(dialog).toHaveCount(0);
});

test('rest starts after the round, adjusts by 15 s, and finishes on its own even after a long sleep', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Increase reps' }).click(); // 9 reps
  await logRound(page);
  await expect(restTime(page)).toHaveText(/^(1:00|0:5\d)$/);
  await expect(page.getByTestId('up-next')).toContainText('Dumbbell floor press');
  await expect(page.getByTestId('up-next')).toContainText('Set 2 of 3');
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/workout-rest.png' });

  await page.getByRole('button', { name: '+15 s' }).click();
  await expect(restTime(page)).toHaveText(/^1:1[345]$/);
  await page.getByRole('button', { name: '−15 s' }).click();
  await expect(restTime(page)).toHaveText(/^(1:00|0:5\d)$/);

  await page.clock.fastForward('01:30'); // tab "slept" well past the rest
  await expect(page.getByRole('heading', { name: 'Dumbbell floor press', level: 1 })).toBeVisible();
  await expect(page.getByText(/Set\s*2\s*of\s*3/)).toBeVisible();
  // prefilled from the set just logged in this session
  await expect(page.getByTestId('reps-value')).toHaveText('9');
});

test('skip rest and undo the last set', async ({ page }) => {
  await begin(page);
  await logRound(page);
  await page.getByRole('button', { name: 'Skip rest' }).click();
  await expect(page.getByText(/Set\s*2\s*of\s*3/)).toBeVisible();
  await logRound(page);
  await page.getByRole('button', { name: 'Undo last set' }).click();
  await expect(page.getByRole('heading', { name: 'Push-up', level: 1 })).toBeVisible();
  await expect(page.getByText(/Set\s*2\s*of\s*3/)).toBeVisible();
});

test('pausing freezes the rest timer', async ({ page }) => {
  await begin(page);
  await logRound(page);
  await page.getByRole('button', { name: 'Pause workout' }).click();
  const dialog = page.getByRole('dialog', { name: 'Paused' });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: 'shots/workout-paused.png' });
  await page.clock.fastForward('02:00');
  await dialog.getByRole('button', { name: 'Resume' }).click();
  await expect(restTime(page)).toBeVisible(); // still resting, not moved on
  await expect(restTime(page)).toHaveText(/^(1:00|0:5\d|0:4\d)$/);
});

test('a timed hold waits for Start hold, counts down and moves on', async ({ page }) => {
  await begin(page, '/workout/?w=w-legs&d=2026-10-05', 'Legs + Core');
  await skipUntil(page, 'Plank');
  await expect(page.getByTestId('hold-seconds')).toHaveText('40');
  await page.getByRole('button', { name: 'Start hold' }).click();
  await expect(page.getByTestId('hold-seconds')).toHaveText(/^(40|39|38)$/);
  await page.screenshot({ path: 'shots/workout-hold.png' });
  await page.clock.fastForward('00:41');
  await expect(page.getByRole('heading', { name: 'Dead bug', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start hold' })).toBeVisible();
});

test('a circuit runs work and rest on its own, even when time jumps ahead', async ({ page }) => {
  await begin(page, '/workout/?w=w-circuit&d=2026-10-05', 'Full-body circuit');
  await expect(page.getByRole('heading', { name: 'Goblet squat', level: 1 })).toBeVisible();
  await expect(page.getByTestId('hold-seconds')).toHaveText(/^(40|39|38)$/);
  await page.clock.fastForward('00:41');
  await expect(restTime(page)).toBeVisible();
  await expect(restTime(page)).toHaveText(/^0:(1[4-9]|20)$/);
  await page.clock.fastForward('00:21');
  await expect(page.getByRole('heading', { name: 'Push-up', level: 1 })).toBeVisible();
  await expect(page.getByTestId('hold-seconds')).toHaveText(/^(3\d|40)$/);
  await page.clock.fastForward('02:00'); // a long gap lands on the right move, not on the first one
  await expect(page.getByRole('heading', { name: 'Reverse lunge', level: 1 })).toBeVisible();
});

test('warm-up comes first when switched on', async ({ page }) => {
  await openReady(page);
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.getByRole('heading', { name: 'Jumping jacks', level: 1 })).toBeVisible();
  await expect(page.getByText('Warm-up', { exact: true })).toBeVisible();
  await skipUntil(page, 'Dumbbell floor press');
});

test('an interrupted workout resumes after a reload', async ({ page }) => {
  await begin(page);
  await logRound(page);
  await expect.poll(() => activeLogCount(page)).toBe(2);
  await page.reload();
  await expect(restTime(page)).toBeVisible();
  await page.clock.fastForward('01:30');
  await expect(page.getByRole('heading', { name: 'Dumbbell floor press', level: 1 })).toBeVisible();
  await expect(page.getByText(/Set\s*2\s*of\s*3/)).toBeVisible();
});

test('ending early saves the logged sets as a partial session', async ({ page }) => {
  await begin(page);
  await logRound(page);
  await page.getByRole('button', { name: 'End workout' }).click();
  const dialog = page.getByRole('dialog', { name: 'End workout?' });
  await expect(dialog).toContainText('2 logged sets');
  await dialog.getByRole('button', { name: 'End and save' }).click();
  await expect(page.getByRole('heading', { name: 'Session saved', level: 1 })).toBeVisible();
  await expect(page.getByTestId('sets')).toHaveText('2');
  await page.getByRole('link', { name: 'Done' }).click();
  await expect(page).toHaveURL(/\/today\//);
  await expect(page.getByText('Partly done')).toBeVisible();
});

test('leaving with nothing logged saves nothing', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'End workout' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Leave workout' }).click();
  await expect(page).toHaveURL(/\/today\//);
  await expect(page.getByText('Partly done')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible();
});

test('finishing everything shows the summary and completes the day', async ({ page }) => {
  test.setTimeout(90_000);
  await begin(page);
  for (let i = 0; i < 120; i++) {
    if (await page.getByRole('heading', { name: 'Workout complete', level: 1 }).isVisible()) break;
    if (await logSetBtn(page).isVisible()) await logSetBtn(page).click();
    else if (await page.getByRole('button', { name: 'Skip rest' }).isVisible()) await page.getByRole('button', { name: 'Skip rest' }).click();
    else if (await page.getByRole('button', { name: 'Start finisher' }).isVisible()) {
      await page.screenshot({ path: 'shots/workout-finisher-ready.png' });
      await page.getByRole('button', { name: 'Start finisher' }).click();
      await expect(page.getByTestId('phase')).toHaveText('Work');
      await page.screenshot({ path: 'shots/workout-finisher.png' });
      await page.clock.fastForward('05:10');
    } else await page.waitForTimeout(50);
  }
  await expect(page.getByRole('heading', { name: 'Workout complete', level: 1 })).toBeVisible();
  await expect(page.getByTestId('confetti')).toBeVisible();
  await expect(page.getByTestId('sets')).toHaveText('21');
  await expect(page.getByTestId('volume')).toContainText('kg');
  await expect(page.getByTestId('duration')).toHaveText(/^\d+:\d\d$/);
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
  await page.screenshot({ path: 'shots/workout-complete.png' });

  await page.getByRole('link', { name: 'Done' }).click();
  await expect(page).toHaveURL(/\/today\//);
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: '1 day streak' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start workout' })).toHaveCount(0);
});
