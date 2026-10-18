# Implementation Plan: Adoção Local de Ferramentas ArtCraft para Autoria de Ativos

**Branch**: `003-artcraft-local-authoring` (feature dir) — working branch at analysis time: `feature/002-theme-switcher` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-artcraft-local-authoring/spec.md`

## Summary

Adotar a suíte ArtCraft (vectorcraft, photocraft, designcraft e outros válidos) como ferramentas **locais** de autoria de masters em `media-src/frames/` (4 frames), substituindo os fixtures sintéticos por arte autoral de alta qualidade. A produção de masters de áudio (WAV) está documentada mas fica **fora do escopo das tarefas desta feature** (follow-up). O pipeline de build existente (sharp/ffmpeg) permanece responsável pela re-codificação para os formatos de entrega (AVIF/WebP/JPEG + srcset), pelo manifesto (schema v1 congelado) e pelos orçamentos (`budget.json`). Três novos portões de build-time são adicionados a `scripts/build-images.mjs`: (a) sanitização/validação SVG, (b) verificação de digest do sidecar, (c) fidelidade Tier B (SSIM/PSNR). Um novo passo em `.github/workflows/ci.yml` (`fetch-depth: 0`) verifica trailers de commit e o bloco `review` do Tier A, fail-closed para commits que tocam `media-src/`. O player, o schema do manifesto, os orçamentos e a matriz de testes permanecem inalterados.

## Technical Context

**Language/Version**: JavaScript (ES2022), Node.js ≥20

**Primary Dependencies**: sharp (pinned), ffmpeg/ffprobe (system, ≥5), esbuild (pinned). **Nenhuma dependência nova** (FR-004/SC-005): sidecar digest via `crypto` (Node builtin), Tier B via filtros `ssim`/`psnr` nativos do ffmpeg. Schema validation (sidecar): hand-rolled, zero-dependency subset validator reusing `contracts/sidecar.schema.json`; no new entry in `package.json` (Principle II / FR-004 / SC-005). **Dependência de host**: `librsvg` é necessária para rasterização SVG por sharp (pré-requisito de host, não dependência de repo; ver U2/CC2 e T037a). Detecção no preflight: `pkg-config --exists librsvg-2.0` (fallback: probe de decode SVG via sharp). A sanitização SVG (allow-list/reject-list sobre o vocabulário vectorcraft; librsvg/sharp rasterizam) **exige um parser XML real ou um tokenizer fail-closed verificável** — regex-only é inaceitável (mXSS/parser disagreement). **Decisão (C1)**: o tokenizer fail-closed é implementado em JavaScript puro (sem nova dependência); se isso se provar inviável, a exceção de segurança deverá ser aprovada explicitamente via emenda à constituição (Princípio II) e T022b/SC-005 atualizados antes da implementação. (remediação analyze F4) Nenhuma dependência nova entra em `package.json` neste feature.

**SVG allow-list (vocabulário mínimo vectorcraft — fail-closed)**: O gate FR-002 é fail-closed sobre o seguinte vocabulário. Qualquer elemento/atributo fora desta lista é rejeitado.

- **Elementos permitidos**: `svg, g, defs, title, desc, path, rect, circle, ellipse, line, polyline, polygon, text, tspan, use, linearGradient, radialGradient, stop, clipPath, mask, pattern, symbol`
- **Atributos permitidos**: `id, class, d, x, y, x1, y1, x2, y2, cx, cy, r, rx, ry, width, height, points, transform, transform-origin, fill, fill-opacity, fill-rule, stroke, stroke-width, stroke-opacity, stroke-linecap, stroke-linejoin, stroke-dasharray, stroke-dashoffset, stroke-miterlimit, opacity, viewBox, preserveAspectRatio, xmlns, xmlns:xlink, font-family, font-size, font-weight, font-style, text-anchor, dominant-baseline, letter-spacing, gradientUnits, gradientTransform, offset, stop-color, stop-opacity, clip-path, mask, patternUnits, patternTransform, href, xlink:href (fragment-only)`
- **Rejeitados**: qualquer elemento/atributo não listado; `href`/`xlink:href` deve ser fragment-only `#…` (absoluto, protocol-relative, caminho relativo e `data:` rejeitados).
- **Nota**: Vocabulário inicial a ser validado contra um export real do vectorcraft antes de implementar o gate. `marker-start/mid/end` foram removidos (sem elemento `marker` na allow-list — atributos mortos); re-adicionar (junto com `marker` + `markerWidth/Height/Units/refX/refY/orient`) se um export real emitir `<marker>`. O gate também aplica um orçamento de expansão de referências (`<use>`/`<pattern>`: `maxExpandedReferences` ≈ 100 000, `maxReferenceDepth` ≈ 20, rejeitar ciclos) além dos caps estáticos, e não pode ser apenas regex — usa-se parser XML real ou tokenizer fail-closed verificável, re-serializando bytes canônicos. Sidecars vivem ao lado do ativo, fora da árvore publicável, em `media-src/` e `marketing/`. O valor `oversight` é project-defined (`human_authored`/`human_assisted`/`human_reviewed`), não os valores C2PA.

