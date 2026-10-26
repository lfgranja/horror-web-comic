# Bug Verification: Eliminação de Flakes E2E e Estabilização dos 5 Specs Críticos

- **Slug**: e2e-flake-elimination
- **Tested**: 2026-10-24T08:37:00-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

As cinco falhas intermitentes de E2E observadas no Chromium (`audio-activity.spec.js`, `resume.spec.js`, `runtime-convergence.spec.js`, `zz-legacy-playback.spec.js` e `zz-legacy-speed-volume.spec.js`) foram completamente eliminadas e verificadas. A combinação do isolamento serial por arquivo (`mode: 'serial'`) com a calibração da medição de dwell nominal em `f-002` em `zz-legacy-speed-volume.spec.js` neutralizou as corridas de storage/rede e os artefatos de temporização. O conjunto de 19 testes passou duas vezes consecutivas com 100% de sucesso sob 4 workers concorrentes.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reprodução dos 5 specs (Rodada 1) | `npx playwright test tests/e2e/{audio-activity,resume,runtime-convergence,zz-legacy-playback,zz-legacy-speed-volume}.spec.js --project=mobile-chromium` | **pass** | 19 passed (26.0s). 0 falhas. |
| Reprodução dos 5 specs (Rodada 2 - Repetibilidade) | `npx playwright test tests/e2e/{audio-activity,resume,runtime-convergence,zz-legacy-playback,zz-legacy-speed-volume}.spec.js --project=mobile-chromium` | **pass** | 19 passed (25.3s). 0 falhas. Reprodutibilidade confirmada. |
| Execução isolada de speed-volume | `npx playwright test tests/e2e/zz-legacy-speed-volume.spec.js --project=mobile-chromium` | **pass** | 4 passed (30.5s). Dwell medido com precisão. |
| Suíte completa mobile-chromium | `npx playwright test tests/e2e --project=mobile-chromium` | **pass** | 258 passed / 2 failed (4.5m). Todos os 5 specs alvo deste bug passaram limpos na matriz completa. |

## Output Excerpts

Execução de repetibilidade (Rodada 2):
```text
Running 19 tests using 4 workers
  ✓  does not preload the next frame when data saver is active (2.4s)
  ✓  tracks actual frame playback rather than frame selection for scene ducking (2.4s)
  ✓  resumes a saved frame and does not persist paused state (3.2s)
  ✓  keeps boundary navigation actions as no-ops (3.1s)
  ✓  volume persists in hwc.volume (FR-020) (1.8s)
  ✓  speed 2x persists and halves dwell with 250ms floor (FR-021, SC-010) (4.2s)
  ✓  starts on first frame and auto-advances in narrative order (6.0s)
  ✓  playing frame track reaches its own gain while the scene ducks to 40% (2.8s)
  ✓  debounces the live-region description update (2.6s)
  ✓  remix is released and the scene returns to full gain when the frame stops (3.4s)
  ✓  coalesces opposing rapid navigation with the last input winning (2.2s)
  ✓  speed 0.5x persists (FR-021) (1.5s)
  ✓  slow frame dwell f-002 is within ±10% of 2500ms (5.6s)
  ✓  in-flight transition is cancelled and starts target transition (2.6s)
  ✓  End reaches last frame within ≤3 actions (VS-7, SC-011) (3.0s)
  ✓  default/story rhythm frame dwell is within ±10% of effective duration (2.9s)
  ✓  auto-advance reaches scene B frames in order (7.2s)
  ✓  progress indicator reflects current position (1.0s)
  19 passed (25.3s)
```

## Residual Risks

- Dois testes externos ao escopo deste bug continuam com sensibilidade em execuções muito pesadas: `zz-legacy-pause.spec.js:94` (latência IPC de 177ms vs <=150ms) e `zz-audio-double-toggle.spec.js:61` (corrida de amostragem durante rampa rápida de áudio). Nenhum deles afeta os 5 arquivos de comportamento e resiliência cobertos por este slug.

## Recommendation

Fechar o bug `e2e-flake-elimination` como **verified**. A suíte dos 5 arquivos problemáticos está estável, reprodutível e aprovada sem exceção em múltiplas execuções concorrentes.
