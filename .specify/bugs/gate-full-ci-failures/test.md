# Bug Verification: gate full CI failures

- **Slug**: gate-full-ci-failures
- **Tested**: 2026-10-29
- **Assessment**: ./assessment.md
- **Result**: verified

## Summary

O fix (limpeza de `localStorage` no `openPlayer`, uma vez por contexto) eliminou o vazamento de progresso que fazia `playback.spec.js` e `playback-matrix.spec.js` falharem em mobile-chromium. Os testes afetados passam localmente. A reprodução original (55 falhas no gate CI Ubuntu) foi exercida em CI Ubuntu via run 40932788962 — conclusão `success` (todos os 3 jobs: gate, webkit-layout-gate, macos-webkit-compositor). Resultado `verified`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) — playback | `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium` | pass | 4/4 (9.3s) |
| Reproduction (post-fix) — playback-matrix | `npx playwright test tests/e2e/playback-matrix.spec.js --project=mobile-chromium` | pass | 6/6 (15.2s) |
| New/updated tests — persistence-flow | `npx playwright test tests/e2e/persistence-flow.spec.js --project=mobile-chromium --project=desktop-chromium` | pass | 6/6 (17.6s) — cross-page persistence preservada |
| Regression — sync + focus-loss | `npx playwright test tests/e2e/sync.spec.js tests/e2e/focus-loss.spec.js --project=mobile-chromium --project=desktop-chromium` | pass | 20/20 (52.2s) |
| Regression — unit | `npm run test:unit` | pass | 227/227 |
| Reproduction original (55 falhas CI) | `npm run ci` (GitHub Actions run 40932788962, ubuntu-latest) | pass | conclusion: success; 3 jobs (gate, webkit-layout-gate, macos-webkit-compositor) |

## Output Excerpts

```
playback.spec.js: 4 passed (9.3s)
playback-matrix.spec.js: 6 passed (15.2s)
persistence-flow.spec.js: 6 passed (17.6s)
sync + focus-loss: 20 passed (52.2s)
unit: pass 227, fail 0
CI run 40932788962: conclusion success (gate + webkit-layout-gate + macos-webkit-compositor)
```

## Residual Risks

- Falhas flaky observadas no log (audio-timing, audio-lifecycle, zz-css-reduced-motion) passaram em retry (CI retries: 2). Monitorar recorrência.
- O fix toca apenas o `openPlayer` (helper de teste), não código de produção — não endereça possíveis falhas de produção subjacentes (hipótese CSS/layout do assessment não verificada, mas não reproduziu).
- `addInitScript` acumula scripts por contexto, mas `localStorage.clear()` é idempotente e guardado por `sessionStorage`.

## Recommendation

Fechar o bug — verificado end-to-end em CI Ubuntu (run 40932788962, conclusion success). Monitorar flakiness nas specs de áudio/CSS em runs futuros.