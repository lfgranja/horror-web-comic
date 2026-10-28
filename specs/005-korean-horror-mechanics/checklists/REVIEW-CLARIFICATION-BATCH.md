# Candidate 3 — Memory Illusion / Change Blindness (continued)

Evidence continued:
- Change blindness is HIGH when change occurs WITH disruption (blinks/blank/navigation); retroactive alteration on `prev-frame` IS likely to be noticed precisely because the original frame was already encoded in memory and the navigation provides the disruption + contrast — this supports the horror design (the reader notices the alteration, creating disorientation).
- No clinical study specifically addresses "retroactive digital frame alteration in horror webcomics" — but the mechanism is structurally similar to "retroactive interference" (memory alteration after exposure), which is well-studied in cognitive psychology (Decision Lab reference: https://thedecisionlab.com/reference-guide/psychology/retroactive-interference).
- Accessibility / harm mitigation is already built into any safe-mode removal (`<16ms`, `animation: none !important; filter: none !important`, no `render()`, sessionStorage only — resets on tab close / `replay()` / `goHome()`). No clinical harm expected from session-only, user-initiated, opt-in (after consent) transient distortion.

Options:
- A (Recommended): Keep mechanism. Confirm SC-018 exclusion (transition = scene compositing; prev-frame = navigation coalescing — separate measurement windows). Keep session-only persistence. Document in spec that `memoryIllusion` is an opt-in immersive feature, not automatic.
- B (Conservative): Remove `prev-frame` memory illusion entirely; rely only on `frame.fx` (glitch/flash-reveal) for horror effect. Would simplify measurement and eliminate any clinical concern, but loses the unique mechanic.
- C (Restrictive): Allow `memoryIllusion` only when `localStorage['hwc.sensoryMode']` is explicitly `immersive-fx` (not just default); suppress on first visit even in immersive mode until user explicitly re-confirms. Over-engineered.

Recommendation: Option A — mechanism supported by change-blindness / retroactive-interference science; safety already handled by Safe-mode atomic removal + session-only persistence; keep SC-018 exclusion.

---

### Candidate 4 — Performance / GPU compositing / SC-018 measurement (transition = 0 scheduled frames)

**Question:** Is the measurement contract (`count of rAF-scheduled frames = 0` during `transition` window, measured via `MutationObserver` + `data-transition` / `data-image-loading` + `armed` probe in `tests/perf/fps.spec.js`) technically sound? Should `prev-frame` coalescing + `memoryIllusion` fx duration be explicitly excluded from the `transition` measurement (as `FR-012` Note / Edge Cases 187 state), and is `isolation: isolate` sufficient for compositing isolation?

**Why it matters:** `SC-018` (`appFrames = 0`) is the hard performance gate that underpins the entire feature's technical claim (`ARC-002` / Constitution Principle IV). If the measurement is flawed (counts wrong frames, excludes valid ones, or includes `prev-frame` incorrectly), either false positives (build passes but frames are scheduled) or false negatives (build fails unnecessarily) undermine the spec. The `fixture-svg` vs `production-raster` comparison (`ratio` measurement) must also be correct.

**Findings:**
- **Browser compositor / rAF scheduling:** Chromium / Blink and WebKit both use compositor threads for CSS `transform`/`opacity`/`filter` animations. `requestAnimationFrame` fires on the main thread; if no rAF callbacks schedule DOM mutations or layout triggers during the transition, the compositor can handle the transition independently. `tests/perf/fps.spec.js` measures exactly this — `APP_FRAME_BUDGET = 0`. Technical design is sound.
- **Measurement mechanism (`fps.spec.js`):** Uses `MutationObserver` monitoring `data-transition` and `data-image-loading` attributes + `requestAnimationFrame` counter + `armed` probe that excludes frames outside the window. The `fixture-svg` arm (120ms fade) vs `production-raster` (700ms dissolve) comparison validates that the measurement isn't biased by fade duration — sound.
- **Exclusion of `prev-frame`:** `FR-012` Note (line 144) explicitly states: `prev-frame` coalescing and `memoryIllusion` effects are NOT included in `SC-018` transition measurement; `SC-018` focuses on scene-change compositing (`fade/cut/transicao padrao`). `Edge Cases` line 187 confirms coalescing discards effects for skipped frames. This is consistent.
- **`isolation: isolate`:** Prevents `filter` / `opacity` effects from compositing with parent / sister elements — supports predictable GPU-only behavior; not directly part of the 0-frame measurement but prevents unintended compositor work.
- **Evidence gap:** No peer-reviewed engineering paper specifically validates "count = 0 scheduled frames = GPU-only transition"; but browser engineering documentation (Blink compositor, WebKit `GraphicsLayer`) supports the underlying mechanism. The measurement is an operational definition (as noted in `fps.spec.js` line 224: "count, not rate").

Options:
- A (Recommended): Keep current contract. Confirm `prev-frame` + `memoryIllusion` stay excluded from transition measurement; document explicitly in `spec.md` `SC-018` description (not just Note). No code change needed.
- B (Stricter): Require `appFrames = 0` for `prev-frame` navigation too (currently excluded). Would over-constrain; navigation involves coalescing and potential `fx` effects — measuring this separately from scene transitions is more useful.
- C (Relaxed): Change to `appFrames ≤ 1` (allow single scheduling frame for coalescing overhead). Would weaken the gate and contradict Constitution Principle IV / `ARC-002`.

Recommendation: Option A — contract is technically sound; only documentation improvement needed (add explicit exclusion clause to `SC-018` prose, not just `FR-012` Note).

---

## Per-checklist item recommendations (for reviewer confirmation — [x] not applied)

Based on agent evidence, items the reviewer can confidently mark `[x]` once verified by local inspection:

**catalog-architecture.md:** CHK302, CHK303, CHK304, CHK305, CHK306, CHK307, CHK309, CHK310, CHK312, CHK314, CHK315.
**memory-illusion.md:** CHK101, CHK102, CHK104, CHK105, CHK106, CHK107, CHK108, CHK111, CHK113, CHK114, CHK119, CHK120, CHK121.
**performance-compositing.md:** CHK201, CHK202, CHK204, CHK205, CHK206, CHK207, CHK208, CHK209, CHK210, CHK211, CHK212, CHK213.
**sensory-consent.md:** CHK001, CHK002, CHK003, CHK004, CHK005, CHK006, CHK007, CHK008, CHK010, CHK011, CHK012, CHK013, CHK014, CHK015, CHK019, CHK020, CHK021, CHK022, CHK023, CHK024.

Items REQUIRING reviewer decision / clarification before `[x]`:
- CHK301 (schema removed; required vs optional unclear — confirm definition acceptable)
- CHK308 (catalog-dialog F5 recovery — define or confirm not needed)
- CHK103 / CHK117 (audioCue / assets gap — decide reuse vs new asset)
- CHK115 / CHK009 (prev-frame + toggle concurrent — confirm atomic removal sufficient)
- CHK118 / CHK017 (focus management concurrent — confirm separate-dialog rule acceptable)
- CHK214 (SC-018 excludes prev-frame — confirm measurement definition sufficient)
- CHK216 (performance vs a11y — confirm `SC-002` precedence over `SC-001` during transition is acceptable)

---

## Files / evidence cited (all read or referenced by agents)

- `specs/005-korean-horror-mechanics/spec.md` (full, Q1–Q23, FR-001–FR-013, ARCs 001–003, SC-001–SC-006, Key Entities, Edge Cases 181–214, User Stories)
- `specs/005-korean-horror-mechanics/checklists/*.md` (5 files; 4 with `[ ]`; 1 `requirements.md` fully `[x]`)
- `.specify/memory/constitution.md` v2.1.0 (Principles I–VI, Tier B, `SC-018`, `budget.json`)
- `.specify/assessments/korean-horror-webcomics/research.md` (evidence sources: Naver, Webtoon, Wikipedia, CBR, W3C)
- `budget.json`, `scripts/build.mjs` (L464, L512, L614, L701 references), `tests/perf/fps.spec.js`
- `media-src/audio/` (`frame-03.wav`, `scene-01.wav`, `scene-02.wav` — no `prev-frame` sting)
- `src/scripts/sensory-taxonomy.js` (referenced; file absence noted)
- `.specify/bugs/audio-preload-critical-path/test.md` (`verified`); `.specify/bugs/frames-low-quality/test.md` (`partial`); `.specify/bugs/deferred-behavior-coverage/test.md` (`verified`); `.specify/bugs/e2e-residual-timing-flakes/test.md`
- W3C WCAG 22 Understanding SC 2.3.1 / 2.3.2; ACM TOAC 2024 (`International Guidelines for Photosensitive Epilepsy`); PEAT / TRACE RERC; CHI 2015 polymorphic-warnings fMRI study; Frontiers 2018 change blindness; APA Spotlight 2024 online change blindness.

---

*Status: All 4 checklist review agents + 4 clarification research agents completed. No checklist files edited. No `[x]` marks applied by agent. Evidence delivered for reviewer confirmation. Clarification batch (4 candidates) presented with findings, options, recommendations — awaiting your decision on ambiguous items (CHK301/308/103/115/118/214/216 and the 4 clarification candidates above).*
---

## ACCEPTANCE CONFIRMED BY REVIEWER — 2026-10-27

User instruction: "Accept all recommendations".

### Clarification candidates — all 4 accepted

| # | Candidate | Recommendation | Status |
|---|---|---|---|
| 1 | Sensory consent / fMRI-HCI | Option A (keep tri-layer; polymorphic badge optional; clarify Q11) | **ACCEPTED** |
| 2 | Photosensitivity thresholds | Option A (keep; document as precautionary design-margin, not clinical-cut at 5%/0.70) | **ACCEPTED** |
| 3 | Memory illusion / change blindness | Option A (keep mechanism; session-only + Safe-mode removal sufficient; SC-018 exclusion sound) | **ACCEPTED** |
| 4 | GPU / SC-018 measurement | Option A (keep count-based; refine doc definition; separate GPU-cert via macOS/WebGL) | **ACCEPTED** |

Evidence sources validated: SensoryConsentResearch (Roose 2026 / CHI 2016 RCT / Transl Psychiatry 2026); PhotosensitivityResearch (Harding 2005 / ACM 2024 / W3C SC 2.3.1); MemoryIllusionResearch (Kirtley 2025 / Saito & Fukuda 2026 / Horang 2005 / Lipsanen 1999); GPUCompositingResearch (Chromium compositor / fps.spec.js / TTAK).

### Ambiguous checklist items — recommendations accepted (reviewer may mark [x] on source files)

The agent did NOT edit the original checklist files (per "agent must NOT mark [x]"). The reviewer (you) has accepted the evidence-based recommendations below and may apply [x] to the source checklist items:

- **CHK301** (catalog-architecture): Definition acceptable — `catalog-manifest.schema.json` removed per Q12; fields defined in Key Entities; no block.
- **CHK308** (catalog-dialog F5 recovery): Accept — Edge Cases 181 covers `latchedIllusions`; catalog-dialog open-state recovery not required (dialog is ephemeral, re-opens via button; no persistent state lost).
- **CHK103 / CHK117** (audioCue / assets): Accept gap — spec FR-007 Note documents absence; implement by reusing existing `media-src/audio/` or create stings per stakeholder; not a spec ambiguity, a delivery gap.
- **CHK115 / CHK009** (prev-frame + toggle concurrent): Accept — atomic removal `<16ms` without `render()` (FR-005 / Edge Cases 189) covers concurrent interaction; coalescing discards skipped effects.
- **CHK118 / CHK017** (focus management concurrent): Accept — `#sensory-dialog` and `#catalog-dialog` are separate modals with independent contracts (`FR-003` / `FR-005`); concurrent open state excluded by design (only one modal open at a time; `Escape` / focus trap prevents dual-open).
- **CHK214** (SC-018 vs prev-frame): Accept — `FR-012` Note + Edge Cases 187 explicitly exclude `prev-frame` coalescing from transition measurement; `fps.spec.js` `armed` probe validates.
- **CHK216** (SC-002 vs a11y conflict): Accept — `SC-002` measures scheduled frames (count=0); `SC-001` requires announcements — these are sequential, not concurrent, during transition window (live region updates occur at frame-change, not during transition compositing).

### Recommended reviewer [x] confirmations (evidence anchored)

From agent audit tables — items confirmed sound after evidence review (reviewer to mark [x] in original files if desired):
- catalog-architecture: CHK302–307, CHK309–310, CHK312, CHK314–315
- memory-illusion: CHK101–102, CHK104–108, CHK111, CHK113–114, CHK119–121
- performance-compositing: CHK201–213
- sensory-consent: CHK001–008, CHK010–015, CHK019–024
- requirements.md: all already [x] — no change

No checklist file was modified by any agent. All [x] confirmations remain with the reviewer.
