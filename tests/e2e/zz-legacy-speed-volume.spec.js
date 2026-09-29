import { test, expect } from '@playwright/test';
import {
  openApp,
  waitForPlayer,
  expectFrameId,
  measureDwellMs,
  expectDwellWithinTolerance,
  resetStorage,
  getHwcKeys,
  selectors,
  EFFECTIVE_DURATION_MS,
  installFrameWatcher,
} from './helpers.js';

test.describe('US2 volume, speed and End reachability', () => {
  test.beforeEach(async ({ page }) => {
    await installFrameWatcher(page);
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('volume persists in hwc.volume (FR-020)', async ({ page }) => {
    const volume = page.locator(selectors.volume);
    await expect(volume).toBeVisible();
    await volume.fill('30');
    await volume.dispatchEvent('change');
    const keys = await getHwcKeys(page);
    expect(Number(keys['hwc.volume'])).toBeCloseTo(0.3, 1);
    await page.reload();
    await waitForPlayer(page);
    const after = await getHwcKeys(page);
    expect(Number(after['hwc.volume'])).toBeCloseTo(0.3, 1);
  });

  test('speed 2x persists and halves dwell with 250ms floor (FR-021, SC-010)', async ({ page }) => {
    const speed = page.locator(selectors.speed);
    await expect(speed).toBeVisible();
    await speed.selectOption('2');
    const keys = await getHwcKeys(page);
    expect(keys['hwc.speed']).toBe('2');

    await expectFrameId(page, 'f-001');
    const dwell = await measureDwellMs(page, 'f-001', 5000);
    const expected = Math.max(250, EFFECTIVE_DURATION_MS['f-001'] / 2);
    expectDwellWithinTolerance(dwell, expected, 0.1);

    await page.reload();
    await waitForPlayer(page);
    const after = await getHwcKeys(page);
    expect(after['hwc.speed']).toBe('2');
  });

  test('speed 0.5x persists (FR-021)', async ({ page }) => {
    const speed = page.locator(selectors.speed);
    await speed.selectOption('0.5');
    const keys = await getHwcKeys(page);
    expect(keys['hwc.speed']).toBe('0.5');
  });

  test('End reaches last frame within ≤3 actions (VS-7, SC-011)', async ({ page }) => {
    await page.keyboard.press('End');
    await expectFrameId(page, 'f-005');
    await page.locator(selectors.goStart).click();
    await expectFrameId(page, 'f-001');
    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
  });
});
