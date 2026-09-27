import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

test('disables every CSS animation and transition while keeping auto-advance', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPlayer(page, 'tests/fixtures/story.json');
  await expect(page.locator('#player')).toHaveAttribute('data-transition', 'cut');
  const animatedElements = await page.evaluate(() => [...document.querySelectorAll('body, #app, #app *')]
    .map((element) => {
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id,
        className: typeof element.className === 'string' ? element.className : '',
        animationName: style.animationName,
        transitionProperty: style.transitionProperty
      };
    })
    .filter(({ animationName, transitionProperty }) => animationName !== 'none' || (transitionProperty !== 'none' && transitionProperty !== 'all')));
  expect(animatedElements).toEqual([]);
  await waitForFrame(page, 'frame-02');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});
