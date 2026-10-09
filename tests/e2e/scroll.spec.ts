import { test, expect } from '@playwright/test';
import { onboard } from './helpers';

/**
 * Real touch-scroll gestures (synthesized through the browser's input pipeline, like a finger),
 * started over different parts of each tab. If a swipe does not move the page, something is eating it.
 */
const TABS = ['/today/', '/plan/', '/run/', '/progress/', '/library/'];
const START_Y = [220, 420, 620];

test.beforeEach(async ({ page }) => {
  await onboard(page);
});

for (const path of TABS) {
  test(`touch swipes scroll the page on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const room = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    test.skip(room < 60, `${path} fits on one screen, nothing to scroll`);
    const cdp = await page.context().newCDPSession(page);
    const failures: string[] = [];
    for (const y of START_Y) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await cdp.send('Input.synthesizeScrollGesture', {
        x: 200, y, yDistance: -Math.min(300, room), gestureSourceType: 'touch', speed: 900,
      });
      const top = await page.evaluate(() => window.scrollY);
      const hit = await page.evaluate(
        (yy) => {
          const el = document.elementFromPoint(200, yy);
          return el ? `${el.tagName}.${(el.className?.toString() ?? '').slice(0, 40)}` : 'none';
        },
        y,
      );
      if (top < 20) failures.push(`swipe from y=${y} over ${hit} moved the page ${top}px`);
    }
    expect(failures, 'swipes that did not scroll').toEqual([]);
  });
}
