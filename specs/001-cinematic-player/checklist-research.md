# Research Notes: Base para Checklists de Qualidade de Requisitos

**Feature**: `001-cinematic-player` | **Date**: 2026-09-23
**Purpose**: Consolidar achados de pesquisa (internet + codebase) usados para gerar as
quatro checklists de qualidade de requisitos (`checklists/playback.md`,
`checklists/audio.md`, `checklists/accessibility.md`,
`checklists/content-performance.md`). Fontes primárias citadas por URL.

> Escopo: este documento é insumo de pesquisa, **não** é um checklist. Os itens de
> revisão vivem nos quatro arquivos de `checklists/`. O `checklists/requirements.md`
> é o checklist embutido mantido por `/speckit.specify` e `/speckit.clarify` e não
> foi alterado.

## 1. Inventário da codebase (estado atual)

- Repositório contém apenas artefatos de spec; **não há código de implementação ainda**
  (`index.html`, `src/`, `assets/`, `tests/` ainda não existem).
- `specs/001-cinematic-player/`: `spec.md`, `plan.md`, `research.md`, `data-model.md`,
  `quickstart.md`, `contracts/{story-manifest.schema.json,player-ui-contract.md,storage-contract.md}`.
- `.specify/memory/constitution.md` v2.0.0 (8 itens; Princípios I, II, IV, V, VI
  relevantes).
- Consequência: as checklists validam **qualidade dos requisitos** (spec + contratos +
  constituição), não comportamento implementado.

## 2. Políticas de autoplay de áudio (fontes primárias)

- **Chrome**: autoplay mudo sempre permitido; com som exige interação com o domínio, MEI
  ou instalação PWA. Quando bloqueado, `play()` retorna promise rejeitada com
  `NotAllowedError` e o atributo `autoplay` é ignorado. Recomendação oficial: sempre
  tratar a promise de `play()` e exibir controle manual. — https://developer.chrome.com/blog/autoplay ,
  https://www.chromium.org/audio-video/autoplay/autoplay-policy-design-rationale
- **Safari/WebKit**: macOS bloqueia autoplay com som por inferência; iOS 10+ só
  `play()`/`autoplay` sem gesto para mídia muda/sem faixa de áudio. Definição estrita de
  gesto: `play()` deve resultar diretamente de `touchend`, `click`, `doubleclick` ou
  `keydown` (`canplaythrough → play()` **não** qualifica). Restrições de gesto são **por
  elemento** — para sequência de áudio, trocar `src` do mesmo elemento, não criar novos.
  Faixas de áudio silenciosas ainda contam como áudio. — https://webkit.org/blog/7734/auto-play-policy-changes-for-macos ,
  https://webkit.org/blog/6784/new-video-policies-for-ios/
- **Firefox**: bloqueia mídia com som por padrão; opções por site; Web Audio exige
  ativação "sticky" (`media.autoplay.block-webaudio`). — https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay ,
  https://support.mozilla.org/kb/block-autoplay
- **Detecção**: `navigator.getAutoplayPolicy("mediaelement")` → `allowed` |
  `allowed-muted` | `disallowed`; nenhum evento dispara quando a política muda após
  interação. — https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getAutoplayPolicy

**Implicação para requisitos**: FR-016 ("permanece silencioso e ativa no primeiro gesto")
é ambíguo quanto a *qual* gesto e como o bloqueio é detectado; FR-014 (estado visível)
não cobre o caso "preferência on + autoplay bloqueado".

## 3. WCAG 2.2 (critérios normativos aplicáveis)

- **1.4.2 Audio Control (A)**: áudio que toca automaticamente por mais de 3 s exige
  mecanismo de pausar/parar **ou** controle de volume independente do sistema. — https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html
