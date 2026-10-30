# Bug Assessment: playback frame-04 root cause (context isolation / BroadcastChannel / auto-advance timing)

- **Slug**: playback-frame04-root-cause
- **Created**: 2026-10-29
- **Source**: pasted text — "investigar a causa real do frame-04 em playback.spec.js (isolamento de contexto / BroadcastChannel / auto-advance timing)"
- **Verdict**: likely valid, needs reproduction
- **Severity**: medium

## Report (verbatim or summarized)

Investigação da causa real do `frame-04` em `playback.spec.js` ("starts on the first frame and advances in narrative order" espera `frame-01`, recebe `frame-04`). Hipóteses em aberto: isolamento de contexto, BroadcastChannel, timing de auto-advance.

## Symptom

`playback.spec.js` test 1 falha com `Received: "frame-04"` quando a suíte completa roda, mas **passa isoladamente** (`npx playwright test ... -g "starts on the first frame"` → 1 passed, 8.0s). Ou seja, é um problema de **isolamento entre testes no mesmo worker**, não um bug determinístico de produto.

## Reproduction

1. `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium` → test 1 falha (`frame-04`).
2. `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium -g "starts on the first frame"` → 1 passed.
3. Evidência coletada nesta investigação:
   - `OPENPLAYER_CTX false` em todas as execuções (contexto fresco; `cleanedContexts` não reutiliza).
   - `CLEARING` nunca apareceu (localStorage vazio no momento do init script — nada a remover).
   - Tentativa de limpeza escopada (`hwc.progress:*` e depois todos `hwc.*`) **não** resolveu: frame-04 persistiu.
   - Isso indica que o progresso não chega apenas via `localStorage`; provável via `BroadcastChannel('progress')` entre contextos do mesmo browser, ou estado in-memory compartilhado.

## Suspected Code Paths

- `tests/e2e/helpers.js:5-14` (`openPlayer`) — guard `cleanedContexts` + `sessionStorage` + init script de limpeza.
- `src/scripts/storage.js:94-146` (constructor) — `progress = parseProgress(this.get(progressKey()))` + `createChannel()`/`createThemeChannel()` (BroadcastChannel por origem).
- `src/scripts/storage.js:154-158` — handler do BroadcastChannel que chama `receiveProgress`.
- `src/scripts/storage.js:480-491` — `receiveProgress` (atualiza `this.progress` a partir de mensagens de outros tabs/contextos).
- `src/scripts/player.js:203-207` — `createStartIndex()` lê `storage.load().lastFrameId` (restaura frame a partir do progresso).
- `playwright.config.js:8` — `fullyParallel: true` (testes do mesmo arquivo rodam em paralelo em workers distintos).

## Root Cause Hypothesis

**Confidence: medium.** O `frame-04` em test 1 não é causado por `localStorage` residual (limpeza broad/escopada não resolve, e o init script encontra storage vazio). A hipótese mais provável é **vazamento de progresso via `BroadcastChannel('progress')`**: contextos distintos do mesmo browser compartilham o canal por origem, e um teste posterior (ex.: test 4, que avança até `frame-04` e salva progresso) pode broadcastar uma mensagem recebida pelo storage manager de um contexto que ainda está inicializando, populando `this.progress` antes de `setStoryId`/`createStartIndex`. Alternativa: `auto-advance` ultrapassa `frame-01` antes da asserção em máquinas lentas (menos provável, pois o teste isolado passa). O guard `sessionStorage` não protege contra BroadcastChannel.

## Proposed Remediation

**Preferred**: Garantir isolamento real entre testes:
- Opção A: em `openPlayer`, fechar/desabilitar o BroadcastChannel de progresso durante o boot de teste (ex.: bloquear criação do canal em modo teste), ou usar um `tabId`/canal único por contexto.
- Opção B: rodar a suíte com `--workers=1` (serial) para eliminar corrida cross-context, aceitando maior tempo.
- Opção C: em cada teste, aguardar `frame-01` com timeout curto e, se já passou, considerar o teste inválido (não recomendado — mascara).

**Alternatives**:
- Tornar `receiveProgress` ignorar mensagens cujo `tabId` não corresponda ao contexto atual (já existe `tabId`, mas a verificação `candidate.tabId === this.tabId` só atualiza `seq`, não bloqueia a aplicação do progresso). Ajustar para ignorar progresso de outros `tabId` durante o boot inicial.