**Quality thresholds (centralized in `scripts/delivery-fidelity.mjs`)**:
- Tier B SSIM: ≥ 0.95 (standard) / ≥ 0.90 (light); PSNR ≥ 30 dB; standard fail-fast, light warn-only.
- Tier B invocation (native filters, no new dependency): `ffmpeg -i <variant> -i <ref.png> -lavfi "ssim=...,psnr=..." -f null -`; referência PNG lossless gerada por sharp sob `build/` (mesmo filesystem). Comparação por largura de entrega (nunca contra o master em tamanho nativo).
- Quality floors: standard AVIF ≥ 30 / WebP ≥ 45 / JPEG ≥ 45; light AVIF ≥ 20 / WebP ≥ 30 / JPEG ≥ 30 (throw naming the frame).
- Canvas: 1200×800 px (3:2); rigid ceiling ≤ 2560 px for any master.

**Storage**: Arquivo — `media-src/` (masters + sidecars), `assets/` (saída gerada), `build/` (scratch Tier B, git-ignored). Sem banco de dados.

**Testing**: Node native test runner (`node --test tests/unit/*.test.js`), Playwright e2e/perf (5 projetos; + cobertura DPR>1 via `tests/e2e/artcraft-dpr.spec.js` para verificar nitidez por upscaling). Testes Node (sob `tests/unit/`, rodados pelo runner nativo) cobrem os arquivos existentes (`delivery.test.js`, `integrity-media.test.js`, `media-generation.test.js`) e os novos gates da feature (`svg-sanitize.test.js`, `sidecar.test.js`, `delivery-fidelity.test.js`, `build-images-gates.test.js`, `atomic-write.test.js` — unitários puros; `artcraft-authoring.test.js`, `artcraft-svg-gate.test.js`, `artcraft-sidecar.test.js`, `artcraft-fidelity.test.js`, `artcraft-trailers.test.js`, `artcraft-absence.test.js`, `story-metadata.test.js` — integração via diretório temporário) + helper `property-helpers.mjs` — 12 arquivos de teste Node novos + 1 helper (`property-helpers.mjs`) (+ 3 pre-existentes atualizados: delivery.test.js, integrity-media.test.js, media-generation.test.js) + 1 spec E2E (U2). `artcraft-*` com sufixo `-gate`/`-sidecar`/`-fidelity` são testes de integração do fluxo de build, não unitários puros, embora residam em `tests/unit/`.

**Target Platform**: Linux (CI ubuntu-latest), macOS (manutenção local). Fedora: webkit não roda localmente (CI-enforced).

**Project Type**: Static web application (vanilla ES modules, sem framework). Entry: `src/scripts/main.js`.

**Performance Goals**: LCP ≤ 2500 ms, CLS ≤ 0.1, frame budget ≤ 300 000 B, total assets ≤ 30 000 000 B, Lighthouse perf ≥ 0.9, a11y ≥ 0.95. Nenhum gate é alterado por esta feature.

**Constraints**: Sem dependências novas em `package.json`; nenhum binário ArtCraft no repo/CI; `npm run ci` deve rodar sem a suíte instalada; `budget.json` congelado; schema v1 do manifesto congelado; `media-src/` e `assets/` continuam separação rígida (masters nunca publicados, `findUnreferencedAssets === []`).

**Scale/Scope**: 4 frames (frame-01…frame-04) autoralizados. Escopo de autoria: `media-src/frames/`. A produção de masters de áudio (WAV) está documentada mas fica **fora do escopo das tarefas desta feature** (follow-up). Arte promocional (designcraft) vive em `marketing/`, fora do pipeline.

