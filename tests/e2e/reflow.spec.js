import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

const viewports = [
  { label: '320', width: 320, height: 568 },
  { label: '360', width: 360, height: 800 }
];

for (const viewport of viewports) {
  test(`reflows controls and descriptions at ${viewport.label}px with 200% text`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    const expectedDescription = await page.evaluate(async () => {
      const response = await fetch('tests/fixtures/story.json');
      const story = await response.json();
      return story.scenes[0].frames[0].description;
    });
    await page.addStyleTag({ content: ':root { font-size: 200% !important; }' });
    await expect(page.locator('#frame-description')).toHaveText(expectedDescription);
    const layout = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      };
      const elements = [...document.querySelectorAll('#app *')].filter(visible);
      const outOfBounds = elements.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      }).map((element) => ({ tag: element.tagName.toLowerCase(), id: element.id, className: element.className }));
      const textClipping = elements.filter((element) => {
        if (!Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) return false;
        return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
      }).map((element) => ({ tag: element.tagName.toLowerCase(), id: element.id, className: element.className, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
      const controls = [...document.querySelectorAll('#player button, #player input, #player select')].filter(visible);
      const controlIssues = controls.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1 || rect.width < 44 || rect.height < 44 || element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
      }).map((element) => ({ id: element.id, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
      const description = document.querySelector('#frame-description');
      const descriptionRect = description.getBoundingClientRect();
      const stageRect = document.querySelector('#frame-stage').getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(description);
      const descriptionRects = [...range.getClientRects()];
      const descriptionClipped = descriptionRects.length === 0 || descriptionRects.some((rect) => rect.left < stageRect.left - 1 || rect.right > stageRect.right + 1 || rect.top < stageRect.top - 1 || rect.bottom > stageRect.bottom + 1);
      return {
        fontSize: getComputedStyle(document.documentElement).fontSize,
        horizontalOverflow: document.documentElement.scrollWidth > viewportWidth || document.body.scrollWidth > viewportWidth,
        outOfBounds,
        textClipping,
        controlIssues,
        descriptionClipped,
        descriptionText: description.textContent,
        descriptionRect: { left: descriptionRect.left, right: descriptionRect.right, top: descriptionRect.top, bottom: descriptionRect.bottom },
        stageRect: { left: stageRect.left, right: stageRect.right, top: stageRect.top, bottom: stageRect.bottom }
      };
    });
    expect(layout.fontSize).toBe('32px');
    expect(layout.horizontalOverflow).toBe(false);
    expect(layout.outOfBounds).toEqual([]);
    expect(layout.textClipping).toEqual([]);
    expect(layout.controlIssues).toEqual([]);
    expect(layout.descriptionText).toBe(expectedDescription);
    expect(layout.descriptionClipped).toBe(false);
  });
}