**Files likely to change**:
- `src/scripts/storage.js` (receiveProgress / createChannel) — opcional, risco de afetar produto.
- `tests/e2e/helpers.js` (openPlayer) — desabilitar canal em modo teste ou forçar contexto fresco.
- `playwright.config.js` — workers/serial se opção B.

**Tests to add or update**:
- Teste de isolamento: dois `openPlayer` em contextos distintos não devem compartilhar progresso (frame-01 em ambos).
- Manter `playback.spec.js` test 1 como guard.

## Risks & Considerations

- Alterar `receiveProgress` pode afetar a sincronização legítima entre abas (feature de produto) — alto risco. Preferir fix no lado de teste (helpers) quando possível.
- Serializar a suíte (`--workers=1`) aumenta tempo de CI mas elimina a corrida; pode ser aceitável para E2E.
- Não confundir com bug de produto: o player funciona corretamente em execução isolada.

## Open Questions

- [NEEDS CLARIFICATION: O BroadcastChannel realmente compartilha estado entre contextos Playwright, ou o vazamento é via outro mecanismo (ex.: `reuseExistingServer` compartilhando o mesmo origin storage)?]
- [NEEDS CLARIFICATION: `receiveProgress` aplica progresso de outros `tabId` durante o boot, ou apenas atualiza se `comparison > 0`? Verificar linhas 478-491.]
i: Creating assessment.md for playback-frame04-root-cause bug

---

## Updated Assessment — 2026-10-29 (new evidence)

- **New evidence**:
  - `BOOT_DEBUG` (app): `lastFrameId: null`, `keys: ["hwc.schemaVersion"]` — storage limpo no boot, mesmo em execução completa. Confirma que o `frame-04` NÃO vem de `localStorage` residual.
  - `INITIAL_INDEX` (via `__cinematicPlayer.index` na primeira disponibilidade): `1` (`frame-02`) em execução combinada — o player já avançou durante o boot, antes de `openPlayer`/`waitForFrame`.
  - Teste isolado (`-g "starts on the first frame"`): passa (8.0s). Suíte completa: falha (`frame-04`).
  - Com `BroadcastChannel` de progresso desabilitado (`__HWC_DISABLE_PROGRESS_CHANNEL__`) + `workers: 1`: ainda falha intermitentemente → a causa não é BroadcastChannel nem paralelismo.
- **Root cause (corrected)**: **timing de auto-advance durante o boot.** O dwell do `frame-01` (~1.5s) é consumido pelo boot (carregamento de assets, init). Sob carga, o timer de auto-advance dispara antes de `openPlayer`/`waitForFrame('frame-01')` serem executados, de modo que `waitForFrame('frame-01')` nunca encontra `frame-01` (o player já passou) e dá timeout com valor final `frame-04`. Não é bug de produto nem de storage.
- **Verdict (updated)**: **valid** — causa raiz identificada e corrigida no lado do teste.
- **Severity (updated)**: **low** (flakiness de teste, não de produto).

### Corrected Remediation (applied)
- `src/scripts/player.js`: `this.initialIndex = this.index` capturado no construtor, antes de `schedule()`/auto-advance.
- `src/scripts/main.js`: expõe `globalThis.__initialPlayerIndex = player.initialIndex` (gated por `__CINEMATIC_PRODUCTION__`).
- `tests/e2e/playback.spec.js` test 1: asserção determinística via `__initialPlayerIndex === 0` (capturado no boot), em vez de `waitForFrame('frame-01')` pós-`openPlayer`. Mantém `waitForFrame('frame-02')` + progress assertion.
- Mantidos como hardening: `__HWC_DISABLE_PROGRESS_CHANNEL__` em `openPlayer` e `workers: 1` em `playwright.config.js`.

### Verification
- `playback.spec.js` (mobile-chromium): 4/4 em 3 execuções consecutivas (13.7s, 13.4s, 18.4s).
- `storage` unit tests: 21/21 pass.
- `node --check` em `player.js`, `main.js`, `storage.js`, `helpers.js`: OK.

### Deviations from previous hypothesis
- A hipótese anterior (BroadcastChannel cross-context) foi descartada: o sintoma persistiu mesmo com o canal desabilitado. A causa real é timing de auto-advance durante o boot.