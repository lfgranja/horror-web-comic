# Decision: Reformular o horror web comic com a suite ArtCraft

- **Slug**: artcraft-horror-comic-reform
- **Decided**: 2026-10-17T05:40:00Z
- **Verdict**: needs-clarification
- **Artifacts reviewed**: intake.md | research.md | problem.md | concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | adequate | O problema de pipeline de autoria não reproduzível e fixtures sintéticos é real no estado do repositório, mas a formulação original é solution-first ("reformular com ArtCraft") e a demanda por essa suíte não é observada. |
| Evidence strength | weak | Restrições/orçamentos/CI são bem citados (local), mas demanda, mercado, licenciamento e ganho de qualidade são ASSUMPTION; muitos [NEEDS CLARIFICATION] permanecem. |
| Value vs. inaction | adequate | A Option B tem baixo custo e potencial de elevar a qualidade da arte, mas o ganho não foi medido; a inação evita riscos de CI/licença. |
| Feasibility / appetite | adequate | A Option B (adoção local-only) é credível e de appetite small/medium; não toca no CI nem no runtime. |
| Strategic fit | adequate | A Option B não altera o runtime nem viola o Princípio II, desde que permaneça como ferramenta de autoria; o escopo completo violaria a constituição. |
| Risk posture | adequate | A Option B mitiga o risco de CI ao ficar fora do pipeline; permanecem riscos de licenciamento (Apache 2.0) e de disciplina de exportação não validados. |

## Verdict & Rationale

O veredito é **needs-clarification**. Embora exista um problema real e uma opção credível de baixo risco (Option B), a força da evidência é fraca nos pontos decisivos (demanda, licenciamento, ganho de qualidade, formato de exportação), e o escopo original ("reformular todo") permanece indefinido. Iniciar `/speckit.specify` agora transferiria para a especificação perguntas que a avaliação não respondeu. A honestidade exige bloquear o avanço até que as lacunas sejam fechadas; a Option B permanece a candidata recomendada caso as clarificações sejam resolvidas favoravelmente.

## If needs-clarification

- **Blocking questions**:
  - [NEEDS CLARIFICATION: Quais apps da suíte ArtCraft seriam usados e para quais artefatos (frames, áudio, tipografia, layout, composição, exportação)?]
  - [NEEDS CLARIFICATION: A reformulação atinge apenas `media-src/`/`assets/`/`story.json`, ou também player e pipeline de build?]
  - [NEEDS CLARIFICATION: Geração automatizada via CLIs integrada ao build, ou autoria manual nos apps?]
  - [NEEDS CLARIFICATION: Os apps selecionados exportam nos formatos/dimensões/nomenclatura aceitos por `media-src/` e pelo manifesto (incluindo light variants)?]
  - [NEEDS CLARIFICATION: A adoção melhora mensuravelmente a qualidade da arte (avaliação visual comparativa)?]
  - [NEEDS CLARIFICATION: Licenças/termos da suíte (Apache 2.0) permitem redistribuição dos ativos gerados e quais obrigações de aviso se aplicam?]
  - [NEEDS CLARIFICATION: Existe demanda observada de leitores por conteúdo/estilo produzido com essas ferramentas?]
- **Revisit stage**: research (para validar evidência de demanda, licenciamento e formato de exportação) — com revisão de escopo em `define` se necessário.

## If go — Handoff (contingent, not active)

- **Problem**: O projeto não possui pipeline de autoria/regeneração de ativos reproduzível e alinhado aos orçamentos/constituição; os quadros são fixtures sintéticas e a geração é manual (sharp/ffmpeg).
- **Chosen approach**: Option B — adoção limitada como ferramentas de autoria (local-only), subconjunto justificado, build inalterado.
- **In scope / out of scope**: In: autoria com apps selecionados exportando para `media-src/`. Out: integração no CI, filmcraft/effectcraft no runtime, todos os apps, mudança de schema/player, binários no repo.
- **Success metrics**: % de quadros via pipeline automatizado (baseline 0%), ≤300 KB/quadro, ≤30 MB total, Lighthouse perf≥0.9/a11y≥0.95/CLS<0.1/LCP≤2500 ms, build reproduzível em CI (baseline: não).
- **Carried-forward open questions**: as listadas em blocking questions acima.

