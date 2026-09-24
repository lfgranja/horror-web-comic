---

description: "Task list for the Player Cinematográfico de Quadros feature"
---

# Tasks: Player Cinematográfico de Quadros

**Input**: Design documents from `/specs/001-cinematic-player/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md, `.specify/memory/constitution.md`

**Tests**: Included — the plan (R10), the constitution's quality gates, and
quickstart VS-1..VS-10 explicitly require Playwright E2E, Lighthouse CI budgets
and the manifest integrity validator.

**Organization**: Tasks are grouped by user story so each story is independently
implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US4)
- Include exact file paths in descriptions

## Path Conventions

Single static project at repository root: `index.html`, `src/`, `assets/`,
`tests/`, `scripts/` (build tooling), per `plan.md` → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dev tooling and quality gates.

- [X] T001 Create the project directory structure: `src/styles/`, `src/scripts/`, `src/data/`, `assets/frames/`, `assets/audio/`, `assets/icons/`, `tests/e2e/`, `tests/fixtures/`, `tests/perf/`, `scripts/`
- [X] T002 Initialize `package.json` at repository root with devDependencies (`@playwright/test`, `@lhci/cli`, `esbuild`, `sharp`, `ajv`, `ajv-formats`) and npm scripts (`serve`, `test`, `lhci`, `validate`, `build`)
- [X] T003 [P] Add `.gitignore` (node_modules, build output, Playwright/Lighthouse artifacts) and `.editorconfig` at repository root
- [X] T004 [P] Configure Playwright in `playwright.config.js` with a mobile project (360×800, touch) and a desktop project (1440×900), webServer on the static server, and baseURL
- [X] T005 [P] Configure Lighthouse CI in `lighthouserc.json` and `budget.json` (LCP < 2.5 s cold, CLS < 0.1, total ≤ 30 MB, initial scene ≤ 1.5 MB, code ≤ 65 KB compressed) and register the FPS gate (`tests/perf/fps.spec.js`, T064a) alongside the budgets

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared content model, persistence, loader and app shell. No user
story can be implemented until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Create design tokens in `src/styles/tokens.css` (color, typography, spacing, radii, z-index, safe-area custom properties for `env(safe-area-inset-*)`)
- [ ] T007 [P] Create the mobile-first reset/layout in `src/styles/base.css` (no horizontal scroll, full-viewport stage, focus-visible baseline)
- [ ] T008 Create the app shell in `index.html` (`lang`, `viewport-fit=cover`, semantic landmarks, stage container, control bar markup, `aria-live="polite"` region, error-screen container, `<script type="module" src="src/scripts/main.js">`)
- [ ] T009 [P] Create the narrative manifest in `src/data/story.json` (≥2 scenes, several frames with `image`, `alt`, `description`, optional `durationMs`/`transition`/`audio`, scene `audio`) conforming to `contracts/story-manifest.schema.json`
- [ ] T010 [P] Create placeholder frame and audio assets under `assets/frames/` and `assets/audio/` referenced by `src/data/story.json`
- [ ] T011 Implement the manifest integrity validator in `scripts/validate-manifest.mjs` (AJV validation against `contracts/story-manifest.schema.json` + unique `Frame.id` and existence of every referenced image/audio file) — FR-023, FR-025, SC-016
- [ ] T012 Implement the storage module in `src/scripts/storage.js` (versioned `hwc.*` keys per `contracts/storage-contract.md`, `hwc.schemaVersion` check, `(updatedAt, seq, tabId)` write ordering, graceful fallback when `localStorage` is unavailable) — FR-007, FR-019, FR-024, FR-030
- [ ] T013 Implement the story loader in `src/scripts/story-loader.js` (fetch `src/data/story.json`, validate structure and `schemaVersion`, fail-closed) — FR-023, FR-024
- [ ] T014 Implement the bootstrap in `src/scripts/main.js` (load story via `story-loader.js`, render friendly error screen on failure, expose a minimal app context for later stories) — FR-023
- [X] T015 [P] Create the deterministic E2E fixture manifest in `tests/fixtures/story.json` plus stub assets, with known frame IDs/durations for assertions
- [X] T015a [P] E2E test serving a malformed/missing/incompatible-manifest fixture and asserting the friendly error screen (no blank page) in `tests/e2e/manifest-failure.spec.js` — FR-023, FR-024

**Checkpoint**: Foundation ready — content loads, validates, persists and fails safely.

---

## Phase 3: User Story 1 - Assistir à história como um filme (Priority: P1) 🎯 MVP

**Goal**: Frames are shown in narrative order with cinematic transitions, auto-advance
by default, full manual navigation (frame/scene/start/end), a progress indicator,
an end-of-story state, and persisted reading position.

**Independent Test**: Open the page, confirm frames appear in order with visible
transitions and auto-advance, and that next/previous, scene jumps, Home/End and
"Rever do início" all work — valuable even with no audio.

### Tests for User Story 1 ⚠️

> Write these tests FIRST and confirm they FAIL before implementing.

- [X] T016 [P] [US1] E2E test for auto-advance and narrative order in `tests/e2e/playback.spec.js` (VS-1; assert each frame's dwell is within ±10% of the effective duration, covering slow author rhythms and 2x speed) (FR-001, FR-017, FR-018, SC-010)
- [X] T017 [P] [US1] E2E test for manual navigation and ≤3-action reachability of first/last frame and previous/next scene start in `tests/e2e/navigation.spec.js` (SC-011; FR-003)
- [X] T018 [P] [US1] E2E test for the end-of-story overlay and "Rever do início" in `tests/e2e/end-state.spec.js` (VS-10; FR-033)
- [X] T019 [P] [US1] E2E test for reading-position resume across reload in `tests/e2e/resume.spec.js` (VS-5; FR-019, SC-012)
- [X] T054a [P] [US1] E2E/perf test for first-visit arrival at the second frame in `tests/perf/first-frame.spec.js` (measure from `navigationStart` to second-frame visible at 1× and 1500 ms default dwell; assert <10 s on the SC-001 reference profile 360×800 / ~4 GB) — SC-001

### Implementation for User Story 1

- [ ] T020 [US1] Implement the player state machine in `src/scripts/player.js` (`idle`/`playing`/`paused`/`ended`, `currentFrameIndex`, `currentSceneIndex`, auto-advance scheduler) — FR-001, FR-013, FR-017
- [ ] T021 [US1] Implement effective duration and transition resolution in `src/scripts/player.js` (`frame ?? scene ?? story ?? 1500` ms; `transition ?? scene ?? story ?? fade/600` ms) — FR-002, FR-018
- [ ] T022 [US1] Implement manual navigation in `src/scripts/player.js` (next/previous, next/previous scene, Home/End; no-op at limits; 400 ms coalescing; cancel in-flight transition; manual navigation pauses auto-advance) — FR-003
- [ ] T023 [US1] Implement cinematic transitions in `src/styles/player.css` (`cut`, `fade`, `zoom-in`, `zoom-out`, `dissolve`, `slide-left`, `slide-right`, `none`; configurable duration/easing) — FR-002
- [ ] T024 [US1] Implement frame rendering with progressive loading in `src/scripts/player.js` and `src/styles/player.css` (`<picture>` with AVIF/WebP/JPEG, explicit dimensions, reserved aspect ratio placeholder, preload current + next frame; on image `error`, show accessible placeholder with frame description and keep navigation working) — FR-015, SC-008, SC-015
- [ ] T025 [US1] Implement the accessible progress indicator in `index.html` + `src/scripts/player.js` (`role="progressbar"`, `aria-valuenow/min/max`, accessible name) — FR-034
- [ ] T026 [US1] Implement the end-of-story overlay with "Rever do início" and navigation that leaves the final state in `src/scripts/player.js` + `index.html` — FR-033
- [ ] T027 [US1] Wire the control bar handlers (play/pause, next/previous, next/previous scene, Home/End) in `src/scripts/player.js` — FR-003, FR-013
- [ ] T028 [US1] Implement keyboard shortcuts in `src/scripts/player.js` (`Space`/`K` play/pause, `←`/`→` frame, `Shift`+arrows scene, `Home`, `End`, `M` toggle audio; `preventDefault` on the player element) — FR-010, FR-005
- [ ] T029 [US1] Persist and restore the reading position on auto-advance and manual navigation via `src/scripts/storage.js` (resume at saved frame, restart at first frame if invalid) — FR-019, SC-012

**Checkpoint**: User Story 1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 - Controlar o áudio facilmente (Priority: P2)

**Goal**: Audio starts on by default, is controllable with one always-visible
control, silences immediately, survives autoplay blocking, and remembers
audio/volume/speed preferences.

**Independent Test**: Load the page, confirm audio starts on (or shows the blocked
overlay), toggle it off with immediate silence without restarting the scene, and
confirm the preference persists after reload.

### Tests for User Story 2 ⚠️

- [X] T030 [P] [US2] E2E test for audio-on-by-default, immediate toggle silence, persistence and runtime audio-file failure (missing track stays silent, no visible error, control state coherent) in `tests/e2e/audio.spec.js` (VS-2; FR-004, FR-005, FR-006, FR-007, FR-032, SC-003, SC-007)
- [X] T031 [P] [US2] E2E test for the autoplay-blocked overlay, "continuar sem som" and gesture activation in `tests/e2e/autoplay.spec.js` (VS-8; FR-014, FR-016)
- [X] T032 [P] [US2] E2E test for volume/speed persistence and the 2x dwell effect in `tests/e2e/speed-volume.spec.js` (VS-7; FR-020, FR-021)
- [ ] T032a [P] [US2] Document and run the usability probe for audio-control discoverability: script ≥10 participants, task "find and activate the audio control within 5 s", record hit-rate in `specs/001-cinematic-player/notes/usability-audio.md`; fail the US2 checkpoint if <95% — SC-002 (also assert in `tests/e2e/audio.spec.js` that the control is visible without hover and reachable in ≤1 interaction from any frame)

### Implementation for User Story 2

- [ ] T033 [US2] Implement the audio manager in `src/scripts/audio.js` (pre-create and synchronously unlock, on the first qualified gesture, one `HTMLAudioElement` per scene **and per frame that declares `audio`**, satisfying Safari/WebKit per-element policy; loop/ambience) — FR-004, FR-006, FR-016
- [ ] T034 [US2] Implement autoplay-block detection in `src/scripts/audio.js` (only `NotAllowedError`; never confuse with file-load failure) and expose the `blocked` state — FR-016, FR-032
- [ ] T035 [US2] Implement the "toque para iniciar" overlay in `index.html` + `src/scripts/audio.js` with "continuar sem som" (does NOT enable audio) and activation via any other qualified gesture for the session — FR-016
- [ ] T036 [US2] Implement audio toggle behavior in `src/scripts/audio.js` (stop ≤100 ms with anti-click micro-ramp; fade-in ≤300 ms on re-enable; resume scene track from its position without restarting the frame) — FR-006
- [ ] T037 [US2] Implement scene crossfade (≤500 ms) and silence when the next scene has no track in `src/scripts/audio.js` — FR-006
- [ ] T038 [US2] Implement frame-audio mix with scene ducking to 40% and 300 ms crossfade in `src/scripts/audio.js`, reusing the frame elements pre-created/unlocked in T033 (no element creation after the gesture) — FR-006
- [ ] T039 [US2] Implement the persisted volume control (0–100%, default 0.6, multiplies scene/frame base volume) in `src/scripts/audio.js` + `src/scripts/storage.js` — FR-020
- [ ] T040 [US2] Implement the persisted speed control (0.5x/1x/2x; affects dwell only, transitions unchanged, effective floor 250 ms) in `src/scripts/player.js` + `src/scripts/storage.js` — FR-021, FR-018, SC-010
- [ ] T041 [US2] Implement the audio-state UI in `index.html` + `src/scripts/audio.js` (`aria-pressed` binary, `aria-disabled` + fixed label + `role="status"` for blocked) — FR-014
- [ ] T042 [US2] Pause/resume scene audio with player pause and preload current + next scene tracks in `src/scripts/audio.js` — FR-013, FR-015, SC-009
- [ ] T042a [US2] Implement runtime audio-failure handling in `src/scripts/audio.js` (listen for `error`/`stalled` on every scene/frame `HTMLAudioElement`; stay silent without visible error; keep the audio-control state coherent; never reclassify as autoplay block per FR-016) — FR-032

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Assistir confortavelmente em qualquer dispositivo (Priority: P3)

**Goal**: Identical narrative integrity from 320 px to 2560 px, portrait and
landscape, touch and keyboard, within delivery budgets and metadata standards.

**Independent Test**: Open on a smartphone in portrait and landscape and on
desktop; confirm no horizontal scroll, no cropping, all controls reachable by
touch and keyboard, and budgets/metadata pass.

### Tests for User Story 3 ⚠️

- [X] T043 [P] [US3] E2E responsive matrix test (320/360/768/1440/2560 px, both orientations; no horizontal scroll, integral framing) in `tests/e2e/responsive.spec.js` (VS-3; FR-009, SC-005)
- [X] T044 [P] [US3] E2E input test for touch and keyboard navigation on mobile and desktop projects in `tests/e2e/input.spec.js` (FR-010)
- [X] T044a [P] [US3] E2E test asserting `<title>`, meta description and Open Graph tags present in `tests/e2e/metadata.spec.js` — FR-026, SC-021

### Implementation for User Story 3

- [ ] T045 [US3] Implement responsive layout in `src/styles/player.css` (`object-fit: contain`, ultrawide letterbox, `env(safe-area-inset-*)`, orientation change preserves current frame, ≥44×44 px targets) — FR-009, FR-010, SC-017
- [ ] T046 [US3] Add page metadata (title, description, Open Graph) to `index.html` — FR-026, SC-021
- [ ] T047 [US3] Implement capability-based degradation in `src/scripts/capabilities.js` (`saveData`, `deviceMemory`, `hardwareConcurrency`; light image variant ≤150 KB and ≤1280 px, non-essential transitions — any type other than `cut`/`none` — become instant cuts, audio ~48–64 kbps, default behavior when signals are absent) — FR-031, SC-020
- [ ] T048 [US3] Implement responsive asset selection (`srcset`/`sizes`, lazy-load off-scene frames, preload critical frames) in `src/scripts/player.js` — FR-015, FR-028
- [ ] T049 [US3] Implement the image pipeline in `scripts/build-images.mjs` (sharp → AVIF cq≈18, WebP q≈75, JPEG q≈80, max side 2560 px; light variant ≤1280 px/≤150 KB) — FR-028, SC-023
- [ ] T050 [US3] Implement the production build in `scripts/build.mjs` (esbuild minify + content-hash cache-busting, fail on compressed code > 65 KB: ≤50 KB JS + ≤15 KB CSS) — FR-029
- [ ] T051 [US3] Document delivery standards and the browser support matrix (Chrome/Firefox/Safari desktop + Chrome/Safari mobile) in `docs/delivery.md` — FR-027, FR-028, SC-022

**Checkpoint**: User Stories 1–3 work independently across the device matrix.

---

## Phase 6: User Story 4 - Assistir com conforto e acessibilidade (Priority: P4)

**Goal**: Reduced-motion users, screen-reader users and users without audio can
follow the story, with detailed frame descriptions and reliable pause/resume.

**Independent Test**: Enable `prefers-reduced-motion` and a screen reader;
confirm transitions collapse to cuts, each frame's detailed description is
announced, and pause/resume works (frame restarting with scene audio resuming
mid-track).

### Tests for User Story 4 ⚠️

- [X] T052 [P] [US4] E2E reduced-motion test (auto-advance continues with instant cuts, no script animation) in `tests/e2e/reduced-motion.spec.js` (VS-4; FR-011, SC-006)
- [X] T053 [P] [US4] E2E accessibility-semantics test (live-region description, short alt, progressbar, audio state) in `tests/e2e/a11y.spec.js` (FR-008, FR-012, FR-014, SC-004, SC-013)
- [X] T053a [US4] E2E test asserting every frame in `tests/fixtures/story.json` has non-empty `description` + `alt` and that the live region announces a description on each advance (proxy for audio-off comprehensibility) in `tests/e2e/a11y.spec.js` — SC-004, FR-008, FR-012
- [ ] T053b [US4] Run the audio-off comprehension study per `quickstart.md` §SC-004 protocol: n ≥ 10 participants, audio muted, narrative questions; pass if ≥95% correct; record results in `specs/001-cinematic-player/notes/usability-a11y.md` — SC-004 (manual, not CI; T053a remains the automated proxy)
- [X] T054 [P] [US4] E2E pause/resume test (frame restarts, scene audio continues, ≤100 ms stop) in `tests/e2e/pause.spec.js` (FR-013, SC-009)

### Implementation for User Story 4

- [ ] T055 [US4] Implement the accessibility module in `src/scripts/a11y.js` (`aria-live="polite"` + `aria-atomic="true"` announcing the detailed frame description with ≥500 ms debounce; region present before change; focus never moved) — FR-012, FR-014
- [ ] T056 [US4] Implement reduced-motion handling in `src/scripts/player.js` + `src/styles/player.css` (force `cut`/0 ms, suppress all CSS and script animation, keep auto-advance) — FR-011, SC-006
- [ ] T057 [US4] Associate short `alt` and long description per frame in `src/scripts/player.js` (`aria-describedby`/live region), reproduce embedded lettering literally, and declare page/description language — FR-008, FR-012, SC-004, SC-013
- [ ] T058 [US4] Implement pause/resume from the exact point in `src/scripts/player.js` (pause stops auto-advance and scene audio; resume restarts the current frame dwell and continues the scene track from where it stopped) — FR-013, SC-009
- [ ] T059 [US4] Enforce AAA accessibility basics in `src/styles/base.css` + `src/styles/player.css` (focus-visible on all controls, ≥44×44 px targets, reinforced contrast, 200% zoom/reflow without loss) — FR-010, SC-017

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Transversal requirements, hardening and end-to-end validation.

- [ ] T060 [P] Implement multi-tab progress synchronization in `src/scripts/storage.js` (`BroadcastChannel('progress')` with `storage` fallback; deterministic ordering by `(updatedAt, seq, tabId)`) — FR-030
- [ ] T061 [P] Handle incompatible persisted `schemaVersion` by discarding state and applying defaults in `src/scripts/storage.js` — FR-024
- [ ] T062 [P] Implement tab focus-loss pause and the explicit resume overlay in `src/scripts/player.js` — FR-013, FR-019
- [ ] T063 [P] Polish the manifest failure error screen (no blank page, accessible, actionable) in `index.html` + `src/styles/player.css` — FR-023
- [ ] T064 Run Lighthouse CI and resolve budget regressions (LCP/CLS/asset/code budgets) — SC-014, SC-015, SC-019
- [X] T064a [P] Add a frame-rate gate: measure transition FPS on the SC-001 reference device profile via a Playwright/Chrome DevTools performance trace (or rAF sampling) and fail when <60 fps; script at `tests/perf/fps.spec.js` — SC-018
- [ ] T065 [P] Add project documentation (run, validate, browser matrix) to `README.md` and confirm `docs/delivery.md` is current
- [ ] T066 Verify the compressed code budget (≤65 KB) and asset budgets in CI via `scripts/build.mjs` output — FR-029, SC-014
- [ ] T066a [P] Add an external-origin check to `scripts/build.mjs` (fail the build if `index.html`, CSS or JS reference http(s) origins outside the deployment origin — no trackers/third-party embeds) — FR-035, Constitution Restrições
- [ ] T067 [P] Audit the `story-manifest.schema.json` + referential-integrity validator against the real narrative content — FR-025, SC-016
- [ ] T068 Execute the full quickstart VS-1..VS-10 validation and record results in `specs/001-cinematic-player/quickstart.md` notes — SC-022
- [ ] T069 [P] WCAG 2.2 AAA audit (contrast, target size, focus, status messages, language) and fix findings — FR-008, SC-004, SC-017, SC-013
- [ ] T070 Run the full Playwright suite on the declared browser/viewport matrix and fix failures — FR-027, SC-022

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**.
- **User Stories (Phase 3–6)**: All depend on Foundational.
  - Can proceed in parallel once Foundational completes.
  - Or sequentially in priority order (P1 → P2 → P3 → P4).
- **Polish (Phase 7)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational. No dependency on other stories.
- **US2 (P2)**: After Foundational. Integrates with US1's player pause/advance but is independently testable.
- **US3 (P3)**: After Foundational. Refines US1 rendering/layout; independently testable.
- **US4 (P4)**: After Foundational. Hooks into US1/US2 pause and rendering; independently testable.

### Within Each User Story

- Tests written and failing before implementation.
- State machine/loader before rendering before integration.
- `player.js` tasks are sequential (same file); CSS/asset/UI tasks in other files may parallelize.

### Parallel Opportunities

- Setup: T003, T004, T005 in parallel after T001/T002.
  - Foundational: T007, T009, T010, T015 in parallel; T011–T014 form a dependency chain on the manifest contract.
  - US1: tests T016–T019 and T054a in parallel; CSS task T023 can proceed alongside `player.js` work.
- US2: tests T030–T032 and T032a in parallel; `src/scripts/audio.js` work is sequential.
  - US3: tests T043–T044 in parallel; T046/T049/T051 touch separate files.
  - US4: tests T052–T054 and T053b in parallel (T053a shares `a11y.spec.js` with T053 — run sequentially).
  - Polish: T060, T061, T062, T063, T065, T066a, T067, T069 in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must fail first):
Task: "E2E auto-advance and order in tests/e2e/playback.spec.js"
Task: "E2E manual navigation in tests/e2e/navigation.spec.js"
Task: "E2E end-of-story overlay in tests/e2e/end-state.spec.js"
Task: "E2E resume in tests/e2e/resume.spec.js"
```

```bash
# After the state machine exists, run file-separated work in parallel:
Task: "Cinematic transitions in src/styles/player.css"
Task: "Responsive asset selection in src/scripts/player.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks everything).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run VS-1, VS-5, VS-10 independently.
5. Deploy/demo the silent cinematic player.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate → deploy (MVP: silent cinematic playback).
3. US2 → validate VS-2/VS-7/VS-8 → deploy (audio).
4. US3 → validate VS-3 + budgets → deploy (device coverage).
5. US4 → validate VS-4 → deploy (accessibility).
6. Polish → VS-9, multi-tab, Lighthouse, full matrix.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: US1 (player core)
   - Developer B: US2 (audio)
   - Developer C: US3 (responsive/delivery)
   - Developer D: US4 (accessibility)
3. Integrate and run the full Playwright/Lighthouse gates.

---

## Notes

- [P] tasks touch different files and have no incomplete dependencies.
- Every implementation/test task maps to FR/SC identifiers; infra tasks
  (T001–T010, T015, T065) serve the constitution’s quality gates and plan
  structure rather than a single FR/SC.
- Verify each test fails before implementing.
- Commit after each task or logical group.
- Stop at each checkpoint to validate a story independently.
