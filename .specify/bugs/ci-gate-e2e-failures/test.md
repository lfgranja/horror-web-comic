# Bug Verification: ci gate e2e failures (CI run 40983459997)

- **Slug**: ci-gate-e2e-failures
- **Tested**: 2026-10-29
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

A regressão de `sync.spec.js` (BroadcastChannel sync com localStorage indisponível) foi corrigida: 7/7 passam em mobile-chromium. As falhas de `accessibility.spec.js` (Axe-Core) e os 2 flaky (`zz-audio-double-toggle`, `zz-timing-dwell`) são pre-existentes e não foram verificados/fixados nesta rodada.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx playwright test tests/e2e/sync.spec.js --project=mobile-chromium` | pass | 7/7 passed (39.6s) |
| New / updated tests | (nenhum) | n/a | Guard efetivo é sync.spec.js |
| Regression suite (storage) | `npx node --test tests/unit/storage.test.js` | pass | 21/21 |
| Lint / type-check | `node --check src/scripts/storage.js`, `helpers.js` | pass | sem erros |

## Output Excerpts

```
·······  7 passed (39.6s)
ℹ pass 21  ℹ fail 0
LINT_OK
```

## Residual Risks

- `accessibility.spec.js` failures (Axe-Core color-contrast/timeouts) em mobile-chromium e desktop-chromium não foram verificados localmente nesta rodada — podem ser pre-existentes ou regressão de carga.
- `zz-audio-double-toggle` (mobile-webkit) e `zz-timing-dwell` (desktop-firefox) são flaky pre-existentes; não foram exercitados.
- Verificação completa (5 projetos, CI ubuntu-latest) pendente.

## Recommendation

Hold — a regressão de sync foi corrigida e verificada localmente (7/7). As falhas de accessibility e os flaky permanecem pre-existentes e requerem investigação separada (sugerir abrir bugs dedicados). Recomenda-se re-rodar o CI gate completo para confirmar.