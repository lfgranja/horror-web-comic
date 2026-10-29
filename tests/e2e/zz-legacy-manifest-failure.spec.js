import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openApp,
  waitForPlayer,
  expectFrameId,
  resetStorage,
  selectors,
} from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, '../fixtures/story-legacy.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

async function stubManifest(page, body, status = 200) {
  await page.route('**/tests/fixtures/story-legacy.json', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

test.describe('T015a manifest failure → friendly error screen', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
  });

  test('missing manifest shows error screen, not a blank page', async ({ page }) => {
    await stubManifest(page, '', 404);
    await openApp(page);
    const error = page.locator(selectors.errorScreen);
    await expect(error).toBeVisible({ timeout: 15_000 });
    await expect(error).toHaveText(/\S/);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
    await expect(page.locator(selectors.player)).toBeHidden();
  });

  test('malformed manifest shows error screen, not a blank page', async ({ page }) => {
    const malformed = fs.readFileSync(path.join(__dirname, '../fixtures/malformed.json'), 'utf8');
    await stubManifest(page, malformed);
    await openApp(page);
    await expect(page.locator(selectors.errorScreen)).toBeVisible({ timeout: 15_000 });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('incompatible schemaVersion shows error screen, not a blank page', async ({ page }) => {
    const incompatible = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../fixtures/incompatible.json'), 'utf8'),
    );
    expect(incompatible.schemaVersion).not.toBe(1); // anything but the supported version
    await stubManifest(page, incompatible);
    await openApp(page);
    await expect(page.locator(selectors.errorScreen)).toBeVisible({ timeout: 15_000 });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('structurally invalid manifest (empty scenes) shows error screen', async ({ page }) => {
    const invalid = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../fixtures/story-invalid.json'), 'utf8'),
    );
    await stubManifest(page, invalid);
    await openApp(page);
    await expect(page.locator(selectors.errorScreen)).toBeVisible({ timeout: 15_000 });
  });

  test('valid fixture manifest loads without error screen', async ({ page }) => {
    await openApp(page);
    await waitForPlayer(page);
    await expect(page.locator(selectors.errorScreen)).toBeHidden();
    expect(fixture.scenes.length).toBeGreaterThanOrEqual(2);
  });
});
