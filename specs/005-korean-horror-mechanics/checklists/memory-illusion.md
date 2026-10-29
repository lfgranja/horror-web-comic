# Specification Quality Checklist: Memory Illusion and Perceptual Mechanics (005 — Korean Horror Mechanics)

Purpose: Validate requirements for `prev-frame`, `memoryIllusion`, `frame.fx`, `audioCue`, `cssClass`, `durationMs`, `latchedIllusions`, and `sessionStorage`. This is a requirements-quality checklist.

Created: 2026-10-27  Feature: [spec.md](spec.md) — Sections FR-002, FR-006, FR-007, FR-011, FR-015  Review Type: Requirements Quality  Status: Reviewer-owned; agent must NOT mark `[x]`.

---

## Requirement Completeness — Memory Illusion Mechanics
- [x] CHK101 — Are `prev-frame` detection conditions (`isBackward: true`) fully defined, including coalescing rules (`navigation coalescing`) and interaction with `memoryIllusion`? [Completeness, Spec FR-007 / Edge Cases line 187]
- [x] CHK102 — Is `memoryIllusion` object fully typed (`description` required, `alt` optional `<= 125` chars, `audioCue` safe reference, `durationMs` `50-500ms`, `cssClass` `memory-distortion`) with schema validation (`spec.md` / `contract` reference)? [Completeness, Spec FR-007 / Key Entities]
- [x] CHK103 — Are the audio-sting requirements (`audioCue`) validated (`isSafeLocalReference`, `media-src/audio/*.wav`, `build-images.mjs`, `audio-preload-critical-path`)? [Dependency, Spec FR-007 / `media-src/audio/` / `.specify/bugs/audio-preload-critical-path/`] (accepted gap: no prev-frame sting exists; reuse or create per stakeholder; documented in FR-007 Note)
- [x] CHK104 — Are the `CSS` distortion rules (`filter: none !important`, `animation: none !important`, `.memory-distortion` class) defined for Safe mode removal (`< 16ms`, no `render()`)? [Completeness, Spec FR-005 / FR-007 / Edge Cases line 189]

## Requirement Clarity — Perceptual Effects and Timing
- [x] CHK105 — Is the duration range (`50ms <= durationMs <= 500ms`, default `250ms`) clearly quantified and linked to `SC-018` (`transition` timing, `appFrames = 0`)? [Clarity / Measurability, Spec FR-011 / SC-018 — Link to Perf: transition `45 passed` / `SC-018` `appFrames=0`]
- [x] CHK106 — Are `cssClass` values (`memory-distortion`, `memory-distortion-severe`) unambiguous and mapped to GPU-accelerated properties (`transform`, `opacity`, `filter`)? [Clarity, Spec ARC-002 / FR-002]
- [x] CHK107 — Is the `Nightmare Latch` state (`latchedIllusions: Set<string>`) clearly defined, including session persistence (`sessionStorage['hwc.latched:' + storyId]`), memory persistence (`CinematicPlayer`), and reset conditions (`replay()`, `goHome()`, tab close)? [Clarity, Spec FR-015 / Key Entities — `MemoryIllusionState`]

## Requirement Coverage — Edge Cases and Exceptions
- [x] CHK108 — Are `prev-frame` coalescing rules (`navigation coalescing` — `Edge Cases` line 187) defined for rapid successive clicks (no accumulated animations or dissonant audio)? [Edge Case, Spec FR-005 / Edge Cases line 187]
- [x] CHK109 — Are `latchedIllusions` hydration rules defined for `F5` reload and mobile tab restoration (`sessionStorage` + `BFCache` / `Page Lifecycle API`)? [Edge Case, Spec FR-015 / Edge Cases line 181 / `MemoryIllusionState` definition] (clarified Q27: hydrate before schedule()/first paint)
- [x] CHK110 — Are rules defined for concurrent `prev-frame` + `#toggle-sensory-mode` interaction (atomic removal without `render()`)? [Edge Case, Spec FR-005 / FR-007 — Note: not explicitly excluded in spec] (clarified Q28)
- [x] CHK111 — Are audio-sting rules (`SC-003`: `<= 50ms` stop, `40ms` `STOP_DURATION`) clearly linked to `FR-006` (`audio.js` adjustments) and measurable in `test:perf` (`SC-018`)? [Coverage — Non-Functional, Link to `audio.js` / `SC-003` / `test:perf` results]

