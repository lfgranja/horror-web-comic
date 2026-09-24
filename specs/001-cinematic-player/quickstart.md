# Quickstart: Player Cinematográfico de Quadros

**Feature**: `001-cinematic-player` | **Date**: 2026-09-23

Guia de execução e validação ponta a ponta. Descreve como rodar o site estático e
como provar cada história de usuário. Não contém código de implementação.

## Pré-requisitos

- Node.js 20+ e npm (apenas para ferramentas de desenvolvimento).
- Um servidor estático local (ex.: `npx serve` ou `python3 -m http.server`).
- Playwright instalado (`npx playwright install`) para os testes E2E.
- Um smartphone real (ou emulação de dispositivo) para os portões de
  responsividade.

## Executar

```bash
# servir o site a partir da raiz do repositório
npx serve .

# alternativamente
python3 -m http.server 8080
```

Abra `http://localhost:8080` no navegador.

## Testes e portões

```bash
# testes E2E (fluxos, áudio, retomada, reduced-motion) em viewports móvel e desktop
npx playwright test

# orçamentos de performance (LCP, peso, JS)
npx lhci autorun
```

## Matriz de viewports (SC-005)

| Largura | Orientação | Altura de referência | Alvo |
|---------|------------|----------------------|------|
| 320 px | retrato | 568 px | Mínimo (sem rolagem horizontal) |
| 360 px | retrato | 800 px | Smartphone de referência (SC-001) |
| 768 px | paisagem | 1024 px | Tablet |
| 1440 px | paisagem | 900 px | Desktop |
| 2560 px | paisagem | 1440 px | Máximo / ultrawide (letterbox) |

## Cenários de validação

### VS-1 — Assistir como filme (US1, FR-001..003, FR-017, FR-018)

1. Abrir a página e aguardar o primeiro quadro.
2. **Esperado**: o primeiro quadro aparece e a narrativa avança sozinha no ritmo
   definido; quadros de ritmo lento permanecem mais tempo.
3. Usar próximo/anterior, salto por cena e voltar ao início.
4. **Esperado**: a navegação respeita a ordem narrativa; chega-se ao primeiro
   quadro, ao último quadro ou ao início da cena anterior/seguinte em ≤ 3 ações
   (SC-011).

### VS-2 — Controle de áudio (US2, FR-004..007, FR-014, FR-016)

1. Primeira visita, som do dispositivo ligado.
2. **Esperado**: o áudio inicia ativo por padrão; se o navegador bloquear, fica
   silencioso sem erro e ativa no primeiro gesto.
3. Desligar o áudio no meio da cena.
4. **Esperado**: silêncio imediato, sem reiniciar a cena; o estado é indicado na
   interface.
5. Pausar e retomar a narrativa.
6. **Esperado**: a pausa interrompe o avanço e o áudio da cena; a retomada
   continua o áudio da posição em que parou (SC-009).
7. Recarregar a página.
8. **Esperado**: a preferência é respeitada (SC-007).

### VS-3 — Qualquer dispositivo (US3, FR-009, FR-010, SC-005)

1. Abrir no smartphone em retrato; girar para paisagem; abrir no desktop.
2. **Esperado**: enquadramento íntegro, sem rolagem horizontal nem corte, de
   320 px a 2560 px.
3. Navegar por toque e por teclado.
4. **Esperado**: ambos funcionam.

### VS-4 — Acessibilidade (US4, FR-011..013, SC-006, SC-013)

1. Ativar `prefers-reduced-motion` e usar um leitor de tela.
2. **Esperado**: transições reduzidas; cada quadro tem descrição detalhada
   anunciada; pausa/retomada funciona.

### VS-5 — Retomada (FR-019, SC-012)

1. Avançar até um quadro intermediário, pausar e fechar o navegador.
2. Reabrir a página.
3. **Esperado**: retoma no mesmo quadro e volta a avançar automaticamente (o
   estado de pausa não é persistido); "voltar ao início" reinicia (SC-012).

### VS-6 — Degradação (edge cases, FR-031, SC-020)

1. Simular conexão lenta (throttling), ativar economia de dados (`saveData`) e,
   se possível, `localStorage` indisponível.
2. **Esperado**: quadros carregam progressivamente com placeholder e layout
   estável; sob economia de dados, cada quadro é servido com ≤150 KB e toda
   transição que não seja `cut`/`none` vira corte instantâneo; a experiência
   funciona sem persistência, sem erros visíveis.

### VS-7 — Volume, velocidade e ir ao fim (FR-020, FR-021, FR-003, SC-011)

1. Ajustar o volume, alternar a velocidade para 2x e usar `End` para ir ao fim;
   recarregar a página.
2. **Esperado**: volume e velocidade são aplicados e preservados; a duração
   efetiva reflete a velocidade (apenas a permanência; transições inalteradas);
   o primeiro quadro, o último quadro e o início da cena anterior/seguinte são
   alcançados em ≤3 ações.

### VS-8 — Autoplay bloqueado, overlay e mix de áudio (FR-006, FR-014, FR-016)

1. Simular bloqueio de autoplay; acionar "continuar sem som" e, depois, interagir
   por qualquer gesto; entrar num quadro com áudio próprio e cruzar um limite de
   cena.
2. **Esperado**: overlay "toque para iniciar" aparece; "continuar sem som" o
   dispensa **sem** ligar o áudio; qualquer outro gesto ativa o som e o controle
   passa de "bloqueado" para "ligado"; a trilha do quadro soma-se à da cena
   (ducking) e há crossfade na troca de cena.

### VS-9 — Manifesto inválido e multi-abas (FR-023, FR-024, FR-030)

1. Servir um manifesto ausente/malformado ou com `schemaVersion` incompatível;
   gravar um estado persistido com `schemaVersion` incompatível; abrir duas abas
   e avançar em uma.
2. **Esperado**: tela de erro controlada (sem página em branco) para o manifesto;
   o estado persistido incompatível é descartado e os padrões são aplicados, sem
   bloquear a narrativa; a segunda aba adota a posição mais recente gravada,
   seja o aviso recebido via `BroadcastChannel` ou via evento `storage`
   (mecanismo detalhado em FR-030/T060).

### VS-10 — Fim da narrativa (FR-033)

1. Avançar até o último quadro e aguardar o fim (ou usar `End`).
2. **Esperado**: um overlay acessível "fim da narrativa" é exibido com "Rever do
   início"; os controles de navegação permanecem disponíveis e, ao serem
   acionados, deixam o estado final reposicionando a narrativa.

### SC-002 participant protocol (manual, not CI)

- n ≥ 10 participants; task: find and activate the audio control within 5 s.
- Pass: ≥95% succeed. CI proxy: control visible without hover, reachable in
  ≤1 interaction from any frame (T032a / `tests/e2e/audio.spec.js`).

### SC-004 participant protocol (manual, not CI)

- n ≥ 10 participants; audio muted; answer narrative questions.
- Pass: ≥95% correct answers; 100% of frames expose a detailed description
  (covered by T053a in CI).

## Critérios de aceite

A feature é considerada validada quando VS-1 a VS-10 passam, os orçamentos do
Lighthouse CI são atendidos, a matriz de navegadores é testada e o
`story-manifest.schema.json` (mais o validador de integridade referencial)
valida o conteúdo real da narrativa. Os protocolos manuais de SC-002 e SC-004
são executados fora do CI conforme as seções acima.
