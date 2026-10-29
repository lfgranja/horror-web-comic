import { test, expect } from '@playwright/test';

/**
 * T213 — the only `layout-shift` observer in the whole suite lived inside the
 * degraded profiles in `degradation-production.spec.js`, so ordinary playback
 * on an ordinary connection was never measured. SC-015 (< 0.1) therefore had no
 * evidence for the case most visitors are actually in.
 *
 * This mirrors that observer exactly — same `PerformanceObserver` registration,
 * same buffered capture, same threshold — with no degradation signals installed
 * and no artificial route delay, so it measures real first-visit playback.
 */

const CLS_BUDGET = 0.1;
const VIEWPORTS = [
  { label: '320x568', width: 320, height: 568 },
  { label: '360x800', width: 360, height: 800 },
  { label: '1280x720', width: 1280, height: 720 }
];

async function installLayoutShiftObserver(page) {
  await page.addInitScript(() => {
    globalThis.__layoutShifts = [];
    new PerformanceObserver((list) => {
      globalThis.__layoutShifts.push(...list.getEntries());
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

function cumulativeLayoutScore(entries) {
  let total = 0;
  for (const entry of entries) {
    if (!entry.hadRecentInput) total += entry.value;
  }
  return total;
}

test.describe('normal-mode CLS (no degradation signals)', () => {
  for (const viewport of VIEWPORTS) {
    test(`playback holds CLS below ${CLS_BUDGET} at ${viewport.label}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installLayoutShiftObserver(page);

      // Hold each frame back briefly so the "image resolves after the rest of
      // the frame has settled" case — the only one that can produce a layout
      // shift — is reliably exercised. Without this the measurement is at the
      // mercy of machine load: an un-delayed run passes or fails on how busy the
      // host is, which is not a property of the product. No degradation signal
      // is installed, so this is still the normal-mode path; the delay only makes
      // the load order reproducible. Same technique as the degraded suite.
      let delayed = 0;
      await page.route('**/assets/frames/generated/frame-*', async (route) => {
        delayed += 1;
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.continue();
      });

      // Load the production manifest with no signals installed at all: this is
      // the un-degraded, un-throttled first visit.
      await page.goto('/?story=src%2Fdata%2Fstory.json', { waitUntil: 'load' });
      await expect(page.locator('#frame-image')).toBeVisible();
      await expect(page.locator('#player')).toHaveAttribute('data-frame-id', /.+/);

      // Let the whole first visit play out, including the debounced live-region
      // announcement (~500 ms) that caused the historical 0.155/0.185 shift.
      await page.waitForTimeout(3000);

      const result = await page.evaluate(() => {
        const entries = globalThis.__layoutShifts || [];
        let total = 0;
        for (const entry of entries) if (!entry.hadRecentInput) total += entry.value;
        const stage = document.querySelector('#frame-stage')?.getBoundingClientRect();
        const bar = document.querySelector('.control-bar')?.getBoundingClientRect();
        return {
          total,
          count: entries.length,
          hscroll: document.documentElement.scrollWidth > window.innerWidth,
          stageTop: stage ? Math.round(stage.top) : null,
          controlBarTop: bar ? Math.round(bar.top) : null
        };
      });

      expect(delayed, 'the delay must actually have intercepted frame images, or the measurement is not exercising anything').toBeGreaterThan(0);
      expect(result.hscroll, 'SC-005: no horizontal scroll in normal mode').toBe(false);
      expect(
        result.total,
        `CLS budget exceeded at ${viewport.label}: ${result.total} from ${result.count} shift entries`
      ).toBeLessThan(CLS_BUDGET);
    });
  }

  test('every production frame swaps without displacing the control bar', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 360, height: 800 });
    await installLayoutShiftObserver(page);
    await page.goto('/?story=src%2Fdata%2Fstory.json', { waitUntil: 'load' });
    await expect(page.locator('#frame-image')).toBeVisible();

    const positions = [];
    for (const frameId of ['frame-01', 'frame-02', 'frame-03', 'frame-04']) {
      await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', frameId);
      // Past the 500 ms live-region debounce, so the description has settled.
      await page.waitForTimeout(700);
      positions.push(
        await page.evaluate(() => {
          const bar = document.querySelector('.control-bar')?.getBoundingClientRect();
          return bar ? Math.round(bar.top) : null;
        })
      );
    }

    const spread = Math.max(...positions) - Math.min(...positions);
    // T216 sizes the description reservation from the narrowest supported width
    // precisely so this spread is 0. A non-zero spread is the perceptible
    // displacement FR-015 forbids.
    expect(spread, `control bar moved ${spread}px across frame swaps: ${positions.join(', ')}`).toBe(0);
  });
});
