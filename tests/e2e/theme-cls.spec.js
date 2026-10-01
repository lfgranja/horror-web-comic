import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test.describe('Theme Switcher - Cumulative Layout Shift (CLS) (US1)', () => {
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 360, height: 800 },
    { name: 'ultra-narrow', width: 320, height: 568 }
  ];

  for (const vp of viewports) {
    test(`mantém CLS estritamente 0.00 ao alternar todos os 5 temas em ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openPlayer(page, 'tests/fixtures/story.json', { pause: true });

      // Instala PerformanceObserver para medir layout-shift
      await page.evaluate(() => {
        window.__layoutShifts = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__layoutShifts += entry.value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
      });

      const themes = ['noir', 'eldritch', 'industrial', 'shadow-props', 'cinema'];
      const select = page.locator('#theme');
      await expect(select).toBeVisible();

      // Guarda posição e dimensões de controle e narrador para checar spread = 0
      const initialControlBarBox = await page.locator('nav.control-bar').boundingBox();
      const initialDescBox = await page.locator('#frame-description').boundingBox();

      for (const theme of themes) {
        await select.selectOption(theme);
        // Aguarda estabilização
        await page.waitForTimeout(50);
      }

      const totalCLS = await page.evaluate(() => window.__layoutShifts);
      expect(totalCLS).toBe(0);

      // Verifica estabilidade dimensional do narrador e barra de controle
      const finalControlBarBox = await page.locator('nav.control-bar').boundingBox();
      const finalDescBox = await page.locator('#frame-description').boundingBox();

      if (initialControlBarBox && finalControlBarBox) {
        expect(Math.abs(finalControlBarBox.y - initialControlBarBox.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(finalControlBarBox.height - initialControlBarBox.height)).toBeLessThanOrEqual(1);
      }

      if (initialDescBox && finalDescBox) {
        expect(Math.abs(finalDescBox.width - initialDescBox.width)).toBeLessThanOrEqual(1);
      }
    });
  }
});
