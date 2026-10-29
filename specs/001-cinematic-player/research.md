# Research: Player Cinematográfico de Quadros

**Feature**: `001-cinematic-player` | **Date**: 2026-09-23

Este documento consolida as decisões técnicas da Fase 0. Todos os pontos de
"NEEDS CLARIFICATION" do Technical Context foram resolvidos.

## R1. Stack de execução

- **Decision**: HTML5 + CSS3 + JavaScript ES2022 vanilla (ES modules), sem
  framework em runtime.
- **Rationale**: Princípio II da constituição (médium definido) e orçamento de
  JavaScript inicial < 50 KB gzip. Um player de sequência de imagens não requer
  framework.
- **Alternatives considered**: React/Vue/Svelte (rejeitados: peso e dependência
  desnecessários); motores de jogo/vídeo (proibidos pelo Princípio II).

## R2. Formato do conteúdo narrativo

- **Decision**: Um manifesto JSON único (`src/data/story.json`) descrevendo
  história → cenas → quadros, com ritmo por quadro/cena, áudio por cena e
  descrição por quadro.
- **Rationale**: Separa conteúdo de lógica; o autor ajusta ritmo, cenas, áudio e
  descrições sem editar código; facilita validação por schema.
- **Alternatives considered**: markup HTML por quadro (rejeitado: difícil de
  temporizar/mapear áudio); dados codificados em JS (rejeitado: manutenção).

## R3. Modelo de avanço (híbrido)

- **Decision**: Avanço automático por padrão usando agendador por quadro
  (`setTimeout`/`requestAnimationFrame` para transições), com pausa, próximo/
  anterior, salto por cena e reinício. Interação manual de navegação pausa o
  avanço automático; "play" retoma.
- **Rationale**: Atende ao esclarecimento de sessão (híbrido) e aos FR-013/
  FR-017/FR-018; permite ritmo autoral por quadro ou por história.
- **Alternatives considered**: apenas rolagem (scroll-driven) — rejeitado por não
  permitir pausa/salto de cena confiáveis; apenas manual — rejeitado por perder a
  sensação de filme; vídeo — proibido.

## R4. Estratégia de áudio e autoplay

- **Decision**: `HTMLAudioElement` por cena (loop/ambiente), iniciando **ativo
  por padrão**. Tentativa de reprodução na carga; se o navegador bloquear
  autoplay, permanecer silencioso e ativar no primeiro gesto do usuário,
  indicando claramente. Controle único de ligar/desligar silencia imediatamente.
- **Rationale**: Constituição v2.0.0 (Princípio V) e FR-004/FR-006/FR-014/FR-016;
  compatível com políticas de autoplay sem quebrar a experiência.
- **Alternatives considered**: Web Audio API (rejeitado: complexidade sem ganho
  aqui); iniciar sempre silencioso (rejeitado pelo usuário).

## R5. Persistência local

- **Decision**: `localStorage` com chaves versionadas para preferência de áudio e
  posição de leitura (quadro atual).
- **Rationale**: Simples, síncrono e suficiente para dois valores pequenos;
  atende FR-007 e FR-019.
- **Alternatives considered**: cookies (enviados ao servidor sem necessidade);
  IndexedDB (excessivo); sem persistência (falha requisitos).

## R6. Pipeline e entrega de imagens

- **Decision**: AVIF como formato primário, WebP como intermediário e JPEG como
  fallback via `<picture>`; `srcset`/`sizes` responsivos; dimensões explícitas;
  `loading="lazy"` fora da cena atual e `preload` do quadro atual e do próximo.
- **Rationale**: Princípio IV (orçamento de ativos) e FR-015/SC-008; reduz peso
  mantendo alta qualidade.
- **Alternatives considered**: apenas JPEG (mais pesado); SVG (não adequado a
  arte raster); sprites (prejudica lazy/preload por quadro).

## R7. Transições e movimento

- **Decision**: Transições/efeitos em CSS (classes + `transition`/`keyframes`),
  com variantes reduzidas sob `prefers-reduced-motion`.
- **Rationale**: FR-002/FR-011/SC-006; mantém 60 fps sem bibliotecas.
- **Alternatives considered**: bibliotecas de animação (rejeitadas: dependência).

## R8. Acessibilidade

- **Decision**: Região `aria-live="polite"` anunciando a descrição detalhada de
  cada quadro; controles rotulados; foco visível; atalhos de teclado; descrições
  detalhadas por quadro no manifesto.
- **Rationale**: FR-010/FR-012/FR-014 e Princípio VI; SC-013.
- **Alternatives considered**: apenas `alt` curto (insuficiente para narrativa de
  terror, conforme decisão de sessão).

## R8.1. Semântica ARIA do controle de áudio (ON / OFF / BLOCKED)

**Fontes primárias**: WAI-ARIA 1.2 (REC), APG Button/Switch patterns, WCAG 2.2
Understanding 4.1.2, MDN `aria-pressed` e `role="status"`.

