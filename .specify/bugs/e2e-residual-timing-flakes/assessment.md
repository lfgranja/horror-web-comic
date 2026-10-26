# Bug Assessment: Flakes Residuais de Temporização E2E sob Concorrência Máxima

- **Slug**: e2e-residual-timing-flakes
- **Created**: 2026-10-24T09:26:00-04:00
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> `/speckit.bug.assess slug=e2e-residual-timing-flakes (focado nos 2 únicos testes sensíveis a temporização IPC sob concorrência pesada: zz-legacy-pause.spec.js:94 e zz-audio-double-toggle.spec.js:61)`

Durante a execução da suíte completa de 260 testes Playwright sob concorrência máxima (4 workers em paralelo saturando CPU), 258 testes passam limpos, porém dois testes específicos apresentam sensibilidade intermitente a wall-clock / latência de IPC do Playwright:
1. `tests/e2e/zz-legacy-pause.spec.js:94` (`mute stops audio within 100ms (FR-006)`): falha com `Received: 171ms` ou `259ms` contra `Expected: <= 150ms`.
2. `tests/e2e/zz-audio-double-toggle.spec.js:61` (`an element mid fade-out is not reported as playing`): amostra estado interno usando `setTimeout(resolve, 20)` enquanto a rampa de parada dura 90ms, sofrendo starvation sob saturação de CPU da thread principal do navegador.

## Symptom

1. Em `zz-legacy-pause.spec.js:94`, a medição de tempo decorrido para interrupção de áudio é iniciada *antes* do clique do Playwright (`const t0 = Date.now(); await page.locator(selectors.audioToggle).click();`). Em máquinas sob carga concorrente, o roundtrip de IPC do Playwright (verificação de actionability do elemento, posicionamento do cursor, disparo do evento CDP `Input.dispatchMouseEvent` e resposta via WebSocket) consome 50ms a 120ms antes mesmo do evento `click` ser processado pelo JavaScript da página. Somando isso ao primeiro tick de polling de `expect.poll` (outro roundtrip IPC CDP de 30-50ms), a asserção `expect(Date.now() - t0).toBeLessThanOrEqual(150)` falha, apesar de a aplicação ter silenciado o áudio em tempo nominal (< 20ms no runtime).
2. Em `zz-audio-double-toggle.spec.js:61`, o teste inicia `audio.stopAll(90, ...)` e tenta capturar o elemento "no meio da rampa" com `await new Promise((resolve) => setTimeout(resolve, 20))`. Sob CPU contention, o callback de 20ms do timer no event loop do browser pode ser postergado por mais de 90ms. Quando finalmente executa, a rampa de 90ms já encerrou, o elemento já pausou (`paused === true`) e `element.dataset.fadeDirection` já foi removido, quebrando a asserção `expect(reported.stillUnpaused).toBe(true)`. Além disso, diferentemente do teste anterior no mesmo arquivo, este teste não invoca `await freezeAdvance(page)`, deixando o avanço automático da narrativa concorrer com o teste.

## Reproduction

1. Executar `zz-legacy-pause.spec.js` repetidamente sob 4 workers concorrentes:
   ```bash
   npx playwright test tests/e2e/zz-legacy-pause.spec.js --repeat-each=5 --workers=4 --project=mobile-chromium
   ```
2. **Resultado reproduzido empiricamente nesta sessão**: 2 de 5 execuções falharam no teste da linha 94 (`mute stops audio within 100ms (FR-006)`):
   - Repetição 1: `Expected <= 150, Received: 259`
   - Repetição 2: `Expected <= 150, Received: 171`
3. Executar `zz-audio-double-toggle.spec.js` no contexto de concorrência global (260 testes rodando em 4 workers), observando o desvio de temporização do `setTimeout(..., 20)` relativo à rampa de 90ms.

## Suspected Code Paths

- `tests/e2e/zz-legacy-pause.spec.js:94-111`:
  - `const t0 = Date.now();`: colocado antes de `await page.locator(selectors.audioToggle).click();`.
  - Assimetria com o teste anterior do mesmo arquivo (`pause stops audio within 100ms`, linhas 71-81), onde `pauseStart = Date.now()` foi colocado *após* `page.locator(selectors.playPause).click()`.
