# Specification Quality Checklist: Catalog Architecture and Multi-Story Entry (005 — Korean Horror Mechanics)

Purpose: Validate requirements for `catalog.json`, `catalog-manifest.schema.json`, multi-page static entries (`index.html`, `alojamento.html`), `build.mjs` (`findUnreferencedAssets`, `injectFirstFramePicture`), `entryHtml`, and `StoryProgressRecord` (`hwc.progress:${storyId}`). Requirements-quality checklist.

Created: 2026-10-27  Feature: [spec.md](spec.md) — Sections ARC-003, FR-002, FR-003, FR-005, FR-010, FR-012, FR-014  Review Type: Requirements Quality  Status: Reviewer-owned; agent must NOT mark `[x]`.

---

## Requirement Completeness — Catalog Manifest
- [x] CHK301 — Are `catalog.json` schema fields (`schemaVersion`, `catalogTitle`, `defaultStoryId`, `stories[]` with `id`, `slug`, `title`, `synopsis`, `entryHtml`, `manifest`, `coverImage`, `sensoryAdvisory`) fully defined with required vs optional distinction? [Completeness, Spec Key Entities / `catalog-manifest.schema.json`] (clarified Q24: required vs optional list)
- [x] CHK302 — Are `entryHtml` values (`index.html`, `alojamento.html`) explicitly mapped to dedicated `dist/` outputs (`dist/index.html`, `dist/alojamento.html`) with same-bundle sharing? [Completeness, Spec ARC-003 / FR-010]
- [x] CHK303 — Are `manifest` references (`src/data/story.json`, `src/data/stories/o-alojamento.json`) validated transitively (`build.mjs` + `validate-manifest.mjs`) for schema, `isSafeLocalReference`, and asset existence? [Completeness, Spec ARC-003 / FR-002]
- [x] CHK304 — Is `StoryProgressRecord` (`hwc.progress:${storyId}`) fully typed (`frameId`, `frameIndex`, `totalFrames`, `ended`, `updatedAt`, `seq`, `tabId`) and linked to `catalog-dialog` progress bars and replay/start actions? [Completeness, Spec Key Entities — `StoryProgressRecord` / FR-005 / FR-014]

## Requirement Clarity — Catalog and Catalog-Dialog Accessibility
- [x] CHK305 — Is `#catalog-dialog` defined with unambiguous accessibility rules (`role="dialog"`, `aria-modal="true"`, `Escape` close, focus trap) and consistent with `#sensory-dialog` contract (`FR-003`)? [Clarity / Consistency, Spec FR-005 / FR-003 / FR-012]
- [x] CHK306 — Are `catalog-dialog` card actions (`Continue`, `Read Again`) unambiguously defined based on `StoryProgressRecord` (`ended` true/false) and linked to `audio` fade rules (`1.2s` fade-in for `Continue`; no spoiler for `Read Again`)? [Clarity, Spec FR-005 / FR-014 / FR-006]
- [x] CHK307 — Are `badge` descriptors (`[Luzes Intermitentes]`, `[Sobressalto Acustico]`) and progress indicators (`"Quadro X de Y"`, `"Concluida"`) clearly quantified (`3px` bar, `5s` fade-out) and consistent with `#sensory-advisory-badge` (`FR-013`)? [Clarity / Consistency, Spec FR-013 / FR-005]

## Requirement Coverage — Multi-Page and Catalog Scenarios
- [x] CHK308 — Are `Recovery` rules defined: if user reloads (`F5`) mid-catalog (`catalog-dialog` open), is focus restored to `#catalog-button` and dialog state preserved/reopened? [Coverage — Recovery Flow, Spec ARC-003 / Edge Cases line 181 (`F5` reload with `latchedIllusions`)] (clarified Q25: dialog ephemeral; focus returns to #catalog-button)
- [x] CHK309 — Are `Exception` rules defined: what happens if `catalog.json` references a missing `manifest` (`build.mjs` `findUnreferencedAssets`)? [Coverage — Exception Flow, Spec FR-010 / `FR-002` / `catalog-manifest.schema.json`]
- [x] CHK310 — Are `Non-Functional` rules (`SC-006`: `LCP <= 2.5s`; `SC-001`: `a11y >= 0.95`) covered for both entry points (`index.html`, `alojamento.html`) with `injectFirstFramePicture` and preload scanner? [Coverage — Non-Functional, Spec SC-006 / SC-001 / FR-010]

## Requirement Measurability and Acceptance Criteria
- [x] CHK311 — Are `catalog.json` validation criteria (`catalog-manifest.schema.json`) measurable and linked to `build.mjs` (`findUnreferencedAssets`, `validateDeliveryBudgets`)? [Measurability, Spec ARC-003 / `catalog-manifest.schema.json` / `build.mjs`]
- [x] CHK312 — Are `entryHtml` points (`dist/index.html`, `dist/alojamento.html`) linked to `SC-006` (`LCP`) and `budget.json` (assets union across stories) with explicit thresholds? [Measurability, Spec ARC-003 / SC-006 / `budget.json`]

## Dependency and Assumption Validation
- [x] CHK313 — Are dependencies (`catalog-manifest.schema.json`, `build.mjs`, `isSafeLocalReference`, `story-manifest.schema.json`) validated for `catalog.json` entry (`FR-002` / `FR-010` / `FR-012`)? [Dependency — Link to `catalog-manifest.schema.json` / `build.mjs` / `isSafeLocalReference` / `.specify/bugs/media-masters-unreproducible/` (`verified` — provenance sidecars)] (clarified Q24: schema removed; validation by validate-manifest.mjs)
- [x] CHK314 — Is the assumption that `catalog.json` and `story.json` (id `main-story`) live in `src/data/` validated (no migration to `stories/` required — `FR-022`)? [Assumption, Spec FR-022 / `FR-002` — Note: current spec confirms `story.json` remains in `src/data/story.json`; only `o-alojamento.json` lives in `stories/`]
- [x] CHK315 — Are `catalog-dialog` focus-restoration and `Escape` rules consistent with `FR-003` (`dialog-modal` contract) and `SC-002` (`E2E` stabilization via `deferred-behavior-coverage`, `e2e-residual-timing-flakes` — both `verified`)? [Consistency / Dependency, Spec FR-003 / `SC-002` / `.specify/bugs/deferred-behavior-coverage/test.md` (`verified`)]

Notes:
+ Requirements-quality checklist for `spec.md` feature `005`. `[x]` = reviewer confirmed; agent must NOT mark `[x]`.
+ Feature domain (`manhwa horror`, `psychological horror`, `catalog architecture`, `multi-page static`) derived from `spec.md` (`Experiencia Cinematica Psicologica...`) and assessment (`korean-horror-webcomics` — `go`, referencing `Sweet Home`, `Strangers from Hell`, `Ghost Teller`, `Horang`).
+ No extension hooks (`.specify/extensions.yml`: `hooks: {}`).
+ Evidence links (`SC-002`: `deferred-behavior-coverage` `verified`; `SC-006`: `LCP` / preload; `SC-018`: `appFrames=0` / `test:perf` `45 passed`; `budget.json`: `build` `PASS`; `.specify/bugs/frames-low-quality/`: `partial` — quality review still pending; `.specify/bugs/media-masters-unreproducible/`: `verified` — provenance sidecars `SHA-256`).