**Success-criteria mechanism**: Tier B computes delivery fidelity with the pipeline's native metrics (ffmpeg `ssim`/`psnr`) against a lossless PNG reference of the master at each delivery width; Tier A is a documented human-review protocol with a binary `approve`/`reject` decision. These mechanisms were moved out of the spec's success criteria (SC-007a/SC-007b) into the plan.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Justificativa |
|:---|:---:|:---|
| I. Experiência Cinematográfica | ✅ PASS | Player, transições, ritmo e navegação inalterados. A feature afeta apenas a qualidade dos masters de entrada. |
| II. Médium Definido (HTML/CSS/JS + quadros de imagem) | ✅ PASS | Nenhum vídeo/motion/engine adicionado ao runtime. Masters SVG são rasterizados por sharp. `soundcraft` (pre-alpha) não é usado. `filmcraft`/`effectcraft` excluídos por tipo de saída. |
| III. Mobile-First e Responsividade Universal | ✅ PASS | Sem mudança de layout. Canvas 1200×800 (3:2) é a geometria declarada no manifesto e a maior largura entregue (srcset). |
| IV. Performance e Orçamento de Ativos | ✅ PASS | `budget.json` congelado. Canvas de autoria 1200×800 mantém headroom. Gate de fidelidade Tier B usa ffmpeg existente (sem nova dependência). Piso de qualidade explícito previne degradação silenciosa. |
| V. Qualidade Visual e Sonora | ✅ PASS | Todos os 4 frames autoralizados (Princípio V exige coerência de estilo/resolução/paleta — verificação documentada Tier A). Áudio permanece WAV de DAW estável, pipeline inalterado. |
| VI. Controle do Usuário e Acessibilidade | ✅ PASS | Player e UI inalterados. `alt`/`description` seguem regra F20 (atualizados no mesmo change). WCAG 1.2.1: áudio decorativo via 1.1.1 + 1.4.2 (já implementado). Áudio "iniciar ativo por padrão" (v2.0.0) permanece inalterado e honrado pelo AudioManager existente. |

**Constitution Check Result**: ✅ ALL PASS — sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/003-artcraft-local-authoring/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── research/clarifications/ # Batch 9–10 primary-source research (SVG refs, quality floor, srcset, success criteria)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── sidecar.schema.json   # JSON Schema do sidecar de proveniência
└── tasks.md             # Phase 2 output (NOT created by plan command)
```

### Source Code (repository root)

```text
src/
├── data/story.json           # Manifesto (schema v1, congelado)
├── scripts/
│   ├── main.js               # Boot (inalterado)
│   ├── player.js             # CinematicPlayer (inalterado)
│   ├── audio.js              # AudioManager (inalterado)
│   ├── story-loader.js       # Validação do manifesto (inalterado)
│   ├── safe-reference.js     # Fonte canônica de isSafeLocalReference (consolidada em T011c)
│   ├── light-variants.js     # Nomenclatura -light-* (inalterado)
│   ├── storage.js            # localStorage + BroadcastChannel (inalterado)
│   ├── capabilities.js       # Detecção de degradação (inalterado)
│   └── a11y.js               # AccessibilityController (inalterado)
└── styles/                   # CSS (inalterado)

scripts/
├── preflight.mjs             # MODIFICADO: + check de host librsvg (pkg-config), T037a (remediação analyze C1)
├── validate-manifest.mjs     # Schema + refs (inalterado)
├── compatibility-report.mjs  # Relatório permissivo (inalterado)
├── build-images.mjs          # MODIFICADO: + sanitização SVG (+ caps DoS), + digest sidecar (+ órfão), + Tier B, + piso de qualidade, + escrita atômica
├── build.mjs                 # inalterado neste feature quanto a OG/social copy (nenhum passo de cópia de imagem OG/social é adicionado — fora de escopo per clarificação batch 2); trailers/review vivem no step de `ci.yml`, nunca aqui. Consolidação de `isSafeLocalReference` (import-only reexport) já aplicada em T011c (concluída; `npm run test:unit` verde); sem mudança de comportamento.
├── svg-sanitize.mjs        # NOVO: gate de sanitização/validação SVG (FR-002)
├── sidecar.mjs             # NOVO: verificação de digest do sidecar (FR-008)
├── delivery-fidelity.mjs   # NOVO: portão Tier B SSIM/PSNR (FR-007)
├── atomic-write.mjs        # NOVO: escrita atômica write-temp→rename (FR-013d)
├── ci-trailers.mjs        # NOVO: validação fail-closed de trailers/review (FR-013)
└── serve-e2e.mjs             # Servidor HTTP Range (inalterado)

