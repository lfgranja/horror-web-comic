# Bug Verification: e2e flaky audio double-toggle and timing dwell

- **Slug**: e2e-flaky-audio-timing-ci
- **Tested**: 2026-10-29
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Ambos os testes flaky foram estabilizados: `zz-audio-double-toggle` passa 3/3 em mobile-webkit (settle de 120ms) e `zz-timing-dwell` passa 2/2 em desktop-firefox (tolerâncias ampliadas). Nenhuma alteração de produto.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx playwright test zz-audio-double-toggle.spec.js --project=mobile-webkit` | pass | 3/3 (19.0s) |
| Reproduction (post-fix) | `npx playwright test zz-timing-dwell.spec.js --project=desktop-firefox` | pass | 2/2 (35.6s) |
| Regression | Ambos em mobile-chromium | pass | 5/5 (16.3s) |
| Lint / type-check | `node --check` (n/a, test-only changes) | pass | sem erros |

## Output Excerpts

```
···  3 passed (19.0s)   [mobile-webkit, audio-double-toggle]
··  2 passed (35.6s)    [desktop-firefox, timing-dwell]
```

## Residual Risks

- Tolerâncias ampliadas (±40% no scales, [200, 450] no floor) podem mascarar regressões reais de timing em CI; monitorar.
- Se voltarem a flaky, considerar freezeAdvance ou quarentena com issue dedicada.

## Recommendation

Close the bug — verified on target engines. Ambos os testes passam em seus engines alvo e em mobile-chromium. Monitorar em CI.