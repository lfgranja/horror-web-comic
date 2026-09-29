# Implementation Plan: Player Cinematográfico de Quadros

**Branch**: `001-cinematic-player` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cinematic-player/spec.md`

## Summary

Construir uma experiência web estática e enxuta que exibe uma história em
quadros de terror como uma sequência cinematográfica: avanço automático por
padrão, com ritmo definido por quadro/cena pelo autor, e controle manual completo
(quadro a quadro, salto por cena, voltar ao início). O progresso é preservado
entre visitas. O áudio é de primeira classe, inicia ativo por padrão, respeita a
política de reprodução automática do navegador, é instantaneamente desativável e
tem a preferência persistida. Tudo implementado apenas com HTML, CSS e JavaScript
vanilla (Princípio II da constituição), mobile-first e otimizado.

## Technical Context

**Language/Version**: HTML5, CSS3 (custom properties, media/container queries),
JavaScript ES2022 (vanilla, ES modules)

**Primary Dependencies**: Nenhuma em runtime. Ferramentas de desenvolvimento:
Playwright (E2E e viewports móveis), Lighthouse CI (orçamentos de performance),
esbuild (minificação/cache-busting), sharp (pipeline de imagens AVIF/WebP).

**Storage**: `localStorage` do navegador para preferência de áudio e posição de
leitura. Sem backend.

**Testing**: Playwright para fluxos E2E e verificação responsiva; Lighthouse CI
para orçamentos; testes manuais em dispositivo móvel real.

**Target Platform**: Navegadores modernos — Chrome, Firefox e Safari (desktop) e
Chrome/Safari móveis; hospedagem estática de qualquer provedor.

**Project Type**: Single project — frontend estático puro.

**Performance Goals** (fonte única: SC-008, SC-014, SC-015, SC-018, SC-019,
SC-020): primeiro quadro em < 2,5 s em 4G de referência (p75, cache frio —
SC-019) e < 1,5 s em cache aquecido; cada quadro visível em < 3 s (SC-008);
transições que não custam o compositor — ≥ 90% da taxa de quadros do próprio
host, com a variante literal ≥ 60 fps no aparelho de referência fora do alcance do
CI (SC-018); cena inicial ≤ 1,5 MB, cada quadro ≤ 300 KB e
total ≤ 30 MB (SC-014); orçamento de código comprimido ≤ 65 KB (≤ 50 KB de script
e ≤ 15 KB de estilo), verificado no build (Delivery Standards); estabilidade de
layout < 0,1 (SC-015). Medição em laboratório
(Lighthouse CI) com `budget.json`; dados de campo (CrUX) quando disponíveis.

**Constraints**: Sem backend/runtime de servidor; funcional com reprodução
automática de áudio bloqueada; respeitar `prefers-reduced-motion`; layout
utilizável de 320 px a 2560 px; acessível por teclado e leitores de tela.

**Scale/Scope**: Narrativa linear única; ordem de dezenas a ~100 quadros
agrupados em cenas; um player; controles (incl. volume, velocidade, ir ao
fim), áudio (mix quadro+cena, crossfade), persistência sincronizada entre abas
e acessibilidade AAA.

**Delivery Standards**: Imagens AVIF (primário), WebP (intermediário) e JPEG
(fallback), máx. 2560 px, com padrão de compressão: AVIF `cq-level ≈ 18`
(qualidade ≈ 50), WebP `q ≈ 75`, JPEG `q ≈ 80`; variante leve (≤ 150 KB/quadro,
maior lado ≤ 1280 px) para economia de dados (FR-031/SC-020); áudio AAC/Opus a
96–128 kbps (~48–64 kbps sob economia de dados); metadados de título, descrição e
Open Graph (SC-021); matriz de navegadores (últimas versões de Chrome, Firefox,
Safari desktop e Chrome/Safari móveis) declarada e testada (SC-022); validador de
integridade referencial do manifesto no build/CI (SC-016). Orçamento de código
comprimido ≤ 65 KB (≤ 50 KB de script e ≤ 15 KB de estilo), verificado no build.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra a constituição v2.0.0:

| Princípio | Avaliação | Evidência no plano |
|-----------|-----------|--------------------|
| I. Experiência Cinematográfica (NÃO NEGOCIÁVEL) | PASS | Quadros sequenciados com ritmo por quadro/cena e transições; player híbrido |
| II. Médium HTML/CSS/JS/Imagens | PASS | Sem frameworks, vídeo ou motores; JS vanilla |
| III. Mobile-First e Responsividade | PASS | CSS mobile-first; toque e teclado; 320–2560 px |
| IV. Performance e Orçamento (NÃO NEGOCIÁVEL) | PASS | AVIF/WebP, `srcset`, lazy/preload, minificação, orçamentos |
| V. Qualidade Visual e Sonora | PASS | Áudio ativo por padrão, desativável, preferência persistida, autoplay respeitado |
| VI. Controle do Usuário e Acessibilidade | PASS | reduced-motion, teclado, descrições detalhadas, pausa/retomada |
| Restrições Técnicas e Padrões de Entrega | PASS | Site estático, matriz de navegadores, metadados, sem rastreadores |
| Fluxo de Desenvolvimento e Portões de Qualidade | PASS | Portões de responsividade, performance e áudio definidos |

Sem violações — `Complexity Tracking` permanece vazio.

## Project Structure

### Documentation (this feature)

```text
specs/001-cinematic-player/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
│   ├── story-manifest.schema.json
│   ├── player-ui-contract.md
│   └── storage-contract.md
└── tasks.md             # Fase 2 (/speckit.tasks — criado; ver tasks.md)
```

### Source Code (repository root)

```text
index.html

src/
├── styles/
│   ├── tokens.css       # design tokens (cores, tipografia, espaçamento)
│   ├── base.css         # reset, layout, mobile-first
│   └── player.css       # palco, transições, controles
├── scripts/
│   ├── main.js          # bootstrap
│   ├── player.js        # máquina de estados + avanço/navegação
│   ├── audio.js         # gestão de áudio e autoplay policy
│   ├── storage.js       # persistência (áudio + progresso)
│   ├── story-loader.js  # carrega e valida o manifesto
│   ├── capabilities.js  # saveData / deviceMemory / hardwareConcurrency (FR-031)
│   └── a11y.js          # aria-live, teclado, reduced-motion
└── data/
    └── story.json       # manifesto da narrativa (Fase de conteúdo)

assets/
├── frames/              # quadros AVIF/WebP responsivos
├── audio/               # trilhas por cena
└── icons/

scripts/                 # build tooling (esbuild, sharp, validador, check de origens)
docs/
└── delivery.md          # padrões de entrega + matriz de navegadores (T051)

tests/
├── e2e/                 # Playwright
├── perf/                # gates de FPS e primeiro quadro (T054a, T064a)
└── fixtures/            # story de teste
```

**Structure Decision**: Projeto único estático. O conteúdo narrativo fica
separado do código (`src/data/story.json` + `assets/`), permitindo que o autor
ajuste ritmo, cenas, áudio e descrições sem tocar na lógica do player.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (nenhuma) | — | — |

## Post-Design Constitution Re-Check (Fase 1)

Após o desenho de `data-model.md`, `contracts/` e `quickstart.md`, os oito itens
acima permanecem **PASS**. O manifesto JSON, os contratos de UI/armazenamento e o
guia de validação não introduzem dependências de runtime, mantendo o Princípio II
e os orçamentos do Princípio IV.
