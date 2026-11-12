# Bug Test: webkit-layout-gate end-overlay layout issues (run 41387605113)

- **Slug**: webkit-layout-gate-end-overlay-run-41387605113
- **Tested**: 2026-11-12 (local Chromium/Firefox + CI PR #182 — ver abaixo)
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: pending (merge autorizado de #182 + run verde em `dev` pendentes; CI #43134037388 (`ubuntu-24.04`) teve `webkit-layout-gate` **success** e E2E **1349/1350** (única falha: SC-005 phantom rAF, corrigida em `2fd0be6`); #43140031261 com `webkit-layout-gate` **success** e `macos-webkit-compositor` **success**, `gate` E2E pendente de notificação)

## Summary

Correção/hardening local em `src/scripts/player.js` e `src/styles/player.css` para conter a banda do end-overlay acima da barra de controles e manter ações (incl. replay) alcançáveis no scrollport em viewports estreitas (FR-033). Baseline CI `dev` run `42825569449` (2026-11-10) falha em `zz-end-state-coverage.spec.js` @320x568 em `[mobile-webkit]` e `[desktop-webkit]` por interceptação dos controles. Verificação WebKit/CI desta revisão permanece pendente.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Evidência CI baseline | `gh run view 42825569449` (`dev`) | fail | 2 falhas WebKit em `zz-end-state-coverage.spec.js` @320x568, 30 passed no job. |
| Sintaxe | `node --check src/scripts/player.js` | pass | — |
| Manifestos/catalog | `npm run -s validate` | pass | Válidos. |
| Compat/budgets | `npm run report` | pass | COMPATIBLE, 0 findings. |
| Unitários | `npm run -s test:unit` | pass | 234/234. |
| Build | `npm run build` | pass | Comprimidos dentro do esperado. |
| Regressão/layout/a11y (Chromium+Firefox) | `zz-end-state-coverage`, `reflow`, `zz-css-reflow`, `theme-a11y` em `mobile-chromium`, `desktop-chromium`, `desktop-firefox` | pass | 48/48. |
| Diagnóstico 320x568 (Chromium, ad-hoc) | Playwright (ended state) | pass | Replay clicável/dentro da banda; sem cobertura de controles. |
| Preflight | `npm run preflight` | partial | Falha apenas no launch WebKit (ambiente). |
| WebKit alvo / webkit-layout-gate / `npm run ci` | CI/runner compatível | pending | Evidência definitiva requerida. |

## Output Excerpts

```
Baseline CI (42825569449): mobile-webkit/desktop-webkit zz-end-state-coverage @320x568 intercepta home, previous-scene, previous-frame, play-toggle, next-frame, next-scene, end.
Local (2026-11-11): validate/report pass; test:unit 234/234; build pass; targeted E2E 48/48 (Chromium+Firefox projetos suportados).
```

## Residual Risks

- Diferenças de layout/hit-testing/timing em WebKit podem reexpor interceptação ou alcançabilidade fora da banda.
- Falta de execução WebKit local impede confirmação direta.

## Recommendation

Revalidar em `webkit-layout-gate` e `npm run ci`. Manter `pending` até evidência verde; então atualizar para `verified` com run/link e fechar T047.
