# Bug Fix: gate full CI failures

- **Slug**: gate-full-ci-failures
- **Fixed**: 2026-10-29
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

O assessment original (`likely valid, needs reproduction`) descrevia 55 falhas no gate CI sem remediation concreta (2 `[NEEDS CLARIFICATION]` abertos) e hipótese de CSS/layout. Reproduzir as 55 falhas localmente é inviável: WebKit não roda no Fedora e o E2E não concluía por timeout. O fix acionável de baixo esforço aplicado foi no `openPlayer` (`tests/e2e/helpers.js`): limpar `localStorage` antes de cada carga via `page.addInitScript`, eliminando o vazamento de progresso (story-scoped keys incluídas) entre runs. Isso destravou `playback.spec.js` e `playback-matrix.spec.js` (frame-04 em vez de frame-01) em mobile-chromium.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/e2e/helpers.js` | modified | `openPlayer` agora chama `page.addInitScript(() => { try { localStorage.clear(); } catch {} })` antes do `page.goto`, garantindo estado inicial limpo por run. |

## Tests Added or Updated

- Nenhum teste novo; o fix torna os existentes determinísticos (`playback.spec.js` 4/4 pass, `playback-matrix.spec.js` 6/6 pass em mobile-chromium após o fix).

## Local Verification

- `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium` → 4 passed (7.9s).
- `npx playwright test tests/e2e/playback-matrix.spec.js --project=mobile-chromium` → 6 passed (15.2s).
- `npm run test:unit` → 227/227 pass (não afetado).

## Deviations from Assessment

- O assessment propunha "investigar sistematicamente" as 55 falhas com hipótese de CSS/layout. O escopo executado (escolha do usuário) foi o fix concreto de storage no `openPlayer`, que é a causa raiz observada localmente para o E2E não concluir. O bug original `gate-full-ci-failures` (55 falhas em CI Ubuntu) permanece `likely valid, needs reproduction` e requer validação no CI Ubuntu (WebKit + matriz completa) — não reproduzível no host Fedora.

## Follow-ups

- Disparar `npm run ci` completo no CI Ubuntu para reproduzir/validar as 55 falhas originais e fechar o bug.
- Rodar `/speckit.bug.test slug=gate-full-ci-failures` após a validação em CI.
- Considerar tornar o `openPlayer` idempotente quanto a `addInitScript` (hoje acumula scripts, mas `clear()` é idempotente).