---

## Decision Update (deep pass) — 2026-10-17

### Re-evaluated scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | adequate | Problema de autoria não reproduzível/fixtures permanece real; formulação solution-first persiste, mas escopo pode ser limitado à Option B. |
| Evidence strength | weak | Licenciamento, formatos de exportação e execução headless agora são citados (high); porém demanda, ganho de qualidade e integração SVG→sharp permanecem ASSUMPTION (low). |
| Value vs. inaction | adequate | Option B tem baixo custo e ganho potencial; ganho ainda não medido, mas risco de CI/licença reduzido. |
| Feasibility / appetite | adequate | Option B (local-only) credível e small/medium; subconjunto mínimo (vectorcraft + photocraft) proposto. |
| Strategic fit | adequate | Option B mantém runtime/constituição intactos; licenciamento MIT disponível reduz fricção. |
| Risk posture | adequate | Riscos de CI/licença mitigados; permanecem disciplina de exportação e demanda não validada. |

### Verdict (re-evaluated): needs-clarification

A evidência fortaleceu-se em licenciamento, formatos e execução headless, mas a demanda de leitores e o ganho de qualidade mensurável continuam não validados (ASSUMPTION, low). Como `go` exige evidência `adequate`+ e a evidência de valor permanece fraca, o veredito permanece **needs-clarification**. A Option B continua a candidata recomendada caso as clarificações sejam resolvidas favoravelmente.

### Updated blocking questions

- [NEEDS CLARIFICATION: Qual o escopo da reformulação (apenas `media-src/`/`assets/`/`story.json`, ou também player e pipeline de build)?]
- [NEEDS CLARIFICATION: Existe demanda observada de leitores por conteúdo/estilo produzido com essas ferramentas?]
- [NEEDS CLARIFICATION: A adoção melhora mensuravelmente a qualidade da arte (avaliação visual comparativa)?]
- [NEEDS CLARIFICATION: Qual o subconjunto mínimo de apps (proposto: vectorcraft + photocraft) e a integração SVG→sharp é viável?]

### Revisit stage

research (demanda e ganho de qualidade) + define (escopo) — a licenciamento e formatos não são mais bloqueantes.

### Contingent handoff (if clarified → go)

- **Problem**: Pipeline de autoria não reproduzível; quadros são fixtures sintéticas; geração manual (sharp/ffmpeg).
- **Chosen approach**: Option B — adoção limitada (local-only), subconjunto vectorcraft + photocraft (designcraft opcional), build inalterado.
- **In scope / out of scope**: In: autoria com apps selecionados exportando para `media-src/`. Out: integração no CI, filmcraft/effectcraft no runtime, todos os apps, mudança de schema/player, binários no repo.
- **Success metrics**: % quadros via pipeline (baseline 0%), ≤300 KB/quadro, ≤30 MB total, Lighthouse perf≥0.9/a11y≥0.95/CLS<0.1/LCP≤2500 ms, build reproduzível em CI (baseline: não).
- **Carried-forward open questions**: as 4 listadas acima.

---

## Decision Update (scope pass) — 2026-10-17

### Re-evaluated scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | adequate | Escopo estreitado para autoria de ativos (media-src) torna o problema mais defensável e constitucionalmente compatível. |
| Evidence strength | weak | Licenciamento/formatos/CI citados (high); demanda e ganho de qualidade continuam ASSUMPTION (low). |
| Value vs. inaction | adequate | Baixo custo (Option B local-only); ganho não medido, mas risco reduzido. |
| Feasibility / appetite | adequate | Option B (vectorcraft + photocraft) credível e small/medium. |
| Strategic fit | strong | Escopo limitado a autoria preserva Princípio II/IV; licença MIT disponível. |
| Risk posture | adequate | Riscos de CI/licença mitigados; disciplina de exportação e demanda não validadas. |

