import { test, expect } from '@playwright/test';
import {
  openApp,
  waitForPlayer,
  expectFrameId,
  measureDwellMs,
  expectDwellWithinTolerance,
  resetStorage,
  selectors,
  FRAME_IDS,
  EFFECTIVE_DURATION_MS,
  installFrameWatcher,
} from './helpers.js';

test.describe('US1 auto-advance and narrative order', () => {
  test.beforeEach(async ({ page }) => {
    await installFrameWatcher(page);
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('starts on first frame and auto-advances in narrative order', async ({ page }) => {
    await expectFrameId(page, 'f-001');
    await expectFrameId(page, 'f-002');
    await expectFrameId(page, 'f-003');
  });

  test('slow frame dwell f-002 is within ±10% of 2500ms', async ({ page }) => {
    await expectFrameId(page, 'f-001');
    const dwell = await measureDwellMs(page, 'f-002', 8000);
    expectDwellWithinTolerance(dwell, EFFECTIVE_DURATION_MS['f-002'], 0.1);
  });

  test('default/story rhythm frame dwell is within ±10% of effective duration', async ({ page }) => {
    const dwell = await measureDwellMs(page, 'f-001', 5000);
    expectDwellWithinTolerance(dwell, EFFECTIVE_DURATION_MS['f-001'], 0.1);
  });

  test('auto-advance reaches scene B frames in order', async ({ page }) => {
    await expectFrameId(page, 'f-003');
    await expectFrameId(page, 'f-004');
    await expectFrameId(page, 'f-005');
    expect(FRAME_IDS).toEqual(['f-001', 'f-002', 'f-003', 'f-004', 'f-005']);
  });

  test('progress indicator reflects current position', async ({ page }) => {
    const progress = page.locator(selectors.progress);
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute('aria-valuemin', '1');
    await expect(progress).toHaveAttribute('aria-valuemax', '5');
    await expectFrameId(page, 'f-001');
    await expect(progress).toHaveAttribute('aria-valuenow', '1');
  });
});
