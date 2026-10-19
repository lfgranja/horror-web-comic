# Problem Definition: Reformular o horror web comic com a suite ArtCraft

- **Slug**: artcraft-horror-comic-reform
- **Created**: 2026-10-17T05:30:00Z
- **Inputs used**: intake.md | research.md

## Problem Statement

O projeto não possui um pipeline de autoria e regeneração de ativos reproduzível e alinhado aos orçamentos e à constituição: os quadros publicados são hoje fixtures sintéticas promovidas a master, e a geração depende manualmente de `sharp`/`ffmpeg`, sem ferramentaria de ilustração, vetor, composição ou áudio no repositório. A disponibilidade local da suíte ArtCraft (CLIs) cria a oportunidade — e o risco — de reformular essa produção, mas o escopo, o impacto nos orçamentos e a compatibilidade com CI e com a constituição ainda são desconhecidos.

## Affected Users & Stakeholders

- **Users**: Leitor do comic cinematográfico de terror — afetado indiretamente pela qualidade/coerência visual e sonora da arte, pelo tempo de carregamento e pela acessibilidade (contraste, descrições, reduced-motion).
- **Stakeholders**: Mantenedor/autor do conteúdo — afetado pela ausência de pipeline de autoria reproduzível e pela dependência de fixtures sintéticas; decide escopo, licenciamento e integração.
- **Stakeholders**: CI / portões de qualidade (`preflight`, `budget.json`, testes E2E/Perf) — afetados por qualquer novo executável nativo ou ativo fora dos orçamentos.
- **Stakeholders**: Leitores com necessidades de acessibilidade (WCAG 2.2 AAA, `forced-colors`, `prefers-reduced-motion`) — afetados se a reformulação quebrar contraste, CLS ou descrições.

## Goals

- Estabelecer um caminho reproduzível de autoria/geração de ativos (frames, áudio e derivados) que produza arte de alta qualidade e coerente com a atmosfera de terror.
- Manter (ou melhorar) os orçamentos de `budget.json` e os limites de performance/acessibilidade (CLS, LCP, Lighthouse).
- Manter conformidade com a constituição (médium definido, mobile-first, acessibilidade, performance).
- Reduzir a dependência de fixtures sintéticas e de trabalho manual não documentado.
- Preservar a compatibilidade com o schema v1 do manifesto e a matriz de testes, salvo decisão explícita em contrário.

## Non-Goals

- Introduzir vídeo, motion graphics ou motores de jogo no runtime do player (viola o Princípio II da constituição).
- Adotar a totalidade dos 13+ aplicativos da suíte ArtCraft.
- Reescrever o player (`src/scripts/*`) ou o schema do manifesto sem decisão explícita.
- Alterar a licença do projeto (MIT) ou embutir binários da suíte no repositório.
- Tornar a suíte ArtCraft uma dependência de runtime do site estático.

## Success Metrics

- Percentual de quadros produzidos por pipeline automatizado (vs. fixtures sintéticos) — baseline: 0% (fixtures sintéticos). (qualitativo até a definição do pipeline)
- Tamanho por quadro ≤ 300 KB e total de ativos ≤ 30 MB (budget.json) — baseline: a medir no estado atual.
- Build de mídia reproduzível em CI (`ubuntu-latest`) sem depender do ambiente local do autor — baseline: não (ferramentas nativas ausentes do CI).
- Lighthouse: performance ≥ 0,9, acessibilidade ≥ 0,95, LCP ≤ 2500 ms, CLS < 0,1 — baseline: a medir.
- Tempo de `build:images` aceitável para CI — baseline: desconhecido.
- Número de apps da suíte efetivamente integrados (se adotados) ≤ valor a definir — baseline: 0.

## Cost of Inaction

Se nada for feito, o comic permanece com fixtures sintéticas promovidas a master, a autoria continua manual e não documentada, e a oportunidade de elevar a qualidade da arte via ferramentaria já disponível localmente é perdida. Por outro lado, a inação evita os riscos de CI/licenciamento/constituição e a dívida de manutenção de integrar 13+ ferramentas nativas. `/speckit.assess.decide` deve pesar essa troca.

## Open Questions

