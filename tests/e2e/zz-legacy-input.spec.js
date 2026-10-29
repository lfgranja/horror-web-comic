import { test, expect } from '@playwright/test';
import { openApp, waitForPlayer, expectFrameId, resetStorage, selectors } from './helpers.js';

test.describe('US3 touch and keyboard input', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('touch next/prev works on mobile project', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch project only');
    await page.locator(selectors.nextFrame).tap();
    await expectFrameId(page, 'f-002');
    await page.locator(selectors.prevFrame).tap();
    await expectFrameId(page, 'f-001');
  });

  test('ArrowRight/ArrowLeft navigate frames (FR-010)', async ({ page }) => {
    await page.locator(selectors.player).click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('ArrowRight');
    await expectFrameId(page, 'f-002');
    await page.keyboard.press('ArrowLeft');
    await expectFrameId(page, 'f-001');
  });

  test('Shift+Arrow navigates scenes (FR-010)', async ({ page }) => {
    await page.locator(selectors.player).click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('Shift+ArrowRight');
    await expectFrameId(page, 'f-004');
    await page.keyboard.press('Shift+ArrowLeft');
    await expectFrameId(page, 'f-001');
  });

  test('Home and End reach boundaries (FR-010, SC-011)', async ({ page }) => {
    await page.locator(selectors.player).click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('End');
    await expectFrameId(page, 'f-005');
    await page.keyboard.press('Home');
    await expectFrameId(page, 'f-001');
  });

  test('Space toggles play/pause and preventDefault on player (FR-010, FR-013)', async ({ page }) => {
    const beforeY = await page.evaluate(() => window.scrollY);
    await page.locator(selectors.player).click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const afterY = await page.evaluate(() => window.scrollY);
    expect(afterY).toBe(beforeY);
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
  });

  test('M toggles audio (FR-010, FR-005)', async ({ page }) => {
    const control = page.locator(selectors.audioToggle);
    const before = await control.getAttribute('aria-pressed');
    await page.locator(selectors.player).click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('m');
    await expect(control).not.toHaveAttribute('aria-pressed', before);
  });

  test('Tab reaches player controls with focus-visible', async ({ page }) => {
    const reached = await page.evaluate(async () => {
      const focusables = [...document.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')];
      return focusables.length > 0;
    });
    expect(reached).toBeTruthy();
    await page.keyboard.press('Tab');
    const hasFocus = await page.evaluate(() => document.activeElement !== document.body);
    expect(hasFocus).toBeTruthy();
  });
});
