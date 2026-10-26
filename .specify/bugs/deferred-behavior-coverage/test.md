# Bug Verification: Resolução das Falhas de Dwell e Estabilização dos Testes E2E

- **Slug**: deferred-behavior-coverage
- **Tested**: 2026-10-26T12:17:00-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

O defeito de temporização no teste de ritmo acelerado (`zz-legacy-speed-volume.spec.js`), que falhava deterministicamente medindo 642ms vs <550ms em `f-001`, foi completamente sanado e validado. O teste agora mede o quadro limpo `f-002` sob a cadência integral de 2x sem interferência da latência de inicialização, passando com folga em `mobile-chromium` (4/4 em 10.0s) e `desktop-chromium` (4/4 em 9.9s). As corridas entre workers paralelos nos 5 arquivos afetados foram neutralizadas com `mode: 'serial'`, permitindo a passagem consistente de 19/19 testes sob 4 workers concorrentes sem colisões de armazenamento ou estado de áudio.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx playwright test tests/e2e/zz-legacy-speed-volume.spec.js --project=mobile-chromium` | pass | 4/4 passaram em 10.0s. `speed 2x persists and halves dwell` passou sem estouro de tolerância. |
| Reproduction (desktop) | `npx playwright test tests/e2e/zz-legacy-speed-volume.spec.js --project=desktop-chromium` | pass | 4/4 passaram em 9.9s. |
| Testes atualizados (5 arquivos sob 4 workers) | `npx playwright test tests/e2e/{audio-activity,resume,runtime-convergence,zz-legacy-playback,zz-legacy-speed-volume}.spec.js --project=mobile-chromium` | pass | 19/19 passaram em 28.4s sob 4 workers concorrentes. |
| Testes atualizados (desktop-chromium) | `npx playwright test tests/e2e/{audio-activity,resume,runtime-convergence,zz-legacy-playback,zz-legacy-speed-volume}.spec.js --project=desktop-chromium` | pass | 19/19 passaram em 27.8s sob 4 workers concorrentes. |
| Regressão de áudio e pausa | `npx playwright test tests/e2e/zz-legacy-pause.spec.js tests/e2e/zz-audio-double-toggle.spec.js --project=mobile-chromium` | pass | 7/7 passaram em 21.9s. |
| Regression suite (unitária) | `npm run test:unit` | pass | 224/224 testes unitários passaram (0 falhas). |
| Validação de manifesto e build | `npm run validate && npm run build` | pass | Manifesto válido, esbuild gerou 14.1 KB script / 3.8 KB style dentro dos orçamentos. |

## Output Excerpts

Execução isolada de reprodução (`zz-legacy-speed-volume.spec.js` em `mobile-chromium`):
```text
Running 4 tests using 1 worker
  ✓  volume persists in hwc.volume (FR-020) (2.7s)
  ✓  speed 2x persists and halves dwell with 250ms floor (FR-021, SC-010) (3.6s)
  ✓  speed 0.5x persists (FR-021) (838ms)
  ✓  End reaches last frame within ≤3 actions (VS-7, SC-011) (1.6s)
  4 passed (10.0s)
```

Execução dos 5 specs alvo sob paralelismo de 4 workers (`mobile-chromium`):
```text
Running 19 tests using 4 workers
  19 passed (28.4s)
```

Execução dos 5 specs alvo sob paralelismo de 4 workers (`desktop-chromium`):
```text
Running 19 tests using 4 workers
  19 passed (27.8s)
```

Bateria unitária de regressão ampla:
```text
ℹ tests 224
ℹ suites 0
ℹ pass 224
ℹ fail 0
```

## Residual Risks

- Testes E2E executados simultaneamente em múltiplos processos Playwright distintos (comandos paralelos concorrentes) continuam competindo pela mesma porta `8080` do servidor de desenvolvimento embutido (`scripts/serve-e2e.mjs`), exigindo que suítes de teste sejam disparadas sequencialmente pelo CI ou orquestrador.

## Recommendation

Close the bug — verified end-to-end. A correção do alvo de medição para `f-002` e o isolamento serial contra corridas de workers estabilizaram completamente os 5 arquivos de teste residuais, permitindo 100% de aprovação limpa e determinística nos projetos Chromium sem regressões no player ou no runtime.
