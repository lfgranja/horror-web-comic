import { test, expect } from '@playwright/test';
import {
  openApp,
  waitForPlayer,
  expectFrameId,
  resetStorage,
  selectors,
} from './helpers.js';

test.describe('US1 manual navigation and reachability', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('next and previous frame navigate one step and pause auto-advance', async ({ page }) => {
    await expectFrameId(page, 'f-001');
    await page.locator(selectors.nextFrame).click();
    await expectFrameId(page, 'f-002');
    await page.locator(selectors.prevFrame).click();
    await expectFrameId(page, 'f-001');
    const dwell = await measureStable(page, 'f-001');
    expect(dwell).toBeGreaterThan(2000);
  });

  test('previous is a no-op at the first frame', async ({ page }) => {
    await expectFrameId(page, 'f-001');
    await page.locator(selectors.prevFrame).click();
    await expectFrameId(page, 'f-001');
  });

  test('next is a no-op at the last frame', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
    await page.locator(selectors.nextFrame).click();
    await expectFrameId(page, 'f-005');
  });

  test('scene jumps reach previous/next scene start in ≤3 actions', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');

    await page.locator(selectors.prevScene).click();
    await expectFrameId(page, 'f-001');

    await page.locator(selectors.nextScene).click();
    await expectFrameId(page, 'f-004');

    await page.locator(selectors.prevScene).click();
    await expectFrameId(page, 'f-001');
  });

  test('Home and End reach first and last frame within ≤3 actions', async ({ page }) => {
    await page.locator(selectors.goEnd).focus();
    await page.keyboard.press('End');
    await expectFrameId(page, 'f-005');

    await page.keyboard.press('Home');
    await expectFrameId(page, 'f-001');

    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
  });

  test('go-to-start control returns to first frame', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
    await page.locator(selectors.goStart).click();
    await expectFrameId(page, 'f-001');
  });

  test('keyboard arrows navigate frames', async ({ page }) => {
    await page.locator(selectors.player).click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('ArrowRight');
    await expectFrameId(page, 'f-002');
    await page.keyboard.press('ArrowLeft');
    await expectFrameId(page, 'f-001');
  });
});

async function measureStable(page, frameId) {
  const start = Date.now();
  await expectFrameId(page, frameId);
  for (;;) {
    const el = page.locator(selectors.currentFrame);
    const id = await el.getAttribute('data-frame-id');
    if (id !== frameId) return Date.now() - start;
    if (Date.now() - start > 5000) return Date.now() - start;
    await page.waitForTimeout(50);
  }
}
