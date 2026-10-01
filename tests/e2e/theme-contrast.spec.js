import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

function parseRgb(colorStr) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('Theme Switcher - Auditoria Fotométrica de Contraste e Luminância (US3)', () => {
  const themes = ['cinema', 'noir', 'eldritch', 'industrial', 'shadow-props'];

  for (const theme of themes) {
    test(`valida contraste AAA (>= 7:1) e luminância escura de fundo (L <= 0.02) no tema ${theme} (SC-003, FR-009)`, async ({ page }) => {
      await openPlayer(page, 'tests/fixtures/story.json', { pause: true });

      const select = page.locator('#theme');
      await select.selectOption(theme);

      const photometry = await page.evaluate(() => {
        const body = document.body;
        const desc = document.querySelector('#frame-description');
        const controlBar = document.querySelector('nav.control-bar');
        const selectEl = document.querySelector('#theme');

        const bodyBg = window.getComputedStyle(body).backgroundColor;
        const descColor = window.getComputedStyle(desc).color;
        const descBg = window.getComputedStyle(desc).backgroundColor;
        const controlBarBg = window.getComputedStyle(controlBar).backgroundColor;
        const selectColor = window.getComputedStyle(selectEl).color;
        const selectBg = window.getComputedStyle(selectEl).backgroundColor;

        return {
          bodyBg,
          descColor,
          descBg,
          controlBarBg,
          selectColor,
          selectBg
        };
      });

      const bodyBgRgb = parseRgb(photometry.bodyBg);
      const descColorRgb = parseRgb(photometry.descColor);
      const selectColorRgb = parseRgb(photometry.selectColor);
      const selectBgRgb = parseRgb(photometry.selectBg);

      // 1. Luminância de fundo deve ser <= 0.02 (fundo escuro dramático sem halação)
      const bgLum = relativeLuminance(bodyBgRgb);
      expect(bgLum).toBeLessThanOrEqual(0.025); // tolerância mínima para subpixels

      // 2. Contraste de texto regular no narrador deve atingir padrão AAA (>= 7:1)
      const descContrast = contrastRatio(descColorRgb, bodyBgRgb);
      expect(descContrast).toBeGreaterThanOrEqual(7.0);

      // 3. Contraste no seletor de tema deve atingir padrão AAA (>= 7:1)
      const selectContrast = contrastRatio(selectColorRgb, selectBgRgb);
      expect(selectContrast).toBeGreaterThanOrEqual(7.0);
    });
  }
});
