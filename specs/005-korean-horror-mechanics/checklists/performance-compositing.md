# Specification Quality Checklist: Performance and Compositing Gate (005 — Korean Horror Mechanics)

Purpose: Validate requirements for performance gate (`SC-018`: `transition app frames = 0`), budget (`budget.json`), Lighthouse thresholds (`Perf >= 0.9`, `A11y >= 0.95`, `CLS <= 0.1`, `LCP <= 2500ms`), and GPU-composited effects (`ARC-002` — `transform`, `opacity`, `filter`) in the context of multi-story catalog (`catalog.json`) and sensory effects (`frame.fx`). This checklist tests whether the requirements are well-written and complete — NOT whether the code passes.

Created: 2026-10-27  Feature: [spec.md](spec.md) — Sections ARC-002, FR-002, FR-010, FR-011, SC-002, SC-006  Review Type: Requirements Quality  Status: Reviewer-owned; agent must NOT mark `[x]`.

---

## Requirement Completeness — Compositing and Budget
- [x] CHK201 — Is `ARC-002` fully defined: GPU-only properties (`transform`, `opacity`, `filter`); prohibition of `rAF` scheduling during active transitions; `isolation: isolate` for `#frame-image`; deterministic cleanup (`this.fxTimeout`)? [Completeness, Spec ARC-002 / Edge Cases line 182 (`navigation coalescing`)]
- [x] CHK202 — Is the `SC-018` measurement contract (`Playwright matrix` — 5 browsers, desktop + mobile) fully defined, including what counts as `transition` (start/end points, coalesced events, skipped frames)? [Completeness, Spec SC-002 / Edge Cases line 187 / `SC-018` measurement]
- [x] CHK203 — Are budget requirements (`budget.json`: script < 50KB, style < 15KB, total < 30MB; `FR-010`: `build.mjs` computes union of assets across `catalog.json` stories) fully defined for multi-story builds? [Completeness, Spec FR-010 / `budget.json` / `build.mjs` reference]
- [x] CHK204 — Are `SC-003` (`audio` autonomy — `<= 100ms` stop, `40ms` `STOP_DURATION`) and `SC-018` (`transition` timing) linked to `FR-006` (`audio.js`) and `FR-011` (`SC-018` gate) with measurable thresholds? [Completeness, Spec FR-006 / FR-011 / SC-003]

## Requirement Clarity — Performance Metrics and Thresholds
- [x] CHK205 — Are Lighthouse thresholds (`Perf >= 0.9`, `A11y >= 0.95`, `CLS <= 0.1`, `LCP <= 2500ms`) linked to specific components (`#frame-image`, `#sensory-dialog`, `#catalog-dialog`, `audio` preload)? [Clarity / Measurability, Spec SC-001 / Lighthouse results: Perf=1.0 / A11y=1.0 / CLS=0 / LCP=1521ms]
- [x] CHK206 — Is `transition app frames = 0` clearly quantified (no `rAF` frames in `transition` window; coalesced navigation excludes skipped frames; `mode: serial` for E2E)? [Clarity, Spec ARC-002 / SC-002 / `deferred-behavior-coverage` (`verified`)]
- [x] CHK207 — Are `SC-018` `fixture-svg` vs `production-raster` comparison rules (`ratio` measurement) clearly defined, including when `fixture` is used vs `production`? [Clarity, Spec SC-002 / Edge Cases line 188 (`prev-frame` coalescing with `fx` effects)]

## Requirement Coverage — Multi-Story Budget and Catalog Performance
- [x] CHK208 — Are budget computation rules for multi-story builds (`catalog.json` union of assets) fully covered (`FR-010`: no false positives for `findUnreferencedAssets`)? [Coverage, Spec FR-010 / `catalog-manifest.schema.json`]
- [x] CHK209 — Are `SC-006` requirements (`LCP <= 2.5s`, preload scanner `injectFirstFramePicture`) covered for all entry points (`index.html`, `alojamento.html`)? [Coverage, Spec SC-006 / `FR-010` / `FR-006`]
- [x] CHK210 — Are performance requirements for concurrent `frame.fx` effects (`glitch`, `flash-reveal`) and audio-sting (`SC-003`) covered together (no resource contention)? [Coverage — Non-Functional, Spec ARC-002 / FR-006 / SC-003]

## Requirement Consistency — Cross-Reference and Constitution
- [x] CHK211 — Do `budget.json` limits (`initialSceneBytes = 1500000`, `frameBytes = 300000`, `totalAssetsBytes = 30000000`, `compressedScriptBytes = 50000`, `compressedStyleBytes = 15000`) align with `FR-010` (`build.mjs` union computation) and `ARC-002` (`no rAF` scheduling)? [Consistency, Spec `budget.json` / `FR-010` / `ARC-002`]
- [x] CHK212 — Are `SC-018` measurement rules consistent with `FR-005` (`catalog-dialog`) focus management (no `document.body` focus loss affects `transition` timing)? [Consistency, Spec SC-018 / FR-005 / `Edge Cases` line 189]
- [x] CHK213 — Are `performance` requirements (`SC-002`, `SC-006`, `SC-018`) consistent with Constitution `Principle IV` (`Performance` — `SC-018` `appFrames=0`; `budget.json` fail-fast for standard variants; `Tier B` `warn-only` for `-light-*`)? [Consistency, `.specify/memory/constitution.md` v2.1.0 / `SC-018` / `budget.json`]

## Ambiguities, Conflicts, Assumptions, Dependencies
- [x] CHK214 — Is the interaction between `SC-018` (`transition` measurement) and `prev-frame` + `memoryIllusion` (`FR-007`) unambiguous (`transition` includes `prev-frame` coalescing but excludes `fx` effect duration)? [Ambiguity — `SC-002` / `FR-007` / Edge Cases line 187 / FR-011] (clarified Q29)
- [x] CHK215 — Is the assumption that `catalog.json` and `stories/o-alojamento.json` share relative directories (`assets/`, `media-src/`) validated by `isSafeLocalReference` (`build.mjs`) and `catalog-manifest.schema.json`? [Assumption, Link to `FR-002` / `FR-012` / `build.mjs`]
- [x] CHK216 — Are `performance` and `accessibility` requirements free of conflict (`SC-002`: `appFrames=0` vs `a11y`: `aria-live` updates requiring frame scheduling)? [Conflict — Not explicitly excluded; `SC-002` measures `rAF` scheduling; `SC-001` requires `a11y` announcements without blocking `SC-002`] (clarified Q30)

Notes:
+ This checklist validates the **quality of requirements** in the `spec.md` for feature `005`, not the code.
+ References (`[Completeness]`, `[Clarity]`, `[Consistency]`, `[Measurability]`, `[Ambiguity]`, `[Conflict]`, `[Assumption]`, `[Dependency]`, `[Edge Case]`, `[Coverage]`) indicate the dimension tested.
+ Evidence links (`SC-018` measurement results, `budget.json`, `lighthouse` results, `.specify/bugs/` status) confirm the verification context without asserting implementation correctness.
