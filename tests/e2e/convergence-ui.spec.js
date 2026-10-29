import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test('mist token affected surfaces observable rendered contrast >= 7:1', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const ratios = await page.evaluate(() => {
    function luminance(s) {
      const rgb = s.match(/\d+\.?\d*/g).map((v) => {
        const n = parseFloat(v) / 255;
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }
    function ratio(c1, c2) {
      const l1 = luminance(c1);
      const l2 = luminance(c2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    const selectors = ['.frame-counter', '.frame-placeholder', '.audio-hint', '.audio-status'];
    const results = [];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) { results.push({ selector: sel, ratio: 0 }); continue; }
      const style = window.getComputedStyle(el);
      let bg = style.backgroundColor;
      let parent = el.parentElement;
      while (parent && bg === 'rgba(0, 0, 0, 0)' && parent !== document.body && parent !== document.documentElement) {
        bg = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      if (bg === 'rgba(0, 0, 0, 0)') bg = 'rgb(7, 8, 13)';
      const r = ratio(style.color, bg);
      results.push({ selector: sel, ratio: r, fore: style.color, back: bg });
    }
    return results;
  });
  for (const r of ratios) {
    expect(r.ratio, `contrast for ${r.selector}`).toBeGreaterThanOrEqual(7);
  }
});

test('frame-slide-right runs opposite horizontal direction at runtime', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.evaluate(() => {
    document.querySelector('#frame-stage').setAttribute('data-transition', 'slide-right');
  });
  await page.waitForTimeout(50);
  const direction = await page.evaluate(() => {
    const stage = document.querySelector('#frame-stage');
    const img = stage ? stage.querySelector('.frame-image') : null;
    if (!img) return { animationName: '', text: '' };
    const s = window.getComputedStyle(img);
    let keyText = '';
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.type === CSSRule.KEYFRAMES_RULE && (rule.name === s.animationName || rule.name === 'frame-slide')) {
            for (const k of rule.cssRules || []) {
              keyText += k.style.cssText + '; ';
            }
          }
        }
      } catch (e) {}
    }
    return { animationName: s.animationName || '', keyText: keyText, transitionAttr: stage ? stage.getAttribute('data-transition') : '' };
  });
  expect(direction.animationName).toMatch(/slide/);
  expect(direction.transitionAttr).toBe('slide-right');
  expect(direction.keyText).toContain('translateX(-4%)');
});
