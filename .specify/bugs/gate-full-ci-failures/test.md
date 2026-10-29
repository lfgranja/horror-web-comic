# Bug Verification: gate full CI failures

- **Slug**: gate-full-ci-failures
- **Tested**: 2026-10-29
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

O fix (limpeza de `localStorage` no `openPlayer`, uma vez por contexto) eliminou o vazamento de progresso que fazia `playback.spec.js` e `playback-matrix.spec.js` falharem em mobile-chromium. Os testes afetados passam agora. A reprodução original (55 falhas no gate CI Ubuntu) não foi exercida — WebKit não roda no Fedora e a matriz completa requer CI Ubuntu. Resultado portanto `partial`, não `verified`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) — playback | `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium` | pass | 4/4 (9.3s) |
| Reproduction (post-fix) — playback-matrix | `npx playwright test tests/e2e/playback-matrix.spec.js --project=mobile-chromium` | pass | 6/6 (15.2s) |
| New/updated tests — persistence-flow | `npx playwright test tests/e2e/persistence-flow.spec.js --project=mobile-chromium --project=desktop-chromium` | pass | 6/6 (17.6s) — cross-page persistence preservada |
| Regression — sync + focus-loss | `npx playwright test tests/e2e/sync.spec.js tests/e2e/focus-loss.spec.js --project=mobile-chromium --project=desktop-chromium` | pass | 20/20 (52.2s) |
| Regression — unit | `npm run test:unit` | pass | 227/227 |
| Reproduction original (55 falhas CI) | not-run | skipped | Requer CI Ubuntu (WebKit + matriz 5 projetos); não disponível no host Fedora |

## Output Excerpts

```
playback.spec.js: 4 passed (9.3s)
playback-matrix.spec.js: 6 passed (15.2s)
persistence-flow.spec.js: 6 passed (17.6s)
sync + focus-loss: 20 passed (52.2s)
unit: pass 227, fail 0
```

## Residual Risks

- As 55 falhas originais do gate CI (focus-loss, persistence, sync, zz-legacy-*, audio-*) não foram reproduzidas nem validadas localmente. A hipótese de CSS/layout do assessment permanece não verificada.
- O fix toca apenas o `openPlayer` (helper de teste), não código de produção — não endereça possíveis falhas de produção subjacentes.
- `addInitScript` acumula scripts por contexto, mas `localStorage.clear()` é idempotente e guardado por `sessionStorage`.

## Recommendation

Manter o bug como `partial`. Fechar definitivamente apenas após rodar `npm run ci` completo no CI Ubuntu (matriz 5 projetos) e confirmar que as 55 falhas originais não reproduzem. Se reproduzirem, reexecutar `/speckit.bug.assess slug=gate-full-ci-failures` com a nova evidência capturada em CI.