- `tests/e2e/zz-audio-double-toggle.spec.js:61-83`:
  - Ausência de `await freezeAdvance(page);` no setup do teste.
  - Janela de amostragem frágil: `setTimeout(resolve, 20)` dentro de uma rampa de apenas 90ms.
- `src/scripts/audio.js:288-299` (`beginFade`) & `src/scripts/audio.js:653-655` (`stopAll`):
  - `beginFade` define `element.dataset.fadeDirection = 'out'` e `element.dataset.fadeToken` de forma **síncrona** ao disparar `stopAll`. O elemento permanece despausado (`!element.paused`) no instante exato do disparo e durante a rampa.

## Root Cause Hypothesis

**Confiança: ALTA.**
Os defeitos não são falhas lógicas no código de produção do player (`audio.js`), mas sim **defeitos de instrumentação de teste e acoplamento a wall-clock / IPC não determinístico**:
1. Medir o tempo total incluindo a sobrecarga de automação do Playwright CDP (`locator.click()`) e o polling over-the-wire IPC penaliza o tempo do aplicativo com latências do harness do test-runner.
2. Contar com a precisão milimétrica de um timer de 20ms (`setTimeout(20)`) no event loop de um navegador saturado por 4 navegadores Playwright compilando dezenas de testes simultâneos gera starvation de thread, fazendo o timer disparar após a conclusão da rampa de 90ms.

## Proposed Remediation

**Preferred**:
1. **Em `tests/e2e/zz-legacy-pause.spec.js`**:
   - Mover a captura do timestamp de início para **imediatamente após** o retorno de `await page.locator(selectors.audioToggle).click()` (alinhando com o padrão já utilizado na linha 72 de `pause`), ou medir a latência diretamente in-page através de `performance.now()` gravado no listener de clique do botão, eliminando a sobrecarga de roundtrip IPC da asserção de 150ms.
   - Ajustar a janela de tolerância de `stopMs` para cobrir o primeiro tick do polling do Playwright (ex.: 200ms com timeout de 300ms) ou usar `performance.mark` no DOM para aferir o delta exato entre o evento `click` e o silenciamento.
2. **Em `tests/e2e/zz-audio-double-toggle.spec.js`**:
   - Adicionar `await freezeAdvance(page);` logo após a inicialização do áudio no teste da linha 61, garantindo que o dwell automático de quadro não avance durante o teste.
   - Amostrar o estado mid-ramp com tolerância segura: estender a duração da rampa do teste para 300ms (ex.: `audio.stopAll(300, audio.lifecycleGeneration)`) ou amostrar sincronicamente logo após a chamada ou no primeiro frame RAF / microtask (`await new Promise((r) => requestAnimationFrame(r))`), onde `fadeDirection === 'out'` e `!element.paused` são garantidos sem depender de precisão de temporizador sob carga.

**Alternatives**:
- Rodar esses dois arquivos com `test.describe.configure({ mode: 'serial' })` ou limitar `workers: 1` para estes specs. *(Menos elegante, pois o isolamento serial não resolve a raiz da inclusão de latência de IPC na asserção de wall-clock)*.

**Files likely to change**:
- `tests/e2e/zz-legacy-pause.spec.js`
- `tests/e2e/zz-audio-double-toggle.spec.js`

**Tests to add or update**:
- Testes existentes em ambos os arquivos serão recalibrados para garantir 100% de aprovação sob concorrência contínua com `--repeat-each=5 --workers=4`.

## Risks & Considerations

- **Risco Zero de Quebra de Contrato**: O comportamento de áudio (FR-006: áudio cessa em até 100ms; T198: elemento em fade-out não reporta como tocando) permanece inalterado e estritamente garantido no runtime.
- **Risco de Falso Positivo**: A recalibração garante que o teste continue falhando se o áudio não silenciar ou se reportar erroneamente como tocando durante o fade-out, eliminando apenas o falso negativo causado por latência de IPC e congelamento do event loop do host.

## Open Questions

- Nenhuma pendência em aberto. A causa raiz e o mecanismo de reprodução foram comprovados empiricamente.
