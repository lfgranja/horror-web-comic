# Implementation Plan: Experiência Cinematográfica Psicológica com Micro-Sobressaltos Opt-in

**Branch**: `005-korean-horror-mechanics` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-korean-horror-mechanics/spec.md`

---

## Summary

Implementar mecânicas de terror psicológico coreano (manhwa) opt-in: consentimento sensorial prévio (diálogo modal `#sensory-dialog`), modo seguro/imersivo persistido globalmente, catálogo multi-histórias (`src/data/catalog.json`) com pontos de entrada estáticos (`index.html`, `alojamento.html`), ilusão de memória perceptiva (`memoryIllusion`) com trava de pesadelo em `sessionStorage`, silêncio dinâmico (Shock Drop) no `AudioManager`, validação transitiva de manifestos no build, e fotossensibilidade AAA (≤3 Hz, ΔL ≤ 0.05). Preservar SC-018 (transition app frames = 0) e WCAG 2.2 AAA.

## Technical Context

**Language/Version**: JavaScript (ES2022, vanilla ES modules), Node.js ≥20.0.0, CSS3
**Primary Dependencies**: esbuild, sharp, ffmpeg (build); fast-check (tests); Playwright (e2e). Zero novas dependências de runtime.
**Storage**: localStorage (`hwc.sensoryMode`, `hwc.progress:${storyId}`), sessionStorage (`hwc.latched:${storyId}`), BroadcastChannel (`hwc:sensory`).
**Testing**: Node native (`node --test`), Playwright matrix (5 projects), property-based (fast-check).
**Target Platform**: Static site, Linux CI, macOS/Windows dev.
**Performance Goals**: LCP ≤2.5s, transition app frames = 0, sting silence ≤40ms, payload budgets.
**Constraints**: No infinite animations, no rAF during transitions, safe local refs only, budgets hard limits.

## Constitution Check

- Princípio I (Cinematográfico): preservado (frames sequenciais, coalescing).
- Princípio II (HTML/CSS/JS/imagens): preservado (CSS GPU, sem frameworks).
- Princípio III (Mobile-first): preservado.
- Princípio IV (Performance/budgets): preservado (build budgets).
- Princípio V (Áudio ativo por padrão): preservado (sting gerenciado, mute imediato).
- Princípio VI (Acessibilidade): preservado (WCAG 2.2 AAA, reduced-motion).

## Project Structure

```
src/data/catalog.json
src/data/stories/o-alojamento.json
src/scripts/sensory-taxonomy.js
src/scripts/sensory-mode.js (optional, may fold into player)
index.html (updated)
alojamento.html (new entry)
src/styles/*.css (updated)
scripts/build.mjs, validate-manifest.mjs (updated)
```

## Phases

- Phase 0: Research (decisions in spec clarifications) — done.
- Phase 1: Design (data-model, contracts) — this plan.
- Phase 2: Implementation waves (foundational → stories → polish).

## Complexity Tracking

Nenhuma violação constitucional justificada além das exceções documentadas (Tier B light warn-only).