import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test.describe('Theme Switcher - Acessibilidade Universal (WCAG 2.2 AAA) e Ergonomia (US3)', () => {
  test.slow();
  test('alvo de toque do seletor #theme atende a dimensão mínima de 44x44px em desktop e mobile (US3-AC2, SC-004, FR-005)', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });

    const select = page.locator('#theme');
    await expect(select).toBeVisible();

    const boxDesktop = await select.boundingBox();
    expect(boxDesktop).not.toBeNull();
    expect(boxDesktop.width).toBeGreaterThanOrEqual(44);
    expect(boxDesktop.height).toBeGreaterThanOrEqual(44);

    // Mobile
    await page.setViewportSize({ width: 360, height: 800 });
    const boxMobile = await select.boundingBox();
    expect(boxMobile).not.toBeNull();
    expect(boxMobile.width).toBeGreaterThanOrEqual(44);
    expect(boxMobile.height).toBeGreaterThanOrEqual(44);
  });

  test('navegação por teclado atinge #theme e exibe outline de foco visível (US3-AC3, Contract §UI-2)', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });

    const select = page.locator('#theme');
    await select.focus();
    await expect(select).toBeFocused();

    // Avalia estilo computado de foco
    const outline = await select.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth)
      };
    });

    expect(outline.outlineStyle).not.toBe('none');
    expect(outline.outlineWidth).toBeGreaterThanOrEqual(2);
  });

  test('acessibilidade semântica: label associado, aria-label no select e em cada option (US3-AC4, FR-002, FR-004)', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });

    // Label com classe sr-only para #theme
    const label = page.locator('label[for="theme"]');
    await expect(label).toBeAttached();
    await expect(label).toHaveClass(/sr-only/);
    await expect(label).toHaveText('Atmosfera visual da narrativa');

    // The class name alone is not the contract: `sr-only` must actually collapse
    // the label out of the rendered layout. Asserting only `toHaveClass` is what
    // let a label with NO css rule anywhere in the repo ship as visible text —
    // 156px of live copy inside the control bar, which overflowed the bar at
    // 320px and broke the reflow specs. Assert rendered geometry instead.
    const labelBox = await label.boundingBox();
    expect(labelBox, 'sr-only label must render').not.toBeNull();
    expect(labelBox.width, 'sr-only label must collapse horizontally').toBeLessThanOrEqual(1);
    expect(labelBox.height, 'sr-only label must collapse vertically').toBeLessThanOrEqual(1);
    // It must also be taken out of flow, or a flex parent still reserves its
    // min-content width even at 1px of painted size.
    const labelPosition = await label.evaluate((el) => getComputedStyle(el).position);
    expect(labelPosition).toBe('absolute');

    // And it must still be exposed to assistive technology.
    const accessibleName = await label.evaluate((el) => el.textContent.trim());
    expect(accessibleName).toBe('Atmosfera visual da narrativa');

    // Select
    const select = page.locator('#theme');
    await expect(select).toHaveAttribute('aria-label', 'Atmosfera visual da narrativa');

    // Options com seus respectivos aria-label descritivos
    const expectedOptions = [
      { val: 'cinema', text: 'Cinema', aria: 'Cinema Minimalista (A24 / MUBI)' },
      { val: 'noir', text: 'Noir', aria: 'Graphic Novel Noir (HQ Clássica)' },
      { val: 'eldritch', text: 'Eldritch', aria: 'Atmospheric Eldritch (Gótico / Penumbra)' },
      { val: 'industrial', text: 'Industrial', aria: 'Industrial Brutalist (Terminal / CRT)' },
      { val: 'shadow-props', text: 'Shadow', aria: 'Shadow-Props Base (Tokens Puros)' }
    ];

    for (const opt of expectedOptions) {
      const optionLocator = select.locator(`option[value="${opt.val}"]`);
      await expect(optionLocator).toHaveText(opt.text);
      await expect(optionLocator).toHaveAttribute('aria-label', opt.aria);
    }
  });

  test('suporte a Modo de Alto Contraste (forced-colors: active) com forced-color-adjust e bordas visíveis (US3, FR-009)', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });

    const select = page.locator('#theme');
    await expect(select).toBeVisible();

    const styles = await select.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        forcedColorAdjust: style.forcedColorAdjust,
        borderStyle: style.borderTopStyle,
        borderWidth: parseFloat(style.borderTopWidth)
      };
    });

    if (styles.forcedColorAdjust !== undefined) {
      expect(styles.forcedColorAdjust).toBe('auto');
    }
    expect(styles.borderStyle).not.toBe('none');
    expect(styles.borderWidth).toBeGreaterThanOrEqual(1);
  });
});
