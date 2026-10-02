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

    // The hit test above is necessary but NOT sufficient. The end card is a
    // scroll container clipped to the band above the control bar, so a button
    // scrolled past the band's bottom edge reports a rect that no longer
    // corresponds to any painted pixels — and `elementsFromPoint` then returns
    // whatever sits underneath, which is the control bar this test exists to
    // protect. Assert the button is geometrically inside the band so the action
    // is guaranteed reachable for a reason, not by coincidence.
    const inBand = await page.evaluate(() => {
      const band = document.querySelector('#end-overlay').getBoundingClientRect();
      const button = document.querySelector('#replay').getBoundingClientRect();
      return {
        inside: button.top >= band.top - 1 && button.bottom <= band.bottom + 1,
        band: { top: Math.round(band.top), bottom: Math.round(band.bottom) },
        button: { top: Math.round(button.top), bottom: Math.round(button.bottom) }
      };
    });
    expect(
      inBand.inside,
      `"Rever do início" sits outside the end-overlay band ${JSON.stringify(inBand.band)} at ${JSON.stringify(inBand.button)} — the card scrolled its own action out of reach`
    ).toBe(true);
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

// FR-033 / SC-017 — the control bar must leave the narrative room to breathe at
// the declared minimum viewport. Its height is a direct input to the end-overlay
// band (`bottom: 100dvh - var(--control-bar-top)`), so a bar that grows tall
// starves the band and pushes the end card's action out of reach. That is the
// exact chain that made "Rever do início" unclickable at 320x568. A ceiling here
// fails loudly at the cause, instead of leaving the overlay to compensate for a
// bar that has quietly claimed more of the screen than it should.
//
// The ceiling is 380px because the bar legitimately stacks FOUR full-width
// utility rows at this width (volume 79, speed 51, theme 45, audio 45 → 356px).
// The theme picker cannot share a row with the speed picker: at 200% text the
// two selects need ~276px of min-content in a ~244px row, which is exactly the
// horizontal overflow this bug came from. So the headroom here is deliberately
// narrow — a fifth utility row (~+50px → ~406px) fails, which is the regression
// worth catching. See fix.md "Follow-ups": 356px of 568px is still 63% of the
// screen and deserves a design decision of its own.
const BUDGETS = [
  { label: '320x568', width: 320, height: 568, maxBarHeight: 380 },
  { label: '360x800', width: 360, height: 800, maxBarHeight: 380 }
];

for (const budget of BUDGETS) {
  test(`zz control bar stays within its height budget at ${budget.label}`, async ({ page }) => {
    await page.setViewportSize({ width: budget.width, height: budget.height });
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    const measured = await page.evaluate(() => {
      const bar = document.querySelector('.control-bar').getBoundingClientRect();
      const stage = document.querySelector('#frame-stage').getBoundingClientRect();
      return {
        barHeight: Math.round(bar.height),
        stageHeight: Math.round(stage.height),
        viewportHeight: window.innerHeight,
        barShare: +(bar.height / window.innerHeight).toFixed(3),
        // The sr-only theme label must not be claiming a row of its own.
        themeLabelWidth: Math.round(document.querySelector('label[for="theme"]').getBoundingClientRect().width)
      };
    });
    expect(
      measured.barHeight,
      `control bar is ${measured.barHeight}px (${Math.round(measured.barShare * 100)}% of the viewport, theme label ${measured.themeLabelWidth}px wide) at ${budget.label}`
    ).toBeLessThanOrEqual(budget.maxBarHeight);
    expect(
      measured.stageHeight,
      `the narrative lost its room: stage is ${measured.stageHeight}px at ${budget.label}`
    ).toBeGreaterThan(0);
  });
}