- **`aria-pressed` NÃO expressa 3 estados de negócio.** É um `tristate`
  técnico (`true`/`false`/`mixed`/ausente), mas `mixed` significa
  semanticamente "vários itens controlados não compartilham o mesmo valor"
  (ex.: seleção mista), não "erro/bloqueado". Usar `mixed` para BLOCKED seria
  mentir para o AT. Fontes:
  - https://www.w3.org/TR/wai-aria-1.2/#aria-pressed ("A value of `mixed`
    means that the values of more than one item controlled by the button do
    not all share the same value")
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-pressed

- **`role="switch"` também é binário.** `aria-checked` em `switch` só aceita
  `true`/`false`; `mixed` é inválido e os user agents DEVEM tratá-lo como
  `false`. Fonte: https://www.w3.org/TR/wai-aria-1.2/#switch

- **Padrão correto: separar toggling de reporte.** O controle é um toggle
  button (`aria-pressed` true/false) que reporta a preferência; a condição
  BLOCKED é um **status transiente**, anunciado por live region:
  - APG Button: "When the action associated with a button is unavailable, the
    button has `aria-disabled` set to true" + regra crítica "não mudar o
    label quando o estado muda".
    https://www.w3.org/WAI/ARIA/apg/patterns/button/
  - `role="status"` é live region polite/atomic implícita — apropriada para
    aviso que não deve interromper.
    https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role
  - WCAG 4.1.2 exige que nome/role/estado sejam programaticamente
    determináveis e que mudanças sejam notificadas — a live region cumpre a
    parte de notificação. https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html

- **Recomendação de markup** (rótulo do botão fixo "Som"; estado na
  `aria-pressed`; bloqueio via `aria-disabled` + descrição + live region):

```html
<!-- ON -->
<button type="button" id="audio-toggle" aria-pressed="true" aria-describedby="audio-hint">Som</button>

<!-- OFF -->
<button type="button" id="audio-toggle" aria-pressed="false" aria-describedby="audio-hint">Som</button>

<!-- BLOCKED: preferência segue ON, mas ação indisponível -->
<button type="button" id="audio-toggle" aria-pressed="true"
        aria-disabled="true" aria-describedby="audio-hint">Som</button>
<p id="audio-hint">O navegador bloqueou o som. Toque na página para ativar.</p>
<div role="status" id="audio-status">Som bloqueado pelo navegador</div>
```

Notas: `aria-disabled="true"` (em vez de `disabled`) mantém o botão focável e
capaz de disparar o gesto qualificado que desbloqueia o `autoplay` — exatamente
o comportamento do overlay "toque para iniciar" da spec. Atualizar o texto do
`#audio-hint`/`#audio-status` por JS quando o estado mudar; a live region anuncia
a transição. Alternativa aceitável: mudar o accessible **name** do botão
("Ativar som"/"Som bloqueado") e abandonar `aria-pressed` — o APG permite isso,
mas perde a semântica de toggle; manter `aria-pressed` fixo no rótulo é o padrão
recomendado. Não usar `mixed` para BLOCKED.

- **Uncertainty**: nenhum documento W3C define um "terceiro estado" de toggle;
  a separação toggle+live-region é a leitura consolidada de APG 4.1.2 + nota de
  `aria-disabled` do APG Button. Comportamento de AT com `aria-disabled` em
  toggle buttons varia levemente entre leitores de tela (alguns ainda anunciam
  "pressed"); testar em VoiceOver/NVDA é prudente.

## R9. Build e otimização

- **Decision**: Fonte executável sem build; usar esbuild apenas para minificar
  CSS/JS e aplicar cache-busting (hash) na publicação. O site funciona servido
  diretamente dos fontes durante o desenvolvimento.
- **Rationale**: Princípio IV (código minificado) sem impor etapa de build ao
  desenvolvimento; mantém entrega estática.
- **Alternatives considered**: sem build (sem minificação/hash); webpack/vite
  (mais pesados que o necessário).
## R10. Testes e portões

- **Decision**: Playwright para fluxos E2E (avanço, navegação, áudio, retomada,
  reduced-motion) em viewports móvel e desktop; Lighthouse CI para orçamentos de
  performance; verificação manual em dispositivo móvel real.
- **Rationale**: Portões do Fluxo de Desenvolvimento da constituição; cobre
  cenários que dependem de áudio e layout, difíceis de testar em jsdom.
- **Alternatives considered**: apenas manual (risco de regressão); Jest + jsdom
  (não exercita áudio/layout de forma confiável).

## Resolved Unknowns

| Ponto do Technical Context | Resolução |
|----------------------------|-----------|
| Ferramenta de teste | Playwright + Lighthouse CI (R10) |
| Pipeline de imagens | AVIF/WebP/JPEG responsivo (R6) |
| Formato de conteúdo | Manifesto JSON validado por schema (R2) |
| Estratégia de áudio/autoplay | Ativo por padrão com fallback de gesto (R4) |
| Build/minificação | Sem build em dev; esbuild na publicação (R9) |
