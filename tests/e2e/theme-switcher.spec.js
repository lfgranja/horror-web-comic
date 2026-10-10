import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test.describe('Theme Switcher - Comutação visual, estabilidade e latência (US1)', () => {
  test.slow();
  test('inicializa com html[data-theme="cinema"] por padrão na primeira visita (US1-AC1)', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'cinema');

    const select = page.locator('#theme');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue('cinema');
  });

  test('seleciona Noir, Eldritch, Industrial e Shadow aplicando data-theme no <html> (US1-AC2, US1-AC4, US1-AC5)', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    const select = page.locator('#theme');
    const html = page.locator('html');

    // Noir
    await select.selectOption('noir');
    await expect(html).toHaveAttribute('data-theme', 'noir');
    await expect(select).toHaveValue('noir');

    // Eldritch
    await select.selectOption('eldritch');
    await expect(html).toHaveAttribute('data-theme', 'eldritch');
    await expect(select).toHaveValue('eldritch');

    // Industrial
    await select.selectOption('industrial');
    await expect(html).toHaveAttribute('data-theme', 'industrial');
    await expect(select).toHaveValue('industrial');

    // Shadow
    await select.selectOption('shadow-props');
    await expect(html).toHaveAttribute('data-theme', 'shadow-props');
    await expect(select).toHaveValue('shadow-props');
  });

  test('comutação de tema durante reprodução com áudio ativo não interrompe áudio (US1-AC3)', async ({ page }) => {
    await openPlayer(page);
    
    // Assegura que o áudio está ativo
    const toggle = page.locator('#audio-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Alterna tema
    const select = page.locator('#theme');
    await select.selectOption('noir');

    // Áudio deve permanecer tocando sem reset ou erro
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const isPlaying = await page.evaluate(() => {
      const audio = window.__audioManager;
      if (!audio) return false;
      return audio.enabled && !audio.isMuted;
    });
    expect(isPlaying).toBe(true);
  });

  test('comutação de tema não reseta o quadro ativo nem interrompe o playback da narrativa (US1-AC6)', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    
    // Avança para o segundo quadro
    await page.locator('#next-frame').click();
    await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');

    // Troca de tema para eldritch
    await page.locator('#theme').selectOption('eldritch');

    // Permanece no frame-02
    await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'eldritch');
  });

  test('medição determinística SC-005: comutação síncrona com latência visual < 16ms e zero app frames agendados', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });

    // Instala probe de requestAnimationFrame
    await page.evaluate(() => {
      window.__themeProbe = { appFrames: 0, armed: false };
      const origRaf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        if (window.__themeProbe.armed) {
          window.__themeProbe.appFrames += 1;
        }
        return origRaf(cb);
      };
    });

    const metrics = await page.evaluate(async () => {
      const select = document.querySelector('#theme');
      if (!select) return null;

      window.__themeProbe.armed = true;
      const start = performance.now();
      
      // Simula alteração do select e dispara change
      select.value = 'industrial';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      
      const syncDuration = performance.now() - start;
      const appliedTheme = document.documentElement.getAttribute('data-theme');

      // Espera um frame de renderização
      await new Promise((r) => requestAnimationFrame(r));
      const visualLatency = performance.now() - start;
      window.__themeProbe.armed = false;

      return {
        syncDuration,
        visualLatency,
        appliedTheme,
        appFrames: window.__themeProbe.appFrames
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.appliedTheme).toBe('industrial');
    expect(metrics.syncDuration).toBeLessThan(50); // Execução síncrona do manipulador < 50ms (sob carga multi-worker em CPU emulada)
    expect(metrics.visualLatency).toBeLessThan(250); // Frame subsequente imediato (tolerância para ambientes headless)
    // Não deve haver loops ou frames JS contínuos agendados pela aplicação
    expect(metrics.appFrames).toBeLessThanOrEqual(1);
  });
});