media-src/
├── frames/                   # Masters autorais (SVG/PNG/JPG) + sidecars .json
└── audio/                    # Masters WAV + sidecars .json

build/                        # Scratch Tier B (git-ignored, NUNCA em assets/)
docs/
├── delivery.md               # Contrato de saída (inalterado)
├── authoring.md              # NOVO: fluxo de autoria ArtCraft
├── authoring-accessibility.md # Companheiro: regra F20 de alt/description/durationMs (criado por T038a — concluído)
└── image-quality-assessment.md  # Referência de qualidade (existe)

marketing/                    # NOVO: arte promocional (designcraft), fora do pipeline
.github/workflows/
└── ci.yml                    # MODIFICADO: + step trailers/review (fetch-depth: 0)

tests/
├── unit/                     # Node native (modificados: build-images gates)
├── e2e/                      # Playwright (inalterados)
├── perf/                      # Playwright (inalterados)
└── fixtures/                 # Fixtures sintéticos (permanecem válidos para regressão)

budget.json                   # Congelado
package.json                  # Deps pinadas inalteradas; scripts npm opcionais (ex.: clean:assets, T005) permitidos (remediação analyze B3)
```

**Structure Decision**: Estrutura existente preservada. Três portões de build-time e a escrita atômica são adicionados a `scripts/build-images.mjs` (único módulo que enxerga masters e variantes simultaneamente). O passo de trailers/review é adicionado como step separado em `ci.yml` (nunca em `npm run ci`). `docs/authoring.md` é criado como documentação do fluxo. `marketing/` é criado fora de `assets/` e `media-src/`. `build/` é criado como scratch Tier B (já em `.gitignore`). A tarefa opcional T005 (`clean:assets`) é um script npm opcional de manutenção, fora do pipeline e fora de `budget.json`; pode ser omitida sem impacto (não requerido por nenhum FR/SC).

## Complexity Tracking

| Added Complexity | Justification (Princípio II — Médium Definido) |
|:---|:---|
| 3 build-time gates (SVG sanitize, sidecar digest, Tier B fidelity) | Operam exclusively at build time sobre masters em `media-src/`; nenhum código novo no runtime/player. Masters SVG são rasterizados por sharp (já dependência existente). |
| 5 new scripts modules | Invoked by existing build-images.mjs; sem dependências novas (sharp, ffmpeg, crypto builtin). |
| CI step (trailers/review enforcement) | Step separado em ci.yml; não altera npm run ci nem o pipeline core. |
| Atomic write pattern | Write-temp→rename no mesmo filesystem; sem dependências externas. |
| OG/social image copy step (out of scope) | Nenhum passo de cópia de imagem OG/social é adicionado a `build.mjs` neste feature (T005b); se necessário no futuro, requer alteração explícita de `build.mjs` e atualização de `budget.json` (I2). |

## Analyze Remediation Notes (2026-10-18)

- **U1 (SVG allow-list)**: final vocabulary is validated in T011b against a real vectorcraft export; synthetic fallback is permitted only with the risk recorded as mandatory in T045 and revalidation on the first real export.
- **U2 (trailer base SHA)**: the forward-only enforcement base is computed at implementation time via `git merge-base HEAD <default-branch>` and recorded in `docs/authoring.md` (section "Rastreabilidade"); pre-existing commits are grandfathered.
- **U4 (atomic write scratch)**: `build/` is created with `mkdirSync(..., { recursive: true })` in `build-images.mjs` (T002 complement) so clean checkouts do not fail.
- **D1 (clarifications)**: normative decisions remain authoritative in FR/SC; the clarification batches are retained for traceability only.
- **A1/A3/A4/A5/A6/G1/G2/G3**: tracked as explicit blockers/gaps in T045 (see spec.md "External dependencies & tooling gaps").
- **A2 (HIGH)**: T028 permanece bloqueador externo (autoria humana); T045 atesta via sidecar `review.decision: approve` + trailers `Authored-With`/`Reviewed-By` e evidência Tier A por master (tamanho, formato, impressão qualitativa, paleta/intervalo tonal).
- **A3 (HIGH)**: pré-condição G1 (viabilidade do tokenizer fail-closed em JS puro) deve ser executada antes de T023; se inviável, abrir emenda à constituição (Princípio II) e atualizar T022b/SC-005 antes de prosseguir.
- **G3 (MEDIUM)**: SC-006 (Lighthouse) verificada apenas via T044a; registrar como bloqueador rastreado em T045 se Chrome estiver indisponível (sem silenciamento).
