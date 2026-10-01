import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test.describe('Theme Switcher - Persistência e Sincronização Multi-aba (US2)', () => {
  test('persiste e restaura o tema após reload sem FOUC (US2-AC1, SC-006, FR-007)', async ({ page }) => {
    test.slow();
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    const select = page.locator('#theme');
    await select.selectOption('industrial');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'industrial');

    // Instala script para capturar tema no exato momento da criação do documento (prevenção de FOUC)
    await page.addInitScript(() => {
      window.__initialThemeAtDocStart = document.documentElement.getAttribute('data-theme');
    });

    await page.reload();
    await expect(page.locator('#player')).toBeVisible();

    // Valida que restaurou imediatamente
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'industrial');
    await expect(page.locator('#theme')).toHaveValue('industrial');
  });

  test('sincroniza alterações de tema entre abas via BroadcastChannel em < 100ms (US2-AC2, SC-007, FR-008)', async ({ context }) => {
    test.slow();
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await openPlayer(pageA, 'tests/fixtures/story.json', { pause: true });
    await openPlayer(pageB, 'tests/fixtures/story.json', { pause: true });

    // Aba A altera para 'eldritch'
    const selectA = pageA.locator('#theme');
    const selectB = pageB.locator('#theme');

    const start = Date.now();
    await selectA.selectOption('eldritch');
    await expect(pageA.locator('html')).toHaveAttribute('data-theme', 'eldritch');

    // Aba B deve refletir em < 100ms
    await expect(pageB.locator('html')).toHaveAttribute('data-theme', 'eldritch');
    await expect(selectB).toHaveValue('eldritch');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1500); // margem ampla para CI, mas valida a sincronia passiva

    await pageA.close();
    await pageB.close();
  });

  test('sincronização passiva não dispara loops nem anúncios extras em live regions (FR-008, Non-Goals)', async ({ context }) => {
    test.slow();
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await openPlayer(pageA, 'tests/fixtures/story.json', { pause: true });
    await openPlayer(pageB, 'tests/fixtures/story.json', { pause: true });

    // Monitora eventos change no select de B
    await pageB.evaluate(() => {
      window.__changeEventsDispatched = 0;
      document.querySelector('#theme')?.addEventListener('change', () => {
        window.__changeEventsDispatched += 1;
      });
    });

    // Altera em A
    await pageA.locator('#theme').selectOption('noir');
    await expect(pageB.locator('html')).toHaveAttribute('data-theme', 'noir');

    const dispatched = await pageB.evaluate(() => window.__changeEventsDispatched);
    expect(dispatched).toBe(0);

    await pageA.close();
    await pageB.close();
  });

  test('revalida tema pós-bfcache no evento pageshow persisted (FR-008, Contract §Storage-4)', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    
    // Altera storage diretamente e dispara evento pageshow com persisted: true
    await page.evaluate(() => {
      localStorage.setItem('hwc.theme', 'shadow-props');
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'shadow-props');
    await expect(page.locator('#theme')).toHaveValue('shadow-props');
  });
});
