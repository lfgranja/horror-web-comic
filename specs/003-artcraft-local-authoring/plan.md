# Implementation Plan: Adoção Local de Ferramentas ArtCraft para Autoria de Ativos

**Branch**: `003-artcraft-local-authoring` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-artcraft-local-authoring/spec.md`

## Summary

Adotar a suíte ArtCraft (vectorcraft, photocraft, designcraft e outros válidos) como ferramentas **locais** de autoria de masters em `media-src/frames/` e `media-src/audio/`, substituindo os fixtures sintéticos por arte autoral de alta qualidade. O pipeline de build existente (sharp/ffmpeg) permanece responsável pela re-codificação para os formatos de entrega (AVIF/WebP/JPEG + srcset, AAC/Opus), pelo manifesto (schema v1 congelado) e pelos orçamentos (`budget.json`). Três novos portões de build-time são adicionados a `scripts/build-images.mjs`: (a) sanitização/validação SVG, (b) verificação de digest do sidecar, (c) fidelidade Tier B (SSIM/PSNR). Um novo passo em `.github/workflows/ci.yml` (`fetch-depth: 0`) verifica trailers de commit e o bloco `review` do Tier A, fail-closed para commits que tocam `media-src/`. O player, o schema do manifesto, os orçamentos e a matriz de testes permanecem inalterados.

## Technical Context

**Language/Version**: JavaScript (ES2022), Node.js ≥20

**Primary Dependencies**: sharp (pinned), ffmpeg/ffprobe (system, ≥5), esbuild (pinned). **Nenhuma dependência nova** — sanitização SVG via allow-list/reject-list sobre o vocabulário emitido pelo vectorcraft (librsvg/sharp já rasterizam), Sidecar digest via `crypto` (Node builtin), Tier B via filtros `ssim`/`psnr` nativos do ffmpeg.

**Storage**: Arquivo — `media-src/` (masters + sidecars), `assets/` (saída gerada), `build/` (scratch Tier B, git-ignored). Sem banco de dados.

**Testing**: Node native test runner (`node --test tests/unit/*.test.js`), Playwright e2e/perf (5 projetos; + cobertura DPR>1 para verificar nitidez por upscaling). Testes unitários cobrem os arquivos existentes (`delivery.test.js`, `integrity-media.test.js`, `media-generation.test.js`) e os novos gates da feature (`svg-sanitize.test.js`, `sidecar.test.js`, `delivery-fidelity.test.js`, `build-images-gates.test.js`, `atomic-write.test.js`, `artcraft-authoring.test.js`, `artcraft-svg-gate.test.js`, `artcraft-sidecar.test.js`, `artcraft-fidelity.test.js`, `artcraft-trailers.test.js`).

**Target Platform**: Linux (CI ubuntu-latest), macOS (manutenção local). Fedora: webkit não roda localmente (CI-enforced).

**Project Type**: Static web application (vanilla ES modules, sem framework). Entry: `src/scripts/main.js`.

**Performance Goals**: LCP ≤ 2500 ms, CLS ≤ 0.1, frame budget ≤ 300 000 B, total assets ≤ 30 000 000 B, Lighthouse perf ≥ 0.9, a11y ≥ 0.95. Nenhum gate é alterado por esta feature.

**Constraints**: Sem dependências novas em `package.json`; nenhum binário ArtCraft no repo/CI; `npm run ci` deve rodar sem a suíte instalada; `budget.json` congelado; schema v1 do manifesto congelado; `media-src/` e `assets/` continuam separação rígida (masters nunca publicados, `findUnreferencedAssets === []`).

**Scale/Scope**: 4 frames (frame-01…frame-04) autoralizados + áudio ambiente existente. Escopo de autoria: `media-src/frames/` + `media-src/audio/`. Arte promocional (designcraft) vive em `marketing/`, fora do pipeline.

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
│   ├── light-variants.js     # Nomenclatura -light-* (inalterado)
│   ├── storage.js            # localStorage + BroadcastChannel (inalterado)
│   ├── capabilities.js       # Detecção de degradação (inalterado)
│   └── a11y.js               # AccessibilityController (inalterado)
└── styles/                   # CSS (inalterado)

scripts/
├── preflight.mjs             # Gate de ambiente (inalterado)
├── validate-manifest.mjs     # Schema + refs (inalterado)
├── compatibility-report.mjs  # Relatório permissivo (inalterado)
├── build-images.mjs          # MODIFICADO: + sanitização SVG (+ caps DoS), + digest sidecar (+ órfão), + Tier B, + piso de qualidade, + escrita atômica
├── build.mjs                 # MODIFICADO (condicional): + copy step de OG/social em `dist/` (spec.md:45); trailers/review vivem no step de `ci.yml`, nunca aqui
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
package.json                  # Deps pinadas inalteradas
```

**Structure Decision**: Estrutura existente preservada. Três portões de build-time e a escrita atômica são adicionados a `scripts/build-images.mjs` (único módulo que enxerga masters e variantes simultaneamente). O passo de trailers/review é adicionado como step separado em `ci.yml` (nunca em `npm run ci`). `docs/authoring.md` é criado como documentação do fluxo. `marketing/` é criado fora de `assets/` e `media-src/`. `build/` é criado como scratch Tier B (já em `.gitignore`).

## Complexity Tracking

| Added Complexity | Justification (Princípio II — Médium Definido) |
|:---|:---|
| 3 build-time gates (SVG sanitize, sidecar digest, Tier B fidelity) | Operam exclusively at build time sobre masters em `media-src/`; nenhum código novo no runtime/player. Masters SVG são rasterizados por sharp (já dependência existente). |
| 5 new scripts modules | Invoked by existing build-images.mjs; sem dependências novas (sharp, ffmpeg, crypto builtin). |
| CI step (trailers/review enforcement) | Step separado em ci.yml; não altera npm run ci nem o pipeline core. |
| Atomic write pattern | Write-temp→rename no mesmo filesystem; sem dependências externas. |
