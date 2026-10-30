# Bug Verification: playback frame-04 root cause (auto-advance timing during boot)

- **Slug**: playback-frame04-root-cause
- **Tested**: 2026-10-29
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

A causa raiz (timing de auto-advance durante o boot) foi confirmada por evidência (`__initialPlayerIndex` capturado no construtor é 0; `__cinematicPlayer.index` na primeira disponibilidade é 1 sob carga). A correção (captura determinística do índice inicial + asserção no teste) eliminou a flakiness: `playback.spec.js` passou 4/4 nesta verificação (e em 3 execuções anteriores consecutivas). A hipótese anterior (BroadcastChannel) foi descartada.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium` | pass | 4/4 (21.9s) |
| New / updated tests | `playback.spec.js` test 1 (asserção via `__initialPlayerIndex`) | pass | determinístico, sem dependência de timing |
| Regression suite (storage) | `npx node --test tests/unit/storage.test.js` | pass | 21/21 |
| Lint / type-check | `node --check` em `player.js`, `main.js`, `storage.js`, `helpers.js`, config | pass | sem erros |

## Output Excerpts

```
····  4 passed (21.9s)
ℹ pass 21  ℹ fail 0
LINT_OK
```

## Residual Risks

- `workers: 1` aumenta o tempo de CI (trade-off aceito).
- O padrão de captura de índice inicial (`__initialPlayerIndex`) é test-only (gated por `__CINEMATIC_PRODUCTION__`); não afeta o bundle de produção.
- A flag `__HWC_DISABLE_PROGRESS_CHANNEL__` permanece como hardening (sem impacto no produto).

## Recommendation

Close the bug — verified end-to-end. O sintoma original não reproduz mais; a causa raiz foi identificada como timing de auto-advance durante o boot (não bug de produto) e corrigida de forma determinística no teste.
i: Writing test.md verification report with verified result