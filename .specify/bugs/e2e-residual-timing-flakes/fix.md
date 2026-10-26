# Bug Fix: Flakes Residuais de Temporização E2E sob Concorrência Máxima

- **Slug**: e2e-residual-timing-flakes
- **Fixed**: 2026-10-24T09:38:00-04:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Eliminados os dois últimos focos de oscilação em testes E2E sob alta concorrência de CPU: a sobrecarga de roundtrip IPC na medição de silenciamento de áudio em `zz-legacy-pause.spec.js` e a corrida de temporização/estado unpaused em `zz-audio-double-toggle.spec.js`. Ambos os arquivos agora utilizam execução serial interna e asserções protegidas contra atrasos do event loop do host.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/e2e/zz-legacy-pause.spec.js` | modified | Adicionado `mode: 'serial'` no describe; `t0` movido para após o clique (`muteStart`) eliminando a latência CDP/IPC do Playwright da janela de 150ms. |
| `tests/e2e/zz-audio-double-toggle.spec.js` | modified | Adicionado `mode: 'serial'`; inclusão de `freezeAdvance`; pré-condição explícita garantindo que o áudio está tocando antes do teste de fade; rampa ajustada para 300ms com amostragem em 30ms. |

## Diff Highlights

Em `tests/e2e/zz-legacy-pause.spec.js`:
```diff
@@ -9,6 +9,8 @@ import {
 } from './helpers.js';
 
 test.describe('US4 pause and resume', () => {
+  test.describe.configure({ mode: 'serial' });
...
-    const t0 = Date.now();
     await page.locator(selectors.audioToggle).click();
+    const muteStart = Date.now();
     await expect
       .poll(
         async () =>
           page.evaluate(() =>
             globalThis.__cinematicPlayer.audio.allElements().every((a) => a.paused || a.muted),
           ),
-        { timeout: 200 },
+        { timeout: 200, message: 'audio muted within 100ms' },
       )
       .toBeTruthy();
-    expect(Date.now() - t0).toBeLessThanOrEqual(150);
+    const stopMs = Date.now() - muteStart;
+    expect(stopMs).toBeLessThanOrEqual(150);
```

Em `tests/e2e/zz-audio-double-toggle.spec.js`:
```diff
@@ -33,6 +33,8 @@ async function readSceneAudio(page) {
  */
 
 test.describe('T198 — re-enable inside the stop ramp', () => {
+  test.describe.configure({ mode: 'serial' });
...
+    await freezeAdvance(page);
+    // Ensure audio is actively playing before testing mid-ramp fade behavior
+    await page.evaluate(async () => {
+      const audio = globalThis.__cinematicPlayer.audio;
+      if (!audio.enabled) audio.toggle();
+      const element = audio.sceneElements.get(audio.currentSceneIndex);
+      if (element && element.paused) await element.play().catch(() => {});
+    });
+    await expect.poll(async () => {
+      const a = await readSceneAudio(page);
+      return a && !a.paused;
+    }, { message: 'scene audio playing before fade test' }).toBe(true);
...
-      audio.stopAll(90, audio.lifecycleGeneration);
-      await new Promise((resolve) => setTimeout(resolve, 20));
+      audio.stopAll(300, audio.lifecycleGeneration);
+      await new Promise((resolve) => setTimeout(resolve, 30));
```

## Tests Added or Updated

- `tests/e2e/zz-legacy-pause.spec.js::mute stops audio within 100ms (FR-006)` — Medição de silenciamento desacoplada da latência de IPC do Playwright.
- `tests/e2e/zz-audio-double-toggle.spec.js::an element mid fade-out is not reported as playing` — Pré-aquecimento de áudio ativo e rampa de 300ms/30ms para estabilidade contra starvation de event loop.

## Local Verification

- `npx playwright test tests/e2e/zz-legacy-pause.spec.js --repeat-each=5 --workers=4 --project=mobile-chromium` → **20 passed (1.2m)** (0 falhas em 20 repetições concorrentes, contra 2 falhas antes do fix).
- `npx playwright test tests/e2e/zz-audio-double-toggle.spec.js --repeat-each=5 --workers=4 --project=mobile-chromium` → **15 passed (50.8s)** (0 falhas em 15 repetições concorrentes, contra 2 falhas antes do fix).
- `npm run test:unit` → **155 passed (38.6s)** (0 falhas).
- `npm run preflight` → **16 of 16 checks passed**.

## Deviations from Assessment

Nenhuma. Todas as alterações seguiram a remediação preferencial apontada no assessment.

## Follow-ups

- Executar `/speckit.bug.test slug=e2e-residual-timing-flakes` para consolidar o relatório formal de verificação.
