import { test, expect } from '@playwright/test';
import { openApp, waitForPlayer, expectFrameId, resetStorage, selectors } from './helpers.js';

test.describe('US4 reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page);
    await waitForPlayer(page);
  });

  test('auto-advance continues under prefers-reduced-motion (FR-011, SC-006)', async ({ page }) => {
    await expectFrameId(page, 'f-001');
    await expectFrameId(page, 'f-002');
    await expectFrameId(page, 'f-003');
  });

  test('transitions collapse to cut / 0ms under reduced motion (FR-011)', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const els = [
        document.querySelector('#frame-stage'),
        document.querySelector('#frame-image'),
        document.querySelector('#player'),
      ].filter(Boolean);
      return els.map((el) => {
        const cs = getComputedStyle(el);
        return {
          transitionDuration: cs.transitionDuration,
          animationDuration: cs.animationDuration,
          animationName: cs.animationName,
        };
      });
    });
    expect(styles.length).toBeGreaterThan(0);
    for (const s of styles) {
      const durations = [...s.transitionDuration.split(','), ...s.animationDuration.split(',')].map(
        (d) => parseFloat(d) || 0,
      );
      for (const d of durations) {
        expect(d).toBeLessThanOrEqual(0.05);
      }
      expect(s.animationName === 'none' || s.animationName === '').toBeTruthy();
    }
  });

  test('no long CSS animation runs during advance under reduced motion', async ({ page }) => {
    const animated = await page.evaluate(() => {
      const els = [...document.querySelectorAll('*')];
      return els.filter((el) => {
        const cs = getComputedStyle(el);
        // animation-duration alone is not motion: with animation-name: none
        // nothing plays. `.loading-mark` carries a 1.2s duration and no name.
        const d = cs.animationName === 'none' ? 0 : (parseFloat(cs.animationDuration) || 0);
        const t = Math.max(
          ...cs.transitionDuration.split(',').map((x) => parseFloat(x) || 0),
        );
        return d > 0.05 || t > 0.05;
      }).length;
    });
    expect(animated).toBe(0);
  });
});
