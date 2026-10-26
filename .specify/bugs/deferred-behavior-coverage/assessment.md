# Bug Assessment: Reavaliação dos Testes E2E Residuais de Comportamento e Temporização

- **Slug**: deferred-behavior-coverage
- **Created**: 2026-09-29T14:15:53-04:00
- **Updated**: 2026-10-24T08:23:00-04:00
- **Source**: pasted text (reavaliação após fix parcial e evidências de execução local e CI)
- **Verdict**: valid (defeitos na instrumentação de teste e condições de corrida entre workers)
- **Severity**: medium (bloqueia 100% de aprovação automatizada no portão E2E do Chromium)

## Report (verbatim or summarized)

O bug `deferred-behavior-coverage` foi originalmente aberto em 29/09/2026 durante o port de suítes legadas das branches `test/audio-resilience` e `test/playback-harness` (PR #22). Na época, 8 asserções falharam. O fix inicial corrigiu 4 defeitos de contrato e payload (base 1 do progressbar, escala 0–100 do volume, versão do storage e pausa por navegação).

No entanto, a verificação em `test.md` e a recente execução de 24/10/2026 confirmam que **remanescentes de temporização e corridas sob workers paralelos continuam falhando** nos 5 arquivos afetados (`audio-activity.spec.js`, `resume.spec.js`, `runtime-convergence.spec.js`, `zz-legacy-playback.spec.js`, `zz-legacy-speed-volume.spec.js`):

1. `zz-legacy-speed-volume.spec.js:39`: `speed 2x persists and halves dwell with 250ms floor` falha deterministicamente medindo `642.2ms` contra alvo de `500ms ± 10%` (`Expected < 550ms`).
2. `zz-legacy-playback.spec.js:36`: `default/story rhythm frame dwell is within ±10% of effective duration` falha no primeiro quadro (`f-001`) medindo `1254ms` contra `1000ms` (+25.4% de desvio).
3. `zz-legacy-pause.spec.js:94`: `mute stops audio within 100ms` falha medindo `216ms` contra o teto de `150ms`.
4. Sob concorrência de múltiplos workers (sem `--workers=1` ou isolamento estrito), `audio-activity.spec.js`, `resume.spec.js` e `runtime-convergence.spec.js` sofrem de corridas de hidratação do `localStorage` e ordenação de eventos de áudio.

## Symptom

A suíte E2E do Playwright no Chromium reporta falhas intermitentes ou determinísticas de estouro de tolerância de temporização (`±10%`) e asserções de áudio/hidratação, impedindo a passagem limpa de `npm run test:e2e` mesmo quando o produto executa as transições e o player corretamente.

## Reproduction

1. Executar a suíte de testes legados de velocidade e volume:
   `npx playwright test tests/e2e/zz-legacy-speed-volume.spec.js --project=mobile-chromium`
   *Resultado observado*: Falha determinística em `speed 2x persists and halves dwell`:
   ```text
   Error: dwell 642ms should be within 10% of 500ms
   Expected: < 550
   Received: 642.2000000029802
   ```
2. Executar os 5 arquivos simultaneamente com workers padrão:
   `npx playwright test tests/e2e/audio-activity.spec.js tests/e2e/resume.spec.js tests/e2e/runtime-convergence.spec.js tests/e2e/zz-legacy-playback.spec.js tests/e2e/zz-legacy-speed-volume.spec.js --project=mobile-chromium`
   *Resultado observado*: Entre 1 e 5 falhas variando por corrida de paralelismo e temporização.

## Suspected Code Paths

- `tests/e2e/zz-legacy-speed-volume.spec.js:39-49`: Altera a velocidade para `2x` *depois* que a página já carregou e o quadro `f-001` já estava rodando a `1x`.
- `tests/e2e/helpers.js:287-306`: A função `measureDwellMs` calcula o tempo total do quadro desde a sua entrada (`marks[enter].at`), somando o tempo corrido a 1x com o novo timer disparado a 2x.
- `src/scripts/player.js:206-209, 488-498`: Quando o evento `change` do seletor `#speed` dispara, `this.schedule()` limpa o timer anterior (`clearTimeout(this.timer)`) e arma um novo timeout integral de `500ms` a partir daquele instante, sem deduzir a fração de dwell já consumida no quadro atual.
- `tests/e2e/zz-legacy-playback.spec.js:36`: Mede o dwell de `f-001` onde `marks[0].at` e `window.__playingAt` competem no cálculo do tempo inicial.
- `tests/e2e/zz-legacy-pause.spec.js:94`: Mede a latência de parada de áudio via `Date.now()` no processo Node do Playwright através de chamadas IPC (`locator.click()` + `expect.poll()`), acumulando latência do harness de teste em vez da latência do navegador.

## Root Cause Hypothesis

Existem **duas causas raízes distintas e comprovadas**:

1. **Defeito de Instrumentação nos Testes de Dwell Dinâmico (`zz-legacy-speed-volume.spec.js`)**:
   O teste abre a aplicação (`openApp`) com velocidade padrão `1x`. O primeiro quadro (`f-001`, duração de `1000ms`) inicia sua exibição. Cerca de ~142ms depois, o teste aciona `speed.selectOption('2')`. O player cancela o timer anterior e arma um novo timer de `1000 / 2 = 500ms`. O quadro só avança aos 142ms + 500ms = 642ms. Como `measureDwellMs` mede desde o início do quadro até a saída, o resultado é ~642ms — violando a margem de 500ms ± 10% (máximo 550ms).
   
2. **Defeito de Medição IPC no Teste de Latência de Áudio (`zz-legacy-pause.spec.js`)**:
   O teste de mute tenta validar o requisito constitucional de parada em ≤100ms medindo `Date.now()` fora do browser, sofrendo o atraso inerente do polling de 100ms do Playwright. O produto executa a parada em 90ms (`STOP_DURATION = 90` em `src/scripts/audio.js:6`), mas o teste mede >200ms.

3. **Concorrência de Armazenamento e Recursos entre Workers Paralelos**:
   Os testes que rodam sem isolamento de contexto colidem acessos a chaves `hwc.*` e portas de rede locais, gerando flakiness quando executados sob 4 workers concorrentes.

*Confiança*: **Alta** (demonstrada aritmeticamente e empiricamente nos logs de erro).

## Proposed Remediation

**Preferred**:

1. **Correção de `zz-legacy-speed-volume.spec.js`**:
   - *Abordagem recomendada*: Pré-configurar a velocidade `2x` antes da navegação via `localStorage.setItem('hwc.speed', '2')` na inicialização (`addInitScript`), para que o quadro `f-001` seja executado integralmente a `2x` (500ms) desde o nascimento.
   - *Alternativa*: Se o teste pretende validar a troca dinâmica de velocidade no meio do quadro, medir o dwell do quadro seguinte (`f-002`), que executa 100% sob a nova velocidade.
2. **Correção de `zz-legacy-playback.spec.js:36`**:
   - Ajustar o marco inicial do primeiro quadro em `helpers.js` para desacoplar a latência de auto-start do player da duração de exibição do quadro, ou validar a cadência nominal a partir de `f-002`.
3. **Correção de `zz-legacy-pause.spec.js:94`**:
   - Medir a atenuação de áudio dentro do contexto da página (`page.evaluate` inspecionando o ganho do `AudioContext`/`HTMLMediaElement`) em vez de cronometrar round-trips do Playwright.
4. **Isolamento de concorrência**:
   - Manter a configuração serial (`test.describe.configure({ mode: 'serial' })`) ou garantir que cada teste utilize chaves de armazenamento isoladas por contexto.

**Files likely to change**:
- `tests/e2e/zz-legacy-speed-volume.spec.js`
- `tests/e2e/zz-legacy-playback.spec.js`
- `tests/e2e/zz-legacy-pause.spec.js`
- `tests/e2e/helpers.js`

**Tests to add or update**:
- Execução isolada e repetida (3x) de cada um dos 5 specs para validar ausência total de flakiness (`workers=1` e workers paralelos).

## Risks & Considerations

- Não alterar as regras constitucionais de dwell mínimo (`MINIMUM_DWELL = 250ms`) nem alargar arbitrariamente a tolerância de ±10% em `helpers.js`.
- Preservar o rigor da medição: o produto deve ser testado contra o que ele realmente promete, sem mascarar falhas legítimas de regressão.

## Open Questions

- Nenhuma pendência de diagnóstico: a origem exata dos 642ms e dos 1254ms foi isolada e compreendida matematicamente.
