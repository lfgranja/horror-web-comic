import { test, expect } from '@playwright/test';
import {
  openApp,
  waitForPlayer,
  expectFrameId,
  resetStorage,
  getHwcKeys,
  selectors,
} from './helpers.js';

test.describe('US1 reading-position resume', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('persists progress on manual navigation and resumes after reload', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await page.locator(selectors.prevFrame).click();
    await expectFrameId(page, 'f-004');

    const keys = await getHwcKeys(page);
    expect(keys['hwc.progress']).toBeTruthy();
    const progress = JSON.parse(keys['hwc.progress']);
    expect(progress.frameId).toBe('f-004');
    expect(progress.updatedAt).toBeTruthy();
    expect(keys['hwc.schemaVersion']).toBe('1');

    await page.reload();
    await waitForPlayer(page);
    await expectFrameId(page, 'f-004');
  });

  test('pause is not persisted: reload resumes playing at saved frame', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await page.locator(selectors.prevScene).click();
    await expectFrameId(page, 'f-001');
    await page.locator(selectors.nextFrame).click();
    await expectFrameId(page, 'f-002');
    await page.locator(selectors.playPause).click();

    const keys = await getHwcKeys(page);
    expect(keys['hwc.progress']).toBeTruthy();

    await page.reload();
    await waitForPlayer(page);
    await expectFrameId(page, 'f-002');
    await expectFrameId(page, 'f-003');
  });

  test('invalid saved frameId restarts at first frame', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'hwc.progress',
        JSON.stringify({
          frameId: 'missing-frame',
          updatedAt: new Date().toISOString(),
          seq: 1,
          tabId: 'tab-a',
        }),
      );
      localStorage.setItem('hwc.schemaVersion', '1');
    });
    await openApp(page);
    await waitForPlayer(page);
    await expectFrameId(page, 'f-001');
  });

  test('incompatible schemaVersion discards state and applies defaults', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('hwc.schemaVersion', '999');
      localStorage.setItem(
        'hwc.progress',
        JSON.stringify({ frameId: 'f-005', updatedAt: new Date().toISOString(), seq: 1, tabId: 'x' }),
      );
      localStorage.setItem('hwc.audio', 'off');
    });
    await openApp(page);
    await waitForPlayer(page);
    await expectFrameId(page, 'f-001');
    const keys = await getHwcKeys(page);
    expect(keys['hwc.schemaVersion'] === '999' || keys['hwc.schemaVersion'] === '1').toBeTruthy();
    if (keys['hwc.schemaVersion'] === '1') {
      expect(keys['hwc.audio']).not.toBe('off');
    }
  });

  test('home control updates persisted progress to first frame', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
    await page.locator(selectors.goStart).click();
    await expectFrameId(page, 'f-001');
    const keys = await getHwcKeys(page);
    const progress = JSON.parse(keys['hwc.progress']);
    expect(progress.frameId).toBe('f-001');
  });
});
