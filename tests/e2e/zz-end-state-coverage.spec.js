import { test, expect } from '@playwright/test';
import { openPlayer, clearCoalescing } from './helpers.js';

// FR-033: at the end of the narrative the navigation controls must stay
// operable, and any navigation that changes the position must leave the final
// state. The end overlay is a full-screen layer, so it can silently cover the
// control bar and make those controls unclickable. These viewports cover the
// declared reference profile (360x800) and the minimum supported width.
const viewports = [
  { label: '320x568', width: 320, height: 568 },
  { label: '360x800', width: 360, height: 800 },
  { label: '1440x900', width: 1440, height: 900 }
];

for (const viewport of viewports) {
  test(`zz end overlay never covers the navigation controls at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    await clearCoalescing(page);
    await page.locator('#end').click();
    await expect(page.locator('#end-overlay')).toBeVisible();

    const controls = ['home', 'previous-scene', 'previous-frame', 'play-toggle', 'next-frame', 'next-scene', 'end'];
    const covered = await page.evaluate((ids) => ids.filter((id) => {
      const element = document.querySelector(`#${id}`);
      if (!element) return true;
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !(hit === element || element.contains(hit));
    }), controls);
    expect(covered, `end overlay intercepts: ${covered.join(', ')}`).toEqual([]);

    // The overlay's own action must still be clickable.
    const replayable = await page.evaluate(() => {
      const button = document.querySelector('#replay');
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === button || button.contains(hit);
    });
    expect(replayable, '"Rever do início" must remain clickable').toBe(true);
  });

  test(`zz a navigation control still leaves the ended state at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    await clearCoalescing(page);
    await page.locator('#end').click();
    await expect(page.locator('#end-overlay')).toBeVisible();
    await clearCoalescing(page);
    await page.locator('#home').click();
    await expect(page.locator('#end-overlay')).toBeHidden();
    await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
    await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  });
}
