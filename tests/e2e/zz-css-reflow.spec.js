import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

// T129 / SC-017 / FR-009 / FR-010 — reflow at 320/360px with 200% text.
// WHY THIS TEST EXISTS NEXT TO reflow.spec.js: the existing spec fetches the
// frame-01 description from JSON and asserts it is on screen, but openPlayer's
// pause click races autoplay (fixture frames last 1500-1800ms; under load the
// click lands after the player has already advanced to frame-02/03/04, so the
// paused frame never matches and the spec fails intermittently — observed
// 2/3 red runs with exactly this signature). That is a TEST race, not a CSS
// defect: the layout assertions themselves are sound. This spec is race-free
// by capturing the CURRENT description after pausing and asserting it is
// stable across the 200% zoom, then checking reflow geometry directly
// (document scrollWidth vs viewport — overflow-x:hidden must not be allowed
// to mask real overflow — plus per-control in-viewport and 44px checks).
const viewports = [
  { label: '320', width: 320, height: 568 },
  { label: '360', width: 360, height: 800 }
];

for (const viewport of viewports) {
  test(`zz reflows without clipping or horizontal overflow at ${viewport.label}px with 200% text`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    // The helper's single pause click races boot: if it lands while the
    // player is still idle it STARTS playback instead of pausing. Settle it.
    const player = page.locator('#player');
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if ((await player.getAttribute('data-status')) === 'paused') break;
      await page.locator('#play-toggle').click({ force: true });
      await page.waitForTimeout(200);
    }
    await expect(player).toHaveAttribute('data-status', 'paused');
    // Race-free anchor: whatever frame we paused on is the expected text.
    // The live region is written through a 500 ms debounce, so poll for it
    // rather than reading it synchronously.
    const description = page.locator('#frame-description');
    await expect(description).not.toBeEmpty({ timeout: 5000 });
    const expectedDescription = await description.textContent();
    expect(expectedDescription.trim().length).toBeGreaterThan(0);
    await page.addStyleTag({ content: ':root { font-size: 200% !important; }' });
    await expect(page.locator('#frame-description')).toHaveText(expectedDescription);

    const layout = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      };
      const controls = [...document.querySelectorAll('#player button, #player input, #player select')].filter(visible);
      const controlIssues = controls.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.id || element.tagName.toLowerCase(),
          rect: { left: rect.left, right: rect.right, width: rect.width, height: rect.height },
          overflowX: element.scrollWidth > element.clientWidth + 1,
          overflowY: element.scrollHeight > element.clientHeight + 1
        };
      });
      const outOfViewport = controlIssues.filter((issue) => issue.rect.left < -1 || issue.rect.right > viewportWidth + 1);
      const tooSmall = controlIssues.filter((issue) => issue.rect.width < 44 || issue.rect.height < 44);
      const clipped = controlIssues.filter((issue) => issue.overflowX || issue.overflowY);
      const bar = document.querySelector('.control-bar');
      const description = document.querySelector('#frame-description');
      const descriptionRect = description.getBoundingClientRect();
      const stageRect = document.querySelector('#frame-stage').getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(description);
      const descriptionRects = [...range.getClientRects()];
      return {
        fontSize: getComputedStyle(document.documentElement).fontSize,
        documentOverflow: document.documentElement.scrollWidth > viewportWidth + 1
          || document.body.scrollWidth > viewportWidth + 1,
        maxScrollX: window.scrollX,
        controlBarOverflow: bar.scrollWidth > bar.clientWidth + 1,
        controlBarWrapped: bar.scrollHeight > 60,
        outOfViewport,
        tooSmall,
        clipped,
        descriptionText: description.textContent,
        descriptionInStage: descriptionRects.length > 0 && descriptionRects.every((rect) => (
          rect.left >= stageRect.left - 1 && rect.right <= stageRect.right + 1
          && rect.top >= stageRect.top - 1 && rect.bottom <= stageRect.bottom + 1
        ))
      };
    });
    expect(layout.fontSize).toBe('32px');
    expect(layout.documentOverflow).toBe(false);
    expect(layout.controlBarOverflow).toBe(false);
    expect(layout.outOfViewport, JSON.stringify(layout.outOfViewport)).toEqual([]);
    expect(layout.tooSmall, JSON.stringify(layout.tooSmall)).toEqual([]);
    expect(layout.clipped, JSON.stringify(layout.clipped)).toEqual([]);
    expect(layout.descriptionText).toBe(expectedDescription);
    expect(layout.descriptionInStage).toBe(true);
  });
}
