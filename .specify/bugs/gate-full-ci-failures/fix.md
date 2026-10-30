# Bug Fix: gate full CI failures

- **Slug**: gate-full-ci-failures
- **Fixed**: 2026-10-29
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

O assessment original descrevia 55 falhas no gate CI sem remediação concreta. A remediação acionável aplicada originalmente foi no `openPlayer` (`tests/e2e/helpers.js`): limpar `localStorage` antes de cada carga, eliminando vazamento de progresso entre runs. Nesta rodada tentou-se refinar para limpeza **escopada por story** (`hwc.progress:*` e, em seguida, todos os `hwc.*`), com guard de regressão. A limpeza escopada não se mostrou confiável neste host (playback.spec.js continuou falhando com `frame-04` em vez de `frame-01`), e a causa raiz local foi investigada como não sendo apenas storage: o progresso pode chegar via `BroadcastChannel`/contexto reutilizado, ou o `auto-advance` já ultrapassa `frame-01` antes da asserção. `helpers.js` foi **restaurado ao estado original** (broad `localStorage.clear()` com guard `sessionStorage`) para não introduzir regressão. O bug original (55 falhas em CI Ubuntu) permanece `likely valid, needs reproduction` e requer validação no CI Ubuntu.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/e2e/helpers.js` | (tentativa revertida) | Refinamento escopado não verificado; arquivo restaurado ao original (broad clear). |
| `.specify/bugs/gate-full-ci-failures/assessment.md` | atualizado (append) | Triagem fresca com evidências CI run 40932788962 e run local 2026-10-29. |

## Tests Added or Updated

- Nenhum teste novo persistido (guard experimental removido). O guard de regressão efetivo permanece `playback.spec.js` ("starts on the first frame...").

## Local Verification

- `npm run preflight`: 16/16 pass.
- `npm run validate`: pass.
- `npm run test:unit`: 227/227 pass.
- `npm run build:images` + `npm run build`: pass.
- `npm run lhci`: pass.
- `npm run test:perf`: 42 pass, 15 skipped, 1 fail (SC-019), 2 flaky.
- `npm run test:e2e` (playback.spec.js, mobile-chromium): continua falhando (3/4) — causa não isolada (timing/storage/BroadcastChannel). Requer CI Ubuntu.

## Deviations from Assessment

- O assessment refinado propunha limpeza escopada por story em `openPlayer`. A implementação escopada não foi verificada como suficiente neste host; hipótese de que a restauração de progresso não ocorre apenas via `localStorage` (possível `BroadcastChannel`/contexto reutilizado) ou que o `auto-advance` ultrapassa `frame-01` antes da asserção. `helpers.js` restaurado ao original para evitar regressão.

## Follow-ups

- Disparar `npm run ci` completo no CI Ubuntu para reproduzir/validar as 55 falhas originais e fechar o bug.
- Investigar causa real do `frame-04` em `playback.spec.js` test 1 (isolamento de contexto, BroadcastChannel, auto-advance timing) antes de tentar novo refinamento.
- Rodar `/speckit.bug.test slug=gate-full-ci-failures` após validação em CI.
i: Writing updated fix.md reflecting partial status and reverted refinement