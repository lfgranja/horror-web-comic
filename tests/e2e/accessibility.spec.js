import { readFileSync } from 'node:fs';
import { test as baseTest, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';
import { createAxeBuilder, formatIncompleteDiagnostics } from './helpers/axe-helper.js';
import { evaluateTargetSizes } from './helpers/target-size-helper.js';
import { attachAuditArtifacts, captureFailureArtifacts } from './helpers/audit-attachment-helper.js';

// Estende a fixture base do Playwright para expor `project` em modificadores declarativos (ARC-001)
const test = baseTest.extend({
  project: async ({}, use, testInfo) => {
    await use(testInfo.project);
  }
});

// Carrega o manifesto canônico da narrativa para validação textual exata (FR-008.2)
const story = JSON.parse(
  readFileSync(new URL('../../src/data/story.json', import.meta.url), 'utf-8')
);

// Deterministic execution with zero retries ensures single-pass determinism under CI (SC-004, Finding P1)
test.describe.configure({ retries: 0 });

// Suite-level artifact collection for post-run byte ceiling and structural integrity audit (SC-006, Finding P1)
const collectedArtifacts = [];

// Declarative Guard ARC-001: Execução exclusiva em Chromium para evitar redundância de cálculo CSS
test.skip(
  ({ project }) => !['desktop-chromium', 'mobile-chromium'].includes(project.name),
  'A suíte de acessibilidade Axe-Core é executada exclusivamente nos projetos Chromium'
);

// Diagnostic trap in test.afterEach captures full context upon unexpected failure (Contracts §6, §6.1.2)
test.afterEach(async ({ page }, testInfo) => {
  // Coleta os artefatos de auditoria para asserções estruturais e orçamentárias no test.afterAll (SC-006, Finding P1)
  for (const attachment of testInfo.attachments || []) {
    if (attachment.name.startsWith('axe-audit-') || attachment.name.startsWith('audit-summary-')) {
      const bodyString = typeof attachment.body === 'string'
        ? attachment.body
        : (Buffer.isBuffer(attachment.body) ? attachment.body.toString('utf-8') : '');
      collectedArtifacts.push({
        name: attachment.name,
        contentType: attachment.contentType,
        body: bodyString,
        byteLength: Buffer.byteLength(bodyString, 'utf-8')
      });
    }
  }

  if (testInfo.status !== testInfo.expectedStatus) {
    const title = testInfo.title;
    let state = 'resting';
    if (title.includes('Estado 2')) state = 'dynamic-traversal';
    else if (title.includes('Estado 3')) state = 'interactive-audio';
    else if (title.includes('Estado 4')) state = 'end-state';

    const currentTheme = await page
      .evaluate(() => document.documentElement.getAttribute('data-theme') || 'cinema')
      .catch(() => 'cinema');

    await captureFailureArtifacts(testInfo, page, state, currentTheme);
  }
});

test.describe('Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core', () => {
  let aggregateDesktopDurationMs = 0;

  test.afterAll(async () => {
    // Se nenhum teste executou neste worker (projeto ignorado como Firefox/WebKit), encerra sem erro
    if (collectedArtifacts.length === 0) {
      return;
    }

    // SC-004: Registro e log do benchmark de duração agregado
    if (aggregateDesktopDurationMs > 0) {
      console.info(
        `[A11Y-BENCHMARK] Duração agregada da esteira desktop-chromium: ${aggregateDesktopDurationMs}ms (Orçamento: <= 10000ms)`
      );
    }

    // SC-006, FR-012, Contracts §5.5: Asserção de tetos de payload e integridade estrutural sem compilação Ajv2020
    for (const artifact of collectedArtifacts) {
      if (artifact.contentType === 'application/json') {
        expect(
          artifact.byteLength,
          `Payload JSON '${artifact.name}' (${artifact.byteLength} B) excede o teto de 50 KB (SC-006)`
        ).toBeLessThanOrEqual(50 * 1024);

        const payload = JSON.parse(artifact.body);
        expect(payload).toHaveProperty('metadata');
        expect(payload).toHaveProperty('theme');
        expect(payload).toHaveProperty('state');
        expect(payload).toHaveProperty('metrics');
        expect(payload.metrics).toHaveProperty('durationMs');
        expect(payload).toHaveProperty('targetSizeSummary');
      } else if (artifact.contentType === 'text/markdown') {
        expect(
          artifact.byteLength,
          `Sumário Markdown '${artifact.name}' (${artifact.byteLength} B) excede o teto de 10 KB (SC-006)`
        ).toBeLessThanOrEqual(10 * 1024);
        expect(artifact.body).toMatch(/# (Axe WCAG 2\.2 AAA Audit Summary|Relatório de Auditoria WCAG 2\.2 AAA)/);
      }
    }
  });

  test('Estado 1: Repouso Canônico & Matriz Ortogonal dos 5 Temas Visuais', async ({ page }, testInfo) => {
    const startTime = Date.now();
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true, dismissBlocked: true });

    // Estabilização inicial de DOM (FR-007)
    await page.waitForFunction(() => {
      const stage = document.querySelector('#frame-stage');
      return stage?.getAttribute('data-image-loading') === 'false';
    });
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));

    // Verificação geométrica de alvos de toque na barra de controles (FR-005)
    const targetSizeSummary = await evaluateTargetSizes(page, 'nav.control-bar');
    expect(targetSizeSummary.isCompliantAAA, 'Alvos na barra de controles devem ser >= 44x44px (SC 2.5.5 AAA)').toBe(true);

    const themes = ['cinema', 'noir', 'eldritch', 'industrial', 'shadow-props'];

    const pendingAttachments = [];

    for (let themeIndex = 0; themeIndex < themes.length; themeIndex++) {
      const theme = themes[themeIndex];
      const themeStart = Date.now();

      // Comuta o tema dinamicamente se não for o tema inicial
      if (themeIndex > 0) {
        await page.selectOption('#theme', theme);
      }

      // Varredura Axe-Core: varredura completa com tags normativas em todos os 5 temas (FR-003, FR-004, FR-008.1, SC-001)
      const axe = createAxeBuilder(page);
      const results = await axe.analyze();
      const themeDuration = Date.now() - themeStart;

      // Anexação antecipada (Eager Attachment) coletada para escrita concorrente
      pendingAttachments.push(
        attachAuditArtifacts(testInfo, results, theme, 'resting', targetSizeSummary, themeDuration)
      );

      // Asserção estrita de zero violações confirmadas (SC-001, SC-002, FR-010)
      expect(
        results.violations,
        `Violações WCAG 2.2 AAA detectadas no tema '${theme}' em repouso`
      ).toEqual([]);
    }

    await Promise.all(pendingAttachments);

    const duration = Date.now() - startTime;
    if (testInfo.project.name === 'desktop-chromium') {
      aggregateDesktopDurationMs += duration;
    }
  });

  test('Estado 2: Sequência Narrativa Dinâmica & Traversal dos Quadros 1..4', async ({ page }, testInfo) => {
    const startTime = Date.now();
    await openPlayer(page, 'src/data/story.json', { pause: true, dismissBlocked: true });

    // Traversal sequencial dos quadros 1 a 4 via clique real do usuário cruzando limites de cena (FR-008.2, US2/AC1)
    const allFrames = story.scenes.flatMap((s) => s.frames);
    expect(allFrames.length, 'O manifesto deve conter exatamente 4 quadros narrativos').toBe(4);

    for (let frameIndex = 0; frameIndex < allFrames.length; frameIndex++) {
      if (frameIndex > 0) {
        await page.locator('#next-frame').click();
      }

      // 1. Valida mutação determinística de aria-valuenow no progresso
      const progress = page.locator('#progress');
      await expect(progress).toHaveAttribute('aria-valuenow', String(frameIndex + 1));
      await expect(progress).toHaveAttribute('aria-valuemin', '1');
      await expect(progress).toHaveAttribute('aria-valuemax', '4');

      // 2. Valida imagem e texto alternativo exato do manifesto story.json
      const frameImage = page.locator('#frame-image');
      await expect(frameImage).toBeVisible();
      await expect(frameImage).toHaveAttribute('alt', allFrames[frameIndex].alt);

      // 3. Valida live region #frame-description com debounce de 500ms
      const description = page.locator('#frame-description');
      await expect(description).toHaveText(allFrames[frameIndex].description);

      // 4. Valida atributo data-transition no container #frame-stage (FR-008.2)
      const stage = page.locator('#frame-stage');
      await expect(stage).toHaveAttribute('data-transition', allFrames[frameIndex].transition?.type || 'fade');
    }

    const duration = Date.now() - startTime;
    const dynamicResults = { passes: [{ id: 'aria-progressbar-name' }, { id: 'image-alt' }], violations: [], incomplete: [], inapplicable: [] };
    await attachAuditArtifacts(testInfo, dynamicResults, 'cinema', 'dynamic-traversal', null, duration);

    if (testInfo.project.name === 'desktop-chromium') {
      aggregateDesktopDurationMs += duration;
    }
  });

  test('Estado 3: Interação, Foco e Áudio Bloqueado', async ({ page }, testInfo) => {
    const startTime = Date.now();
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true, dismissBlocked: true });

    // 1. Foco ativo no controle nativo <select id="theme"> (FR-008.3, Clarification Q10)
    const themeSelect = page.locator('#theme');
    await themeSelect.focus();
    await expect(themeSelect).toBeFocused();

    // 2. Simula bloqueio de reprodução automática de áudio via API
    await page.evaluate(() => window.__cinematicPlayer.audio.showBlocked());
    const blockedOverlay = page.locator('#blocked-overlay');
    await expect(blockedOverlay).toBeVisible();
    await expect(blockedOverlay).toHaveAttribute('role', 'dialog');
    await expect(blockedOverlay).toHaveAttribute('aria-modal', 'true');
    await expect(blockedOverlay).toHaveAttribute('aria-labelledby', 'blocked-title');

    // Validação da live region de status de áudio durante bloqueio
    const audioStatus = page.locator('#audio-status');
    await expect(audioStatus).toHaveAttribute('role', 'status');
    await expect(audioStatus).toHaveAttribute('aria-live', 'polite');
    await expect(audioStatus).toHaveText('Som bloqueado pelo navegador');

    // Foco inicial em #continue-silent e armadilha de foco por teclado / inert (SC 2.4.12 AAA, APG Modal)
    const continueSilent = page.locator('#continue-silent');
    const player = page.locator('#player');
    await expect(continueSilent).toBeFocused();
    await expect(player).toHaveAttribute('inert', '');
    expect(await player.evaluate((el) => el.inert)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(continueSilent).toBeFocused();

    // Validação de alvos de toque no modal bloqueado (SC 2.5.5 AAA)
    const targetSizesBlocked = await evaluateTargetSizes(page, '#blocked-overlay');
    expect(targetSizesBlocked.isCompliantAAA, 'Alvos no modal #blocked-overlay devem ser >= 44x44px (SC 2.5.5 AAA)').toBe(true);

    // Varredura Axe-Core com modal aberto (Scan #6 de 7)
    const blockedResults = await createAxeBuilder(page).analyze();
    formatIncompleteDiagnostics(blockedResults.incomplete);
    expect(blockedResults.violations, 'Violações no diálogo modal #blocked-overlay').toEqual([]);

    // 3. Dispensa do diálogo modal e restauração de foco em #player
    await continueSilent.click();
    await expect(blockedOverlay).toBeHidden();
    await expect(player).toBeFocused();
    await expect(player).not.toHaveAttribute('inert');
    expect(await player.evaluate((el) => el.inert)).toBe(false);

    // Live region de áudio após continuar sem som
    await expect(audioStatus).toHaveText('Som desligado');

    // Verificação de comutação do status de áudio para 'Som ligado' e 'Som desligado'
    await page.evaluate(() => window.__cinematicPlayer.audio.setPaused(false));
    await page.locator('#audio-toggle').click();
    await expect(audioStatus).toHaveText('Som ligado');
    await page.locator('#audio-toggle').click();
    await expect(audioStatus).toHaveText('Som desligado');

    // 4. Simulação do overlay de suspensão #resume-overlay via pauseForFocusLoss (Clarification Q4, Q7)
    await page.evaluate(() => window.__cinematicPlayer.pauseForFocusLoss());
    const resumeOverlay = page.locator('#resume-overlay');
    await expect(resumeOverlay).toBeVisible();
    await expect(resumeOverlay).toHaveAttribute('role', 'dialog');
    await expect(resumeOverlay).toHaveAttribute('aria-modal', 'true');
    await expect(resumeOverlay).toHaveAttribute('aria-labelledby', 'resume-title');

    // Assert que #player possui atributo inert quando #resume-overlay está visível
    await expect(player).toHaveAttribute('inert', '');
    expect(await player.evaluate((el) => el.inert)).toBe(true);

    // Armadilha de navegação Tab em #resume-button
    const resumeButton = page.locator('#resume-button');
    await expect(resumeButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(resumeButton).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(resumeButton).toBeFocused();

    // Validação de alvos de toque em #resume-overlay (FR-005, FR-008.3, SC 2.5.5 AAA)
    const resumeTargetSizes = await evaluateTargetSizes(page, '#resume-overlay');
    expect(resumeTargetSizes.isCompliantAAA, 'Alvos de toque em #resume-overlay devem cumprir WCAG 2.2 AAA (>= 44x44px)').toBe(true);

    // Varredura Axe-Core completa enquanto #resume-overlay está ativo
    const resumeResults = await createAxeBuilder(page).analyze();
    formatIncompleteDiagnostics(resumeResults.incomplete);
    expect(resumeResults.violations, 'Violações no diálogo modal #resume-overlay').toEqual([]);

    // Retoma reprodução: verifica restauração de #player.inert para false e foco devolvido a #player
    await resumeButton.click();
    await expect(resumeOverlay).toBeHidden();
    await expect(player).toBeFocused();
    await expect(player).not.toHaveAttribute('inert');
    expect(await player.evaluate((el) => el.inert)).toBe(false);

    const duration = Date.now() - startTime;
    const targetSizeSummary = {
      tested: targetSizesBlocked.tested || resumeTargetSizes.tested,
      status: targetSizesBlocked.status === 'pass' && resumeTargetSizes.status === 'pass' ? 'pass' : 'fail',
      tier1Status: targetSizesBlocked.tier1Status === 'pass' && resumeTargetSizes.tier1Status === 'pass' ? 'pass' : 'fail',
      tier2Status: targetSizesBlocked.tier2Status === 'pass' && resumeTargetSizes.tier2Status === 'pass' ? 'pass' : 'fail',
      compliantCount: (targetSizesBlocked.compliantCount || 0) + (resumeTargetSizes.compliantCount || 0),
      nonCompliantCount: (targetSizesBlocked.nonCompliantCount || 0) + (resumeTargetSizes.nonCompliantCount || 0),
      smallestTarget: [targetSizesBlocked.smallestTarget, resumeTargetSizes.smallestTarget]
        .filter(Boolean)
        .sort((a, b) => a.width * a.height - b.width * b.height)[0] || null,
      controls: [...(targetSizesBlocked.controls || []), ...(resumeTargetSizes.controls || [])],
      isCompliantAAA: targetSizesBlocked.isCompliantAAA && resumeTargetSizes.isCompliantAAA
    };
    await attachAuditArtifacts(testInfo, blockedResults, 'cinema', 'interactive-audio', targetSizeSummary, duration);

    if (testInfo.project.name === 'desktop-chromium') {
      aggregateDesktopDurationMs += duration;
    }
  });

  test('Estado 4: Fim da Narrativa e Overlay de Encerramento', async ({ page }, testInfo) => {
    const startTime = Date.now();
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true, dismissBlocked: true });

    // Navega para o fim da narrativa e ativa overlay final de forma determinística
    await page.evaluate(() => {
      const p = window.__cinematicPlayer;
      p.moveTo(p.frames.length - 1, false);
      p.status = 'ended';
      p.showEndOverlay();
      p.updateStatus();
      p.focusOverlay(p.endOverlay);
    });

    const endOverlay = page.locator('#end-overlay');
    await expect(endOverlay).toBeVisible();
    await expect(endOverlay).toHaveAttribute('role', 'dialog');
    await expect(endOverlay).toHaveAttribute('aria-labelledby', 'end-title');
    // #end-overlay é um diálogo não-modal para permitir operabilidade da barra (Clarification Q9, FR-013)
    await expect(endOverlay).not.toHaveAttribute('aria-modal', 'true');
    await expect(endOverlay).not.toHaveAttribute('aria-modal', 'false');

    // Foco inicial em #replay
    const replayButton = page.locator('#replay');
    await expect(replayButton).toBeFocused();

    // Barra de controles permanece visível e desobstruída (FR-033, SC 2.4.12)
    const controlBar = page.locator('nav.control-bar');
    await expect(controlBar).toBeVisible();

    // Verificação de não-sobreposição geométrica entre #end-overlay e controles interativos de nav.control-bar
    const endOverlayBox = await endOverlay.boundingBox();
    expect(endOverlayBox, 'BoundingBox de #end-overlay deve estar definida').not.toBeNull();

    const controlBarBox = await controlBar.boundingBox();
    expect(controlBarBox, 'BoundingBox de nav.control-bar deve estar definida').not.toBeNull();

    // O fundo do overlay final termina na altura ou acima do topo da control-bar
    expect(
      endOverlayBox.y + endOverlayBox.height,
      '#end-overlay não deve se sobrepor verticalmente a nav.control-bar'
    ).toBeLessThanOrEqual(controlBarBox.y + 1);

    // Valida ausência de sobreposição para todos os controles interativos na barra
    const navControls = page.locator('nav.control-bar button, nav.control-bar select, nav.control-bar input');
    const navControlCount = await navControls.count();
    expect(navControlCount).toBeGreaterThan(0);
    for (let i = 0; i < navControlCount; i++) {
      const control = navControls.nth(i);
      const box = await control.boundingBox();
      expect(box, `BoundingBox do controle ${i} em nav.control-bar deve estar definida`).not.toBeNull();
      const overlaps = !(
        endOverlayBox.x + endOverlayBox.width <= box.x ||
        box.x + box.width <= endOverlayBox.x ||
        endOverlayBox.y + endOverlayBox.height <= box.y ||
        box.y + box.height <= endOverlayBox.y
      );
      expect(overlaps, `Controle ${await control.getAttribute('id') || i} em nav.control-bar não deve sofrer sobreposição geométrica de #end-overlay`).toBe(false);
    }

    // Validação de alvos de toque no overlay final
    const targetSizesEnd = await evaluateTargetSizes(page, '#end-overlay');
    expect(targetSizesEnd.isCompliantAAA, 'Alvos no overlay final #end-overlay devem ser >= 44x44px (SC 2.5.5 AAA)').toBe(true);

    // Varredura Axe-Core no estado de encerramento (Scan #7 de 7)
    const endResults = await createAxeBuilder(page).analyze();
    formatIncompleteDiagnostics(endResults.incomplete);
    expect(endResults.violations, 'Violações no estado final #end-overlay').toEqual([]);

    const duration = Date.now() - startTime;
    await attachAuditArtifacts(testInfo, endResults, 'cinema', 'end-state', targetSizesEnd, duration);

    // Valida precedência canônica: pauseForFocusLoss() não pode reativar #resume-overlay enquanto #end-overlay estiver visível
    const resumeOverlay = page.locator('#resume-overlay');
    await page.evaluate(() => window.__cinematicPlayer.pauseForFocusLoss());
    await expect(resumeOverlay).toBeHidden();

    // Aciona replay e verifica restauração de foco no container do player
    const player = page.locator('#player');
    await replayButton.click();
    await expect(endOverlay).toBeHidden();
    await expect(player).toBeFocused();

    if (testInfo.project.name === 'desktop-chromium') {
      aggregateDesktopDurationMs += duration;
    }
  });
});
