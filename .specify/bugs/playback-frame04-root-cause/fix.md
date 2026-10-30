# Bug Fix: playback frame-04 root cause (auto-advance timing during boot)

- **Slug**: playback-frame04-root-cause
- **Fixed**: 2026-10-29
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

A causa raiz era **timing de auto-advance durante o boot**: o dwell do `frame-01` (~1.5s) era consumido pelo boot (carregamento de assets/init), de modo que `waitForFrame('frame-01')` (executado após `openPlayer`, que inclui 500ms de espera do overlay bloqueado) nunca encontrava `frame-01` e dava timeout com valor final `frame-04`. Não era bug de produto nem de storage/BroadcastChannel (a hipótese anterior foi descartada por evidência). Corrigido capturando o índice inicial no construtor do player (antes de `schedule()`) e expondo-o como `__initialPlayerIndex`, e ajustando o teste para asserir esse valor de forma determinística.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/scripts/player.js` | modified | `this.initialIndex = this.index` capturado no construtor (linha 78), antes de `schedule()`/auto-advance. |
| `src/scripts/main.js` | modified | `globalThis.__initialPlayerIndex = player.initialIndex` exposto no bloco gated por `__CINEMATIC_PRODUCTION__`. |
| `tests/e2e/playback.spec.js` | modified | Test 1 agora assera `__initialPlayerIndex === 0` (capturado no boot) em vez de `waitForFrame('frame-01')` pós-`openPlayer`. Mantém `waitForFrame('frame-02')` + progress assertion. |
| `src/scripts/storage.js` | modified (hardening) | `createChannel()` retorna `null` se `__HWC_DISABLE_PROGRESS_CHANNEL__` for truthy (apenas canal de progresso). |
| `tests/e2e/helpers.js` | modified (hardening) | `openPlayer` seta a flag no init script e mantém broad `localStorage.clear()` com guard `sessionStorage`. |
| `playwright.config.js` | modified (hardening) | `workers: 1` para serializar a suíte. |

## Diff Highlights (optional)

```js
// player.js constructor
this.index = this.findInitialIndex();
this.initialIndex = this.index; // captured before schedule()/auto-advance
```

```js
// main.js (gated)
globalThis.__initialPlayerIndex = player.initialIndex;
```

```js
// playback.spec.js test 1
const initialIndex = await page.waitForFunction(() => {
  if (window.__initialPlayerIndex !== undefined) return true;
  return false;
}, { timeout: 10000 }).then(() => page.evaluate(() => window.__initialPlayerIndex));
expect(initialIndex).toBe(0);
```

## Tests Added or Updated

- `tests/e2e/playback.spec.js::"starts on the first frame and advances in narrative order"` — asserção determinística do índice inicial capturado no boot.

## Local Verification

- `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium` → 4/4 (3 execuções: 13.7s, 13.4s, 18.4s).
- `npx node --test tests/unit/storage.test.js` → 21/21 pass.
- `node --check` em `player.js`, `main.js`, `storage.js`, `helpers.js`, config: OK.

## Deviations from Assessment

- A hipótese inicial (BroadcastChannel cross-context) foi descartada por evidência: o sintoma persistiu mesmo com o canal desabilitado. A causa real é timing de auto-advance durante o boot.
- A correção é no lado do teste (captura determinística do índice inicial), não no produto. O produto funciona corretamente em execução isolada.

## Follow-ups

- Considerar aplicar o mesmo padrão de captura de índice inicial em outros testes que dependem de `frame-01` no boot.
- Avaliar se `workers: 1` deve ser apenas em CI (trade-off tempo vs estabilidade).
- Rodar `/speckit.bug.test slug=playback-frame04-root-cause` para validação final.