- [NEEDS CLARIFICATION: Quais apps da suíte ArtCraft seriam usados e para quais artefatos (frames, áudio, tipografia, layout, composição, exportação)?]
- [NEEDS CLARIFICATION: A reformulação atinge apenas `media-src/`/`assets/`/`story.json`, ou também player e pipeline de build?]
- [NEEDS CLARIFICATION: Geração automatizada via CLIs integrada ao build, ou autoria manual nos apps?]
- [NEEDS CLARIFICATION: Impacto nos orçamentos de `budget.json` e formatos de entrega (AVIF/WebP/fallback + srcset)?]
- [NEEDS CLARIFICATION: Manter compatibilidade com schema v1 e testes E2E/Perf, ou mudar contrato?]
- [NEEDS CLARIFICATION: Licenças/termos da suíte e dos assets gerados para redistribuição?]
- [NEEDS CLARIFICATION: Restrições de plataforma/CI para execução headless nos runners?]
- [NEEDS CLARIFICATION: Existe demanda observada de leitores por conteúdo/estilo produzido com essas ferramentas?]
- [NEEDS CLARIFICATION: Qual subconjunto mínimo de apps entrega valor sem violar a constituição?]

---

## Problem Definition Update (deep pass) — 2026-10-17

### Resolved constraints (no longer blockers)

- **Licenciamento**: a suíte é dual-licensed MIT OR Apache-2.0; a opção MIT é compatível com a licença MIT do projeto, então a redistribuição de ativos gerados não impõe obrigações Apache. O risco de licenciamento cai de "low confidence" para "resolved (high)".
- **Formato/orçamento por quadro**: teste headless produziu PNG 630×810 em 217 KB (< 300 KB) e SVG de 251 bytes; a re-codificação pelo pipeline existente (sharp) tende a reduzir ainda mais. O risco de violar o orçamento por quadro é reduzido, mas o orçamento total de ativos (30 MB) e o conjunto de variantes (AVIF/WebP/JPEG + srcset) ainda precisam ser validados com arte final.
- **CI/execução headless**: os CLIs rodam sem display e são compatíveis com `ubuntu-latest`; a Option B (local-only) evita o custo de instalação em CI. A Option C permanece de appetite large.

### Still unresolved (carried forward)

- Demanda observada de leitores e ganho de qualidade mensurável (avaliação visual comparativa) continuam como ASSUMPTION (confidence: low).
- Escolha do subconjunto mínimo de apps e integração SVG→sharp (a confirmar).
- Orçamento total de ativos com a arte final (a medir).

### Impact on open questions

- As perguntas sobre licenciamento e viabilidade de exportação podem ser removidas do conjunto bloqueante; permanecem as de escopo, demanda e ganho de qualidade.

---

## Problem Definition Update (scope pass) — 2026-10-17

### Scope clarification (problem space)

- O problema a ser resolvido, se for endereçado, deve restringir-se à **autoria/regeneração de ativos** (`media-src/` → `assets/` via pipeline existente) e **não** ao runtime, ao player ou ao schema do manifesto. Alterar o runtime violaria o Princípio II da constituição (médium definido) e o Princípio IV (orçamentos), e ampliaria o escopo além do que a evidência sustenta.
- A "reformulação completa" original é, no espaço do problema, uma **reformulação da produção de arte**, não do produto entregue ao leitor. O leitor final continua recebendo HTML/CSS/JS + quadros AVIF/WebP/JPEG + áudio AAC/Opus dentro dos orçamentos.
- Portanto, o escopo mínimo defensável é: elevar a qualidade da arte (frames/áudio) por meio de ferramentas de autoria externas, preservando todos os contratos de entrega, acessibilidade e performance.

### Remaining open questions (scope-narrowed)

- [NEEDS CLARIFICATION: A reformulação atinge apenas `media-src/`/`assets/`/`story.json` (conteúdo/alt/descrições), ou também metadados narrativos e durações?]
- [NEEDS CLARIFICATION: Existe demanda observada de leitores por conteúdo/estilo produzido com essas ferramentas?]
- [NEEDS CLARIFICATION: A adoção melhora mensuravelmente a qualidade da arte (avaliação visual comparativa)?]
- [NEEDS CLARIFICATION: Qual o subconjunto mínimo de apps (proposto: vectorcraft + photocraft)?]
