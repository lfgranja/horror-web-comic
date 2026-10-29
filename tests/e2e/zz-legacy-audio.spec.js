import { test, expect } from '@playwright/test';
import {
  openApp,
  waitForPlayer,
  expectFrameId,
  resetStorage,
  getHwcKeys,
  selectors,
} from './helpers.js';

async function audioControl(page) {
  return page.locator(selectors.audioToggle);
}

test.describe('US2 audio control', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('audio is on by default (FR-004, SC-003)', async ({ page }) => {
    const control = await audioControl(page);
    await expect(control).toBeVisible();
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    const keys = await getHwcKeys(page);
    expect(keys['hwc.audio'] === undefined || keys['hwc.audio'] === 'on').toBeTruthy();
  });

  test('toggle silences immediately without restarting the frame (FR-006)', async ({ page }) => {
    await expectFrameId(page, 'f-001');
    const control = await audioControl(page);
    await control.click();
    await expect(control).toHaveAttribute('aria-pressed', 'false');
    await expectFrameId(page, 'f-001');
    const audioPaused = await page.evaluate(() =>
      [...document.querySelectorAll('audio')].every((a) => a.paused || a.muted),
    );
    expect(audioPaused).toBeTruthy();
  });

  test('audio preference persists across reload (FR-007, SC-007)', async ({ page }) => {
    await (await audioControl(page)).click();
    const keys = await getHwcKeys(page);
    expect(keys['hwc.audio']).toBe('off');
    await page.reload();
    await waitForPlayer(page);
    await expect(await audioControl(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('missing audio file fails silently with coherent control (FR-032)', async ({ page }) => {
    await page.route('**/*.mp3', (route) => route.fulfill({ status: 404, body: '' }));
    await openApp(page);
    await waitForPlayer(page);
    await expectFrameId(page, 'f-001');
    const errorVisible = await page
      .locator('[data-testid="error-screen"], [role="alert"]')
      .filter({ hasText: /audio|som|mp3/i })
      .count();
    expect(errorVisible).toBe(0);
    const control = await audioControl(page);
    await expect(control).toBeVisible();
    const pressed = await control.getAttribute('aria-pressed');
    expect(pressed === 'true' || pressed === 'false').toBeTruthy();
  });

  test('audio control visible without hover and reachable in ≤1 interaction (SC-002 proxy)', async ({
    page,
  }) => {
    const control = await audioControl(page);
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
    await expect(control).toBeVisible();
    const before = await control.getAttribute('aria-pressed');
    await control.click();
    await expect(control).not.toHaveAttribute('aria-pressed', before);
  });
});
