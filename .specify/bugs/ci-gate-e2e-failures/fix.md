# Bug Fix: ci gate e2e failures (CI run 40983459997)

- **Slug**: ci-gate-e2e-failures
- **Fixed**: 2026-10-29
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

A falha de `sync.spec.js` (todos os 5 projetos) foi uma **regressão direta** da flag `__HWC_DISABLE_PROGRESS_CHANNEL__` introduzida no hardening anterior, que desabilitava o canal de progresso em todos os testes, incluindo o que testa sync via BroadcastChannel quando localStorage está indisponível. A reversão (storage.js `createChannel` + helpers.js flag) foi aplicada e pushada. As falhas de `accessibility.spec.js` (Axe-Core) e os 2 flaky (`zz-audio-double-toggle`, `zz-timing-dwell`) são pre-existentes e não foram resolvidos nesta rodada.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/scripts/storage.js` | reverted | Removido o check `__HWC_DISABLE_PROGRESS_CHANNEL__` em `createChannel()` (restaurado ao original). |
| `tests/e2e/helpers.js` | reverted | Removida a flag do init script em `openPlayer` (restaurado ao original broad `localStorage.clear()`). |

## Tests Added or Updated

- Nenhum teste novo. O guard efetivo é `sync.spec.js` (BroadcastChannel sync com localStorage indisponível).

## Local Verification

- `src/scripts/storage.js` e `tests/e2e/helpers.js` restaurados ao original (git checkout origin/dev).
- `node --check src/scripts/storage.js` → OK.
- Verificação completa em CI pendente (sync.spec.js deve voltar a passar em todos os 5 projetos).

## Deviations from Assessment

- A remediação preferida (reverter a flag) foi aplicada integralmente. Os itens `[NEEDS CLARIFICATION]` (causa das falhas de accessibility e dos flaky) permanecem abertos e requerem investigação separada.

## Follow-ups

- Re-rodar CI gate para confirmar sync.spec.js verde em todos os 5 projetos.
- Investigar `accessibility.spec.js` failures (Axe-Core color-contrast/timeouts) — possível pre-existing ou regressão de carga.
- Investigar os 2 flaky (`zz-audio-double-toggle`, `zz-timing-dwell`) — timing, pre-existentes.
- Considerar abrir bugs separados para accessibility e flaky tests.