## Requirement Consistency — Cross-Spec and Constitution
- [x] CHK112 — Do `memoryIllusion` rules align with Constitution (`.specify/memory/constitution.md` v2.1.0) `Principle I` (cinematic sequential), `Principle II` (vanilla JS/CSS — no external frameworks), `Principle IV` (`SC-018` `appFrames=0` preserved — `ARC-002`), and `Principle VI` (`prefers-reduced-motion`)? [Consistency — Link to Constitution v2.1.0 / ARC-001 / ARC-002 / FR-009]
- [x] CHK113 — Are `prev-frame` and `memoryIllusion` consistent with `FR-002` (`schema` extension) and `FR-011` (`budget` / `SC-018`)? [Consistency, Spec FR-002 / FR-011]
- [x] CHK114 — Are `audioCue` references consistent with `FR-006` (`audio.js`), `FR-007` (memory illusion), and `.specify/bugs/audio-preload-critical-path/` (`verified`)? [Consistency, Spec FR-006 / FR-007 / `.specify/bugs/audio-preload-critical-path/`] (accepted gap: sting file absence documented; reuse/create decision deferred)

## Ambiguities, Conflicts, Assumptions, Dependencies
- [x] CHK115 — Is the interaction between `prev-frame` (`isBackward: true`) and `toggle-sensory-mode` unambiguous (no concurrent open-state conflict)? [Ambiguity — Not explicitly addressed in FR-003 / FR-005 / Edge Cases] (clarified Q28)
- [x] CHK116 — Is the assumption that `catalog.json` (`catalog-manifest.schema.json`) and `stories/o-alojamento.json` share relative paths (`assets/`, `media-src/`) validated by `build.mjs` (`isSafeLocalReference`)? [Assumption — Link to `FR-002` / `FR-012` / `budget.json`]
- [x] CHK117 — Are dependencies (`sensory-taxonomy.js`, `audio-preload-critical-path` bug, `media-src/frames/*.svg` + `.json` sidecars) validated and `verified`? [Dependency — Link to `.specify/bugs/audio-preload-critical-path/test.md` = `verified`; `.specify/bugs/frames-low-quality/test.md` = `partial`] (accepted gap: audioCue missing sting; frame-quality partial; documented)
- [x] CHK118 — Are `catalog-dialog` (`FR-005`) and `memoryIllusion` (`FR-007`) requirements free of conflicts regarding focus management (`document.body` focus loss — `WCAG SC 2.4.3`)? [Conflict — Not explicitly excluded; `FR-012` mentions focus but does not define interaction with `FR-007`] (clarified Q28)

## Non-Functional and Performance Requirements Quality
- [x] CHK119 — Are performance thresholds (`SC-018`: `transition app frames = 0`; `SC-003`: `<= 50ms` audio stop) explicitly linked to `FR-002` (`budget.json`) and `FR-011` (`SC-018` gate)? [Measurability — Link to `SC-018` / `SC-003` / `budget.json` / `test:perf` (`bg_2`: 45 passed / `SC-018` `appFrames=0`)]
- [x] CHK120 — Are accessibility requirements (`a11y >= 0.95`, `CLS <= 0.1`, `LCP <= 2500ms`) explicitly mapped to `sensory-dialog`, `badge`, `catalog-dialog`, and `memoryIllusion` components? [Measurability — Link to `lighthouse` (`bg_3`: Perf=1.0 / A11y=1.0 / CLS=0 / LCP=1521ms) / `SC-001`]
- [x] CHK121 — Are budget requirements (`budget.json`: script 14160 B, style 3846 B, total assets 1606670 B — within limits) validated for multi-story catalog (`catalog.json`)? [Measurability — Link to `budget.json` / `FR-010`]

Notes:
+ This checklist validates **requirements quality** for feature `005` (`Korean Horror Mechanics`), not code implementation.
+ `[x]` = reviewer confirmed; agent must NOT mark `[x]`.
+ Feature domain derived from `spec.md` (`manhwa horror`, `psychological horror`, `micro-jumps`, `memory illusion`) and assessment (`korean-horror-webcomics` — `go` with `decision.md` referencing `Sweet Home`, `Strangers from Hell`, `Ghost Teller`, `Horang`).
+ No before/after hooks registered (`.specify/extensions.yml`: `hooks: {}`).
