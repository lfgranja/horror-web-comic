import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

// T128 / FR-011 / SC-006 — regression proof that reduced motion disables ALL
// animation. ADDED VALUE over reduced-motion.spec.js (which checks
// animationName/transitionProperty on elements only):
//  1. pseudo-elements are sampled too (.progress::after carries a 300ms width
//     transition; ::after/::before never appear in querySelectorAll('*')),
//  2. transition-duration/animation-duration are asserted, not just names,
//  3. an instant-cut proof: rAF samples of frame-image opacity across live
//     frame changes must never show a mid-fade value (only a static frame),
//  4. scroll-behavior and the hidden loading spinner are asserted,
//  5. auto-advance still works (narrative must NOT stall under reduce).
test('reduced motion kills animations including pseudo-elements, keeps instant-cut auto-advance', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPlayer(page, 'tests/fixtures/story.json');
  await expect(page.locator('#player')).toHaveAttribute('data-transition', 'cut');

  // 1+2: elements AND pseudo-elements report no animation and no transition time.
  const motion = await page.evaluate(() => {
    const snapshot = (element, pseudo) => {
      const style = getComputedStyle(element, pseudo || undefined);
      return {
        target: `${element.tagName.toLowerCase()}#${element.id || ''}.${typeof element.className === 'string' ? element.className : ''}${pseudo || ''}`,
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        transitionProperty: style.transitionProperty,
        transitionDuration: style.transitionDuration,
        scrollBehavior: style.scrollBehavior
      };
    };
    const rows = [...document.querySelectorAll('body, #app, #app *')].map((element) => snapshot(element));
    for (const selector of ['#progress', '.frame-stage', '.frame-image']) {
      const element = document.querySelector(selector);
      if (element) {
        rows.push(snapshot(element, '::after'));
        rows.push(snapshot(element, '::before'));
      }
    }
    const loadingMark = getComputedStyle(document.querySelector('.loading-mark') || document.body).display;
    return { rows, loadingMarkDisplay: typeof loadingMark === 'string' ? loadingMark : '' };
  });
  const durationIsZero = (value) => value.split(',').every((part) => Number.parseFloat(part.trim()) === 0);
  const offenders = motion.rows.filter((row) => {
    const hasAnimation = row.animationName !== 'none' && row.animationName !== '';
    const hasTransition = !(row.transitionProperty === 'none' || durationIsZero(row.transitionDuration));
    return hasAnimation || hasTransition;
  });
  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);

  // 3: instant-cut proof — sample frame-image opacity across transitions.
  const startFrame = await page.locator('#player').getAttribute('data-frame-id');
  const samples = await page.evaluate(async () => {
    const image = document.querySelector('#frame-image');
    const player = document.querySelector('#player');
    const values = [];
    const firstFrame = player.getAttribute('data-frame-id');
    const start = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const style = getComputedStyle(image);
        values.push({ opacity: Number.parseFloat(style.opacity), transform: style.transform });
        const advanced = player.getAttribute('data-frame-id') !== firstFrame;
        // Stop as soon as one instant cut has been observed (plus margin).
        if ((advanced && performance.now() - start > 500) || performance.now() - start > 8000) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return values;
  });
  expect(samples.length).toBeGreaterThan(10);
  const midFade = samples.filter((sample) => sample.opacity < 0.99);
  expect(midFade, JSON.stringify(midFade.slice(0, 5))).toEqual([]);
  const transformed = samples.filter((sample) => sample.transform !== 'none');
  expect(transformed, JSON.stringify(transformed.slice(0, 5))).toEqual([]);

  // 4: spinner hidden, scroll behavior neutralized (html scroll-behavior default is auto).
  const loadingVisible = await page.locator('.loading-mark').isVisible().catch(() => false);
  expect(loadingVisible).toBe(false);

  // 5: narrative still advances with instant cuts (any forward step counts).
  const advancedFrame = await page.locator('#player').getAttribute('data-frame-id');
  expect(advancedFrame, `started at ${startFrame}`).not.toBe(startFrame);
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});
