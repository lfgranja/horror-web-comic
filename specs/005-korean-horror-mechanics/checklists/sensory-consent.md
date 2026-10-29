# Specification Quality Checklist: Sensory Consent and Accessibility (005 — Korean Horror Mechanics)

Purpose: Validate the quality, clarity, completeness, consistency, and measurability of requirements in `specs/005-korean-horror-mechanics/spec.md` related to sensory consent (`#sensory-dialog`, `#sensory-advisory-badge`, `#catalog-dialog`, `#toggle-sensory-mode`, `hwc.sensoryMode`, `prefers-reduced-motion`). This is a requirements-quality checklist — it asks whether the English spec is well-written, unambiguous, complete, and ready for implementation — NOT whether the code works.

Created: 2026-10-27  Feature: [spec.md](spec.md) — Sections FR-003, FR-004, FR-005, FR-009, FR-012, FR-013  Review Type: Requirements Quality  Status: Reviewer-owned; `[x]` = reviewer confirmed; agent must NOT mark `[x]`.

---

## Requirement Completeness — Sensory Consent
- [x] CHK001 — Are exact display conditions for `#sensory-dialog` specified for all entry points (`index.html`, `alojamento.html`)? [Completeness, Spec FR-003]
- [x] CHK002 — Are button options (`#sensory-mode-fx`, `#sensory-mode-safe`) described with unambiguous labels and `>= 44x44px` targets? [Clarity, FR-003]
- [x] CHK003 — Is `localStorage` persistence (`hwc.sensoryMode`) fully defined, including fallback order and cross-tab sync? [Completeness, FR-004]
- [x] CHK004 — Are `prefers-reduced-motion` rules fully specified, including transparency and `BroadcastChannel` behavior? [Completeness, FR-004]

## Requirement Clarity — Badge and Catalog Accessibility
- [x] CHK005 — Is `#sensory-advisory-badge` defined as non-modal (`tabindex` absent, no interactive children)? [Clarity, FR-009 / FR-013]
- [x] CHK006 — Are descriptor vocabulary (`sensory-taxonomy.js`) and `catalog.json` mapping clearly defined? [Clarity / Consistency, FR-009 / FR-012]
- [x] CHK007 — Are `#catalog-dialog` accessibility rules (`Escape`, focus trap) quantified and consistent with `FR-012`? [Consistency, FR-012]

## Requirement Coverage — Edge Cases and Exceptions
- [x] CHK008 — Are recovery rules defined for `localStorage` failure (memory fallback, Safe default)? [Edge Case, FR-004]
- [x] CHK009 — Are concurrent interaction rules defined (`prev-frame` + `#toggle-sensory-mode` within transition window)? [Edge Case, FR-005 / Edge Cases section line 187] (clarified Q28)
- [x] CHK010 — Are mobile lifecycle rules covered (`F5` reload with `latchedIllusions`, discarded tab restoration)? [Coverage, FR-015]

## Requirement Measurability and Acceptance Criteria
- [x] CHK011 — Are accessibility targets (`a11y >= 0.95`, `CLS <= 0.1`, `LCP <= 2500ms`) explicitly linked to `#sensory-dialog`, badge, and `#catalog-dialog`? [Measurability, Link to Lighthouse: Perf=1.0 / A11y=1.0 / CLS=0 / LCP=1521ms]
- [x] CHK012 — Are `SC-003` timing thresholds (`<= 50ms` stop, `40ms` `STOP_DURATION`) measurable and linked to `FR-006` (`audio.js`)? [Measurability, FR-006 / SC-003]

## Requirement Consistency — Cross-Spec and Constitution
- [x] CHK013 — Do consent rules align with Constitution principles (`III`, `IV`, `V`, `VI`)? [Consistency, `.specify/memory/constitution.md` v2.1.0]
- [x] CHK014 — Are live region rules (`#frame-description` vs `#sensory-status`) consistent with `FR-012` and `FR-013`? [Consistency, FR-012 / FR-013]
- [x] CHK015 — Are `catalog-dialog` rules consistent with `FR-003` (dialog contract) and `SC-006` (catalog preload)? [Consistency, FR-003 / FR-005 / SC-006]

## Ambiguities, Conflicts, Assumptions, Dependencies
- [x] CHK016 — Is badge lifetime (`5s` fade-out) unambiguous regarding interaction with `#toggle-sensory-mode`? [Ambiguity, FR-013 — Badge lifecycle interaction gap]
- [x] CHK017 — Is focus management unambiguous between `#sensory-dialog` and `#catalog-dialog` (no concurrent open state)? [Conflict, Not explicitly excluded in FR-003 / FR-012] (clarified Q28)
- [x] CHK018 — Is the assumption that `catalog.json` and `stories/o-alojamento.json` share the same relative directory validated by `build.mjs` (`isSafeLocalReference`)? [Assumption, Link to `FR-002` / `FR-012` / `budget.json`]
- [x] CHK019 — Are `audioCue` dependencies (`media-src/audio/*.wav`, `isSafeLocalReference`, `build-images.mjs`) validated for `memoryIllusion.audioCue`? [Dependency, Link to FR-007 / `media-src/audio/`] (accepted gap: sting file absence documented in FR-007 Note)
- [x] CHK020 — Is `catalog.json` schema (`catalog-manifest.schema.json`) validated transitively by `validate-manifest.mjs` and `build.mjs`? [Dependency, Link to FR-002 / FR-012 / `catalog-manifest.schema.json`]

- [x] CHK021 — Are `Recovery` rules defined for mode switch (`Safe` -> `Immersive`, previous `latchedIllusions` preserved)? [Coverage — Recovery Flow, FR-005 / FR-015]
- [x] CHK022 — Are `Exception` rules defined for `prev-frame` on non-eligible `memoryIllusion` (no distortion, standard audio)? [Coverage — Exception Flow, FR-007 / FR-015]
- [x] CHK023 — Are `Non-Functional` rules (`SC-018` `appFrames = 0` during `fx` effects) defined and measurable? [Coverage — Non-Functional / Performance, ARC-002 / SC-018]
- [x] CHK024 — Are `Alternate` rules defined for `prefers-reduced-motion` user selecting `Immersive` explicitly? [Coverage — Alternate Flow, FR-004 / FR-005 — Note: current spec says `prefers-reduced-motion` takes priority; verify if override is allowed]

Notes:
+ This checklist validates the **quality of requirements** in `spec.md` for feature `005`, not the code implementation.
+ `[x]` is for the **reviewer** to confirm the requirement-quality criterion is satisfied. The agent must NOT mark items `[x]`.
+ References (`[Completeness]`, `[Clarity]`, `[Consistency]`, `[Measurability]`, `[Ambiguity]`, `[Conflict]`, `[Assumption]`, `[Dependency]`, `[Edge Case]`, `[Coverage]`) indicate the dimension being tested.
+ The feature domain (`manhwa horror`, `psychological horror`, `micro-jumps`, `memory illusion`) is derived from the spec title (`Experiencia Cinematica Psicologica com Micro-Sobressaltos Opt-in`) and the assessment (`korean-horror-webcomics` — `go`, referencing `Sweet Home`, `Strangers from Hell`, `Ghost Teller`, `Horang`).
+ No extension hooks (`.specify/extensions.yml`: `hooks: {}`) — skip silently.