- **2.2.2 Pause, Stop, Hide (A)**: conteúdo em movimento/auto-atualização iniciado
  automaticamente, >5 s, em paralelo com outro conteúdo, exige mecanismo de pausar/parar/
  ocultar. Apresentações que avançam sozinhas são explicitamente citadas. — https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- **2.3.3 Animation from Interactions (AAA)**: animação por interação deve poder ser
  desativada, salvo essencial; técnicas C39/SCR40 usam `prefers-reduced-motion`. — https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- **1.1.1 Non-text Content (A)**: imagem complexa (quadro de comic) → alt curto **mais**
  descrição longa (G73/G74/G92/ARIA15); imagens com texto devem repetir o texto. — https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html ,
  https://www.w3.org/WAI/tutorials/images/complex/
- **2.4.7 Focus Visible (AA)** e **2.5.8 Target Size Minimum (AA, 24×24 px)**;
  **2.5.5 Target Size Enhanced (AAA, 44×44 px)**. — https://www.w3.org/WAI/WCAG22/Understanding/focus-visible ,
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

## 4. `prefers-reduced-motion`

- Definição normativa (Media Queries L5): sinaliza minimizar movimento não essencial;
  valores `no-preference` | `reduce`. — https://www.w3.org/TR/mediaqueries-5/
- Armadilha: o valor é `reduce`, não "none"; **não** usar `* { animation: none !important }`;
  substituir movimento essencial (ex.: cross-fade em vez de slide). Cobertura deve incluir
  animação dirigida por JS (`matchMedia`), não só CSS. — https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility ,
  https://www.w3.org/WAI/WCAG20/Techniques/css/C39

