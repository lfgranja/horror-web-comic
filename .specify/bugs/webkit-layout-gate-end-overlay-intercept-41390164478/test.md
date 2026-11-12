# Bug Test: webkit-layout-gate end-overlay intercepts navigation controls (run 41390164478)

- **Slug**: webkit-layout-gate-end-overlay-intercept-41390164478
- **Tested**: 2026-11-12 (local Chromium/Firefox + CI PR #182 — ver abaixo)
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: pending (merge autorizado de #182 + run verde em `dev` pendentes; CI #43134037388 (`ubuntu-24.04`) teve `webkit-layout-gate` **success** e E2E **1349/1350** (única falha: SC-005 phantom rAF, corrigida em `2fd0be6`); #43140031261 com `webkit-layout-gate` **success** e `macos-webkit-compositor` **success**, `gate` E2E pendente de notificação)

## Summary

Correção/hardening local aplicada em `src/scripts/player.js` e `src/styles/player.css`: publicação eager de `--control-bar-top` (>=0) e `--control-bar-height` no escopo compartilhado (`.app-shell`), refresh por resize/orientation/scroll e `ResizeObserver` (description + control bar), settle em duplo rAF no primeiro show, banda do overlay ancorada acima da barra e contenção do grupo de ações (`.end-actions` sticky único) para manter replay alcançável dentro da banda sem interceptar controles (FR-033). Baseline CI `dev` run `42825569449` (2026-11-10, merge #180) falha: `zz-end-state-coverage.spec.js:16` em `[mobile-webkit]` e `[desktop-webkit]` @320x568 intercepta controles (2 failed, 30 passed no job). **Sem evidência WebKit/CI verde desta revisão.**

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Evidência CI baseline | `gh run view 42825569449` (`dev`) | fail | `webkit-layout-gate` failure, `gate` failure, `macos-webkit-compositor` success; 2 falhas WebKit em `zz-end-state-coverage.spec.js` @320x568. |
| Sintaxe | `node --check src/scripts/player.js` | pass | — |
| Manifestos/catalog | `npm run -s validate` | pass | `story.json`, `stories/o-alojamento.json`, catálogo válidos. |
| Compat/budgets | `npm run report` | pass | COMPATIBLE, 0 findings. |
| Unitários | `npm run -s test:unit` | pass | 234/234. |
| Build | `npm run build` | pass | 17236 B script / 4271 B style comprimidos; assets/budgets ok. |
| Regressão/layout/a11y (Chromium+Firefox) | `npx playwright test tests/e2e/zz-end-state-coverage.spec.js tests/e2e/reflow.spec.js tests/e2e/zz-css-reflow.spec.js tests/e2e/theme-a11y.spec.js --project=mobile-chromium --project=desktop-chromium --project=desktop-firefox --reporter=line` | pass | 48/48. |
| Diagnóstico 320x568 (Chromium, ad-hoc) | Playwright (ended state, fixture) | pass | Replay clicável e dentro da banda; controles não cobertos; vars publicadas no escopo. |
| Preflight | `npm run preflight` | partial | FAIL apenas `browser-launch` (WebKit WPE indisponível por ABI libjpeg no host); demais checks pass. |
| WebKit alvo/layout-gate equivalente | `--project=mobile-webkit --project=desktop-webkit` / CI job | pending | Não executável localmente. |
| Regressão ampla | `npm run ci` | pending | Requer runner/CI compatível com WebKit. |

## Output Excerpts

```
Baseline CI (42825569449, webkit-layout-gate):
  2 failed: [mobile-webkit]/[desktop-webkit] › tests/e2e/zz-end-state-coverage.spec.js:16:3 @320x568
  Error: end overlay intercepts: home, previous-scene, previous-frame, play-toggle, next-frame, next-scene, end
  30 passed

Local (2026-11-11):
  validate: pass
  report: COMPATIBLE (0 findings)
  test:unit: 234/234 pass
  build: pass (17236 script / 4271 style compressed)
  targeted E2E (mobile/desktop-chromium, desktop-firefox; zz-end-state-coverage/reflow/zz-css-reflow/theme-a11y): 48/48 pass
  preflight: 1/16 fail (webkit browser-launch env only)
```

## Residual Risks

- Hit-testing/layout/timing do overlay fixo em WebKit 320x568 pode diferir de Chromium/Firefox; confirmação depende de `webkit-layout-gate` e matriz E2E completa em CI.
- Sem execução WebKit local; nenhuma evidência direta de correção em mobile/desktop-webkit.

## Recommendation

Executar webkit-layout-gate equivalente e `npm run ci` em runner compatível. Manter `Result: pending` até evidência verde; então atualizar para `verified` com run/link, jobs e contagens e fechar T047.