### Verdict (re-evaluated): needs-clarification

O escopo estreitado melhora o alinhamento estratégico, mas a evidência de valor (demanda e ganho de qualidade) permanece fraca. `go` exige evidência `adequate`+; portanto o veredito permanece **needs-clarification**. A Option B segue como candidata recomendada.

### Updated blocking questions

- [NEEDS CLARIFICATION: Existe demanda observada de leitores por conteúdo/estilo produzido com essas ferramentas?]
- [NEEDS CLARIFICATION: A adoção melhora mensuravelmente a qualidade da arte (avaliação visual comparativa)?]
- [NEEDS CLARIFICATION: Qual o subconjunto mínimo de apps (proposto: vectorcraft + photocraft)?]

### Revisit stage

research (demanda e ganho de qualidade) — escopo e licenciamento não são mais bloqueantes.

---

## Decision Update (validation actions completed) — 2026-10-17

### Re-evaluated scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | adequate | Problema de autoria não reproduzível/fixtures é real; escopo estreitado para media-src. |
| Evidence strength | adequate | Licenciamento/formatos/CI/SVG→sharp citados (high); demanda agora é stated want do stakeholder (medium, citado); qualidade subjetiva não medida (medium). |
| Value vs. inaction | adequate | Baixo custo (Option B local-only); ganho de qualidade não medido objetivamente, mas viabilidade de tamanho confirmada. |
| Feasibility / appetite | adequate | Option B (vectorcraft + photocraft) credível e small/medium; exportação headless validada. |
| Strategic fit | strong | Escopo limitado a autoria preserva Princípio II/IV; licença MIT disponível. |
| Risk posture | adequate | Riscos de CI/licença/SVG mitigados; disciplina de exportação e qualidade subjetiva não validadas. |

### Verdict (re-evaluated): go

A evidência de valor atingiu o limiar mínimo (`adequate`): a demanda deixou de ser mera suposição e passou a ser um *stated want* do stakeholder (citado), e a viabilidade de formato/tamanho foi validada localmente. Os riscos remanescentes (qualidade subjetiva, disciplina de exportação) são aceitáveis para um escopo local-only e reversível. A Option B (local-only, subconjunto vectorcraft + photocraft) é aprovada para especificação.

### Handoff to `/speckit.specify`

- **Problem**: O projeto não possui pipeline de autoria/regeneração de ativos reproduzível e alinhado aos orçamentos/constituição; os quadros são fixtures sintéticas e a geração é manual (sharp/ffmpeg).
- **Chosen approach**: Option B — adoção limitada como ferramentas de autoria (local-only): subconjunto vectorcraft + photocraft (designcraft opcional), build inalterado, licença MIT.
- **In scope / out of scope**: In: autoria com apps selecionados exportando para `media-src/` (SVG/PNG → re-codificação sharp para AVIF/WebP/JPEG + srcset). Out: integração no CI, filmcraft/effectcraft no runtime, todos os apps, mudança de schema/player, binários no repo.
- **Success metrics**: % quadros via pipeline (baseline 0%); ≤300 KB/quadro; ≤30 MB total; Lighthouse perf≥0.9/a11y≥0.95/CLS<0.1/LCP≤2500 ms; build reproduzível em CI (baseline: não); avaliação visual comparativa (a realizar).
- **Carried-forward open questions**:
  - [NEEDS CLARIFICATION: A reformulação atinge apenas `media-src/`/`assets/`/`story.json` (conteúdo/alt/descrições), ou também metadados narrativos e durações?]
  - [NEEDS CLARIFICATION: Qual o subconjunto mínimo de apps (proposto: vectorcraft + photocraft)?]
  - [NEEDS CLARIFICATION: A qualidade subjetiva da arte autoral supera a dos fixtures sintéticos (avaliação visual)?]