**Implicação**: FR-011 ("respeitar") e SC-006 ("não experimentam animação automática
além de um quadro estático") não definem se o **avanço automático continua** sob
reduced-motion — ambiguidade direta com FR-017.

## 5. `aria-live` para conteúdo sequencial

- Região precisa existir na árvore de acessibilidade **antes** da mudança; `role="status"`
  tem `aria-live="polite"` + `aria-atomic="true"` implícitos e é preferível para estado.
  Atualizações rápidas podem ser coalescidas/descartadas → requer debounce. Não mover
  foco para a região. — https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions ,
  https://www.w3.org/WAI/WCAG21/Techniques/ARIA22.html

**Implicação**: contrato de UI cita `aria-live="polite"` mas não define atomicidade,
cadência nem interação com avanço automático (risco de spam de anúncios).

## 6. Persistência no navegador

- Web Storage ≈ 5 MiB/origem; dados "best-effort" podem ser evictados; modo privado é
  efêmero; Safari tem histórico de expurgo (ITP/7 dias, bugs de wipe). Requisição de
  persistência via `navigator.storage.persist()`. — https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria ,
  https://webkit.org/blog/14403/updates-to-storage-policy
- Padrão de degradação: `try/catch` (`QuotaExceededError`, `SecurityError`), round-trip
  de escrita/leitura, fallback em memória sem erro visível. (Já previsto no storage
  contract.)

**Implicação**: SC-007 e SC-012 ("100%") são inatingíveis quando o storage é
indisponível/evictado — conflito mensurável.

## 7. Imagens responsivas, Core Web Vitals e performance

- `<picture>` AVIF→WebP→JPEG; `srcset`/`sizes`; `width`/`height` intrínsecos para evitar
  CLS (`aspect-ratio: auto w/h`); `loading="lazy"` nunca no LCP; `fetchpriority="high"`
  em no máximo 1–2 imagens; preload responsivo exige `imagesrcset`/`imagesizes`
  idênticos ao `<img>` (senão double fetch). — https://web.dev/articles/optimize-lcp ,
  https://web.dev/articles/preload-responsive-images , https://web.dev/articles/fetch-priority ,
  https://web.dev/articles/lazy-loading-images
- **CWV**: LCP ≤ 2,5 s; INP ≤ 200 ms; CLS ≤ 0,1 (p75, dados de campo); Lighthouse é
  laboratório e não mede INP (usar TBT). — https://web.dev/articles/vitals ,
  https://web.dev/articles/defining-core-web-vitals-thresholds
- **Orçamentos**: `budget.json` (KB, transfer size) + Lighthouse CI `assert --budgetsFile`;
  cuidado: `maxNumericValue` em **bytes** vs budget.json em KB. — https://github.com/GoogleChrome/budget.json ,
  https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md

**Implicação**: plan.md cita "orçamento definido" sem número; budgets de LCP/JS existem
no plan mas **não** nos Success Criteria da spec.

## 8. Layout responsivo, teclado e alvos de toque

- `viewport-fit=cover` + `env(safe-area-inset-*)` para notch; `object-fit: contain`
  (letterbox, sem corte) vs `cover` (corta); container queries para o componente player. — https://web.dev/learn/design/screen-configurations ,
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit
- Teclado: APG — um stop de tab por componente composto, roving tabindex, `Home`/`End`
  para primeiro/último; **não** usar `tabindex` positivo; `preventDefault` no `keydown`
  (não `keyup`); listener no elemento, não em `window`; valor de `Space` é `" "`. — https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ ,
  https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
- Toque: `touch-action` (evitar `none` global), alvos ≥24 px (AA) / 44 px (AAA),
  sem interações apenas-hover. — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum ,
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action

**Implicação**: FR-010 não define foco visível, tamanho de alvo nem gestão de foco;
atalhos do contrato não declaram precedência sobre defaults do navegador.

## 9. Movimento/transições e JSON Schema

- Animar só `transform`/`opacity` (compositor); `will-change` com parcimônia; evitar
  layout thrash; `requestAnimationFrame` pausa em abas ocultas (não confiar em contagem
  de frames para correção temporal); budget ~16,7 ms/frame a 60 fps. — https://web.dev/articles/animations-and-performance ,
  https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- JSON Schema draft 2020-12; Ajv2020 não mistura drafts; `allErrors`/`strict`; unicidade
  de `id` e existência de arquivos **não** são garantidas pelo schema (exigem validação
  adicional). — https://json-schema.org/draft/2020-12 ,
  https://ajv.js.org/json-schema.html

## 10. Acessibilidade de webcomics / arte sequencial

- Não há especificação W3C específica para webcomics; aplica-se 1.1.1 situação B (alt
  curto + descrição longa) e a decisão de arte/quadro como unidade de informação. — https://www.w3.org/WAI/tutorials/images/complex/ ,
  https://lists.w3.org/Archives/Public/w3c-wai-ig/2002JanMar/0106.html

**Implicação**: FR-012 exige "descrição detalhada equivalente à experiência visual", mas
não define critérios mínimos, se há alt curto, nem como a descrição é exposta.

## Fontes primárias mais fortes

1. Chrome autoplay — https://developer.chrome.com/blog/autoplay
2. Chromium autoplay rationale — https://www.chromium.org/audio-video/autoplay/autoplay-policy-design-rationale
3. WebKit macOS — https://webkit.org/blog/7734/auto-play-policy-changes-for-macos
4. WebKit iOS — https://webkit.org/blog/6784/new-video-policies-for-ios/
5. MDN Autoplay — https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
6. WCAG 2.2 (norma) — https://www.w3.org/TR/WCAG22/
7. WCAG Understanding (1.4.2, 2.2.2, 2.3.3, 1.1.1, 2.4.7, 2.5.8) — https://www.w3.org/WAI/WCAG22/Understanding/
8. Media Queries L5 — https://www.w3.org/TR/mediaqueries-5/
9. W3C C39 — https://www.w3.org/WAI/WCAG20/Techniques/css/C39
10. MDN ARIA live regions — https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
11. W3C ARIA22 (`role="status"`) — https://www.w3.org/WAI/WCAG21/Techniques/ARIA22.html
12. MDN storage quotas/eviction — https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
13. WebKit storage policy — https://webkit.org/blog/14403/updates-to-storage-policy
14. web.dev vitals — https://web.dev/articles/vitals
15. web.dev optimize LCP — https://web.dev/articles/optimize-lcp
16. GoogleChrome budget.json — https://github.com/GoogleChrome/budget.json
17. W3C APG keyboard interface — https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
18. JSON Schema 2020-12 — https://json-schema.org/draft/2020-12
