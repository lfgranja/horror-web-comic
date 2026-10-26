# Bug Fix: Eliminação das Falhas de Temporização e Concorrência na Suíte E2E

- **Slug**: deferred-behavior-coverage
- **Fixed**: 2026-10-24T08:27:00-04:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Corrigido o defeito de temporização no teste de ritmo acelerado (`zz-legacy-speed-volume.spec.js`), onde a velocidade era alterada dinamicamente no meio da exibição do quadro inicial `f-001` (acumulando o tempo decorrido a 1x com o novo timeout de 500ms, resultando em 642ms vs <550ms esperado). O teste agora avalia o dwell do quadro subsequente `f-002` (que executa integralmente a 2x: 2500ms / 2 = 1250ms), eliminando artefatos de medição. Adicionalmente, foi garantido o isolamento serial (`mode: 'serial'`) nos 5 arquivos suscetíveis a corridas sob workers paralelos do Playwright.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/e2e/zz-legacy-speed-volume.spec.js` | modified | Altera a medição de dwell de `f-001` para `f-002` (`1250ms ± 10%`) e ativa `mode: 'serial'`. |
| `tests/e2e/audio-activity.spec.js` | modified | Ativa `test.describe.configure({ mode: 'serial' })` para evitar corridas de ducking sob workers concorrentes. |
| `tests/e2e/resume.spec.js` | modified | Ativa `test.describe.configure({ mode: 'serial' })` para isolar hidratação de storage. |
| `tests/e2e/runtime-convergence.spec.js` | modified | Ativa `test.describe.configure({ mode: 'serial' })` para desacoplar debounce de descrição. |
| `tests/e2e/zz-legacy-playback.spec.js` | modified | Ativa `test.describe.configure({ mode: 'serial' })` para proteger medições de avanço. |

## Diff Highlights

```js
// tests/e2e/zz-legacy-speed-volume.spec.js
-    await expectFrameId(page, 'f-001');
-    const dwell = await measureDwellMs(page, 'f-001', 5000);
-    const expected = Math.max(250, EFFECTIVE_DURATION_MS['f-001'] / 2);
+    await expectFrameId(page, 'f-001');
+    const dwell = await measureDwellMs(page, 'f-002', 5000);
+    const expected = Math.max(250, EFFECTIVE_DURATION_MS['f-002'] / 2);
     expectDwellWithinTolerance(dwell, expected, 0.1);
```

## Tests Added or Updated

- `tests/e2e/zz-legacy-speed-volume.spec.js::speed 2x persists and halves dwell with 250ms floor (FR-021, SC-010)` — agora afere a redução pela metade do dwell no quadro limpo `f-002` (`1250ms ± 10%`), comprovando que a velocidade 2x persiste e governa o ritmo da narrativa sem sofrer com o atraso de inicialização do primeiro quadro.

## Local Verification

- `npx playwright test tests/e2e/audio-activity.spec.js tests/e2e/resume.spec.js tests/e2e/runtime-convergence.spec.js tests/e2e/zz-legacy-playback.spec.js tests/e2e/zz-legacy-speed-volume.spec.js --project=mobile-chromium`: **19 passed (26.0s)** (100% verde sob 4 workers concorrentes).
- `npx playwright test tests/e2e/zz-legacy-pause.spec.js --project=mobile-chromium`: **4 passed (12.4s)**.
- `npx playwright test tests/e2e/zz-legacy-speed-volume.spec.js --project=mobile-chromium`: **4 passed (7.1s)**.

## Deviations from Assessment

Nenhuma. O fix adotou a alternativa recomendada na seção *Proposed Remediation* da reavaliação do assessment: medir a cadência em `f-002` para testar o ritmo nominal a 2x sem misturar frações de tempo pré- e pós-seleção de ritmo no primeiro quadro.

## Follow-ups

- Executar `/speckit-bug-test slug=deferred-behavior-coverage` para registrar formalmente a verificação e atualizar o placar de bugs.
- Fechar ou arquivar os slugs de bugs duplicados de flakiness (`e2e-flake-elimination`, `e2e-audio-timing-flakes`, `e2e-load-races`), que foram neutralizados por esta correção.
