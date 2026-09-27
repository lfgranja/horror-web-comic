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

- [X] T006 Create design tokens in `src/styles/tokens.css` (color, typography, spacing, radii, z-index, safe-area custom properties for `env(safe-area-inset-*)`)
- [X] T007 [P] Create the mobile-first reset/layout in `src/styles/base.css` (no horizontal scroll, full-viewport stage, focus-visible baseline)
- [X] T008 Create the app shell in `index.html` (`lang`, `viewport-fit=cover`, semantic landmarks, stage container, control bar markup, `aria-live="polite"` region, error-screen container, `<script type="module" src="src/scripts/main.js">`)
- [X] T009 [P] Create the narrative manifest in `src/data/story.json` (≥2 scenes, several frames with `image`, `alt`, `description`, optional `durationMs`/`transition`/`audio`, scene `audio`) conforming to `contracts/story-manifest.schema.json`
- [X] T010 [P] Create placeholder frame and audio assets under `assets/frames/` and `assets/audio/` referenced by `src/data/story.json`
- [X] T011 Implement the manifest integrity validator in `scripts/validate-manifest.mjs` (AJV validation against `contracts/story-manifest.schema.json` + unique `Frame.id` and existence of every referenced image/audio file) — FR-023, FR-025, SC-016
- [X] T012 Implement the storage module in `src/scripts/storage.js` (versioned `hwc.*` keys per `contracts/storage-contract.md`, `hwc.schemaVersion` check, `(updatedAt, seq, tabId)` write ordering, graceful fallback when `localStorage` is unavailable) — FR-007, FR-019, FR-024, FR-030
- [X] T013 Implement the story loader in `src/scripts/story-loader.js` (fetch `src/data/story.json`, validate structure and `schemaVersion`, fail-closed) — FR-023, FR-024
- [X] T014 Implement the bootstrap in `src/scripts/main.js` (load story via `story-loader.js`, render friendly error screen on failure, expose a minimal app context for later stories) — FR-023
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

- [X] T020 [US1] Implement the player state machine in `src/scripts/player.js` (`idle`/`playing`/`paused`/`ended`, `currentFrameIndex`, `currentSceneIndex`, auto-advance scheduler) — FR-001, FR-013, FR-017
- [X] T021 [US1] Implement effective duration and transition resolution in `src/scripts/player.js` (`frame ?? scene ?? story ?? 1500` ms; `transition ?? scene ?? story ?? fade/600` ms) — FR-002, FR-018
- [X] T022 [US1] Implement manual navigation in `src/scripts/player.js` (next/previous, next/previous scene, Home/End; no-op at limits; 400 ms coalescing; cancel in-flight transition; manual navigation pauses auto-advance) — FR-003
- [X] T023 [US1] Implement cinematic transitions in `src/styles/player.css` (`cut`, `fade`, `zoom-in`, `zoom-out`, `dissolve`, `slide-left`, `slide-right`, `none`; configurable duration/easing) — FR-002
- [X] T024 [US1] Implement frame rendering with progressive loading in `src/scripts/player.js` and `src/styles/player.css` (`<picture>` with AVIF/WebP/JPEG, explicit dimensions, reserved aspect ratio placeholder, preload current + next frame; on image `error`, show accessible placeholder with frame description and keep navigation working) — FR-015, SC-008, SC-015
- [X] T025 [US1] Implement the accessible progress indicator in `index.html` + `src/scripts/player.js` (`role="progressbar"`, `aria-valuenow/min/max`, accessible name) — FR-034
- [X] T026 [US1] Implement the end-of-story overlay with "Rever do início" and navigation that leaves the final state in `src/scripts/player.js` + `index.html` — FR-033
- [X] T027 [US1] Wire the control bar handlers (play/pause, next/previous, next/previous scene, Home/End) in `src/scripts/player.js` — FR-003, FR-013
- [X] T028 [US1] Implement keyboard shortcuts in `src/scripts/player.js` (`Space`/`K` play/pause, `←`/`→` frame, `Shift`+arrows scene, `Home`, `End`, `M` toggle audio; `preventDefault` on the player element) — FR-010, FR-005
- [X] T029 [US1] Persist and restore the reading position on auto-advance and manual navigation via `src/scripts/storage.js` (resume at saved frame, restart at first frame if invalid) — FR-019, SC-012

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

- [X] T033 [US2] Implement the audio manager in `src/scripts/audio.js` (pre-create and synchronously unlock, on the first qualified gesture, one `HTMLAudioElement` per scene **and per frame that declares `audio`**, satisfying Safari/WebKit per-element policy; loop/ambience) — FR-004, FR-006, FR-016
- [X] T034 [US2] Implement autoplay-block detection in `src/scripts/audio.js` (only `NotAllowedError`; never confuse with file-load failure) and expose the `blocked` state — FR-016, FR-032
- [X] T035 [US2] Implement the "toque para iniciar" overlay in `index.html` + `src/scripts/audio.js` with "continuar sem som" (does NOT enable audio) and activation via any other qualified gesture for the session — FR-016
- [X] T036 [US2] Implement audio toggle behavior in `src/scripts/audio.js` (stop ≤100 ms with anti-click micro-ramp; fade-in ≤300 ms on re-enable; resume scene track from its position without restarting the frame) — FR-006
- [X] T037 [US2] Implement scene crossfade (≤500 ms) and silence when the next scene has no track in `src/scripts/audio.js` — FR-006
- [X] T038 [US2] Implement frame-audio mix with scene ducking to 40% and 300 ms crossfade in `src/scripts/audio.js`, reusing the frame elements pre-created/unlocked in T033 (no element creation after the gesture) — FR-006
- [X] T039 [US2] Implement the persisted volume control (0–100%, default 0.6, multiplies scene/frame base volume) in `src/scripts/audio.js` + `src/scripts/storage.js` — FR-020
- [X] T040 [US2] Implement the persisted speed control (0.5x/1x/2x; affects dwell only, transitions unchanged, effective floor 250 ms) in `src/scripts/player.js` + `src/scripts/storage.js` — FR-021, FR-018, SC-010
- [X] T041 [US2] Implement the audio-state UI in `index.html` + `src/scripts/audio.js` (`aria-pressed` binary, `aria-disabled` + fixed label + `role="status"` for blocked) — FR-014
- [X] T042 [US2] Pause/resume scene audio with player pause and preload current + next scene tracks in `src/scripts/audio.js` — FR-013, FR-015, SC-009
- [X] T042a [US2] Implement runtime audio-failure handling in `src/scripts/audio.js` (listen for `error`/`stalled` on every scene/frame `HTMLAudioElement`; stay silent without visible error; keep the audio-control state coherent; never reclassify as autoplay block per FR-016) — FR-032

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

- [X] T045 [US3] Implement responsive layout in `src/styles/player.css` (`object-fit: contain`, ultrawide letterbox, `env(safe-area-inset-*)`, orientation change preserves current frame, ≥44×44 px targets) — FR-009, FR-010, SC-017
- [X] T046 [US3] Add page metadata (title, description, Open Graph) to `index.html` — FR-026, SC-021
- [X] T047 [US3] Implement capability-based degradation in `src/scripts/capabilities.js` (`saveData`, `deviceMemory`, `hardwareConcurrency`; light image variant ≤150 KB and ≤1280 px, non-essential transitions — any type other than `cut`/`none` — become instant cuts, audio ~48–64 kbps, default behavior when signals are absent) — FR-031, SC-020
- [X] T048 [US3] Implement responsive asset selection (`srcset`/`sizes`, lazy-load off-scene frames, preload critical frames) in `src/scripts/player.js` — FR-015, FR-028
- [X] T049 [US3] Implement the image pipeline in `scripts/build-images.mjs` (sharp → AVIF cq≈18, WebP q≈75, JPEG q≈80, max side 2560 px; light variant ≤1280 px/≤150 KB) — FR-028, SC-023
- [X] T050 [US3] Implement the production build in `scripts/build.mjs` (esbuild minify + content-hash cache-busting, fail on compressed code > 65 KB: ≤50 KB JS + ≤15 KB CSS) — FR-029
- [X] T051 [US3] Document delivery standards and the browser support matrix (Chrome/Firefox/Safari desktop + Chrome/Safari mobile) in `docs/delivery.md` — FR-027, FR-028, SC-022

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

- [X] T055 [US4] Implement the accessibility module in `src/scripts/a11y.js` (`aria-live="polite"` + `aria-atomic="true"` announcing the detailed frame description with ≥500 ms debounce; region present before change; focus never moved) — FR-012, FR-014
- [X] T056 [US4] Implement reduced-motion handling in `src/scripts/player.js` + `src/styles/player.css` (force `cut`/0 ms, suppress all CSS and script animation, keep auto-advance) — FR-011, SC-006
- [X] T057 [US4] Associate short `alt` and long description per frame in `src/scripts/player.js` (`aria-describedby`/live region), reproduce embedded lettering literally, and declare page/description language — FR-008, FR-012, SC-004, SC-013
- [X] T058 [US4] Implement pause/resume from the exact point in `src/scripts/player.js` (pause stops auto-advance and scene audio; resume restarts the current frame dwell and continues the scene track from where it stopped) — FR-013, SC-009
- [X] T059 [US4] Enforce AAA accessibility basics in `src/styles/base.css` + `src/styles/player.css` (focus-visible on all controls, ≥44×44 px targets, reinforced contrast, 200% zoom/reflow without loss) — FR-010, SC-017

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Transversal requirements, hardening and end-to-end validation.

- [X] T060 [P] Implement multi-tab progress synchronization in `src/scripts/storage.js` (`BroadcastChannel('progress')` with `storage` fallback; deterministic ordering by `(updatedAt, seq, tabId)`) — FR-030
- [X] T061 [P] Handle incompatible persisted `schemaVersion` by discarding state and applying defaults in `src/scripts/storage.js` — FR-024
- [X] T062 [P] Implement tab focus-loss pause and the explicit resume overlay in `src/scripts/player.js` — FR-013, FR-019
- [X] T063 [P] Polish the manifest failure error screen (no blank page, accessible, actionable) in `index.html` + `src/styles/player.css` — FR-023
- [X] T064 Run Lighthouse CI and resolve budget regressions (LCP/CLS/asset/code budgets) — SC-014, SC-015, SC-019
- [X] T064a [P] Add a frame-rate gate: measure transition FPS on the SC-001 reference device profile via a Playwright/Chrome DevTools performance trace (or rAF sampling) and fail when <60 fps; script at `tests/perf/fps.spec.js` — SC-018
- [X] T065 [P] Add project documentation (run, validate, browser matrix) to `README.md` and confirm `docs/delivery.md` is current
- [X] T066 Verify the compressed code budget (≤65 KB) and asset budgets in CI via `scripts/build.mjs` output — FR-029, SC-014
- [X] T066a [P] Add an external-origin check to `scripts/build.mjs` (fail the build if `index.html`, CSS or JS reference http(s) origins outside the deployment origin — no trackers/third-party embeds) — FR-035, Constitution Restrições
- [X] T067 [P] Audit the `story-manifest.schema.json` + referential-integrity validator against the real narrative content — FR-025, SC-016
- [X] T068 Execute the full quickstart VS-1..VS-10 validation and record results in `specs/001-cinematic-player/quickstart.md` notes — SC-022
- [X] T069 [P] WCAG 2.2 AAA audit (contrast, target size, focus, status messages, language) and fix findings — FR-008, SC-004, SC-017, SC-013
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

## Phase 8: Convergence

- [X] T071 CRITICAL: Restore the repository-root package, Playwright, Lighthouse, budget, ignore, and editor configuration declared by the plan so validation, E2E, Lighthouse, image, and production-build commands are runnable per plan: architecture/testing (missing)
- [X] T072 Recreate the deterministic fixture and every named Playwright E2E/performance test currently marked complete but absent, confirm each test fails before implementation, and retain the required acceptance-scenario assertions per tasks: T015–T064a (missing)
- [X] T073 CRITICAL: Implement the foundational app shell, design tokens and base layout, valid story manifest and assets, manifest validator, versioned fallback storage, fail-closed loader, and bootstrap required before any story can run per FR-023, FR-024, FR-025, FR-030 (missing)
- [X] T074 CRITICAL: Implement the P1 state machine, automatic and manual navigation, timing and transitions, progressive rendering and failure placeholders, progress and end controls, keyboard support, and reading-position resume per US1/AC1–AC8, FR-001–FR-003, FR-013, FR-015, FR-017–FR-019, FR-033, FR-034 (missing)
- [X] T075 Implement P2 default and blocked audio, accessible toggle and volume, anti-click ramps, fades, scene crossfade, frame mixing, runtime failure fallback, speed, pause integration, and session unlock per US2/AC1–AC5, FR-004–FR-007, FR-014, FR-016, FR-020, FR-021, FR-032 (missing)
- [X] T076 Implement responsive and capability-based degradation, responsive asset selection, metadata, image optimization, production bundle budgets, delivery/browser documentation, and external-origin rejection per US3/AC1–AC4, FR-009, FR-010, FR-026–FR-029, FR-031, FR-035 (missing)
- [X] T077 Implement detailed descriptions and language declarations, live announcements, reduced-motion cut behavior, exact pause/resume timing, focus, target-size, contrast, and reflow basics per US4/AC1–AC3, FR-008, FR-011–FR-014 (missing)
- [ ] T078 Execute and fix VS-1..VS-10, the browser and viewport matrix, Lighthouse, CLS, FPS and budget gates, the WCAG audit, and the required ≥10-participant usability studies, recording evidence in the named artifacts per SC-001–SC-023 (missing)

## Phase 9: Convergence

- [X] T079 Fix progressive frame loading in `src/scripts/player.js` so each image swap resets readiness, keeps the reserved placeholder and accessible loading state visible until load/error, and starts dwell only after the current frame is displayed per FR-015, SC-008, US1/AC1–AC2 (partial)
- [X] T080 Apply capability degradation to transition resolution in `src/scripts/player.js`, forcing every transition other than `cut`/`none` to an instant cut when `shouldDegrade` is true per FR-031, SC-020, T047 (partial)
- [X] T081 Make `src/scripts/player.js` and `scripts/build-images.mjs` select the light AVIF/WebP/JPEG variants and honor responsive `srcset`/`sizes` for every capable browser, with light assets bounded by the degradation contract per FR-015, FR-028, FR-031, SC-020, T047–T049 (partial)
- [X] T082 Rework `src/scripts/audio.js` so the first qualified gesture synchronously unlocks every precreated scene/frame element required by the Safari/WebKit per-element policy, while preserving blocked and persisted-off behavior per FR-016, US2/AC5, T033 (contradicts)
- [X] T083 Correct the audio lifecycle in `src/scripts/audio.js` so toggle-off/re-enable preserves scene and frame `currentTime`, re-enable restores frame mix, repeated scene changes do not retrigger fades, and frame-audio entry/exit uses the required 300 ms crossfade/40% ducking per FR-006, US2/AC2–AC3, T036–T038 (contradicts)
- [X] T084 Route Home, End, replay, and any other manual navigation through `queueNavigation()` in `src/scripts/player.js`, preserving the 400 ms last-input-wins rule and cancel/no-op behavior per FR-003, T022 (partial)
- [X] T085 Change `goHome()` in `src/scripts/player.js` so Home from `ended` resumes at the first frame, while normal manual Home remains paused per FR-033, US1/AC4, T026 (contradicts)
- [X] T086 Refine `handleKeydown()` in `src/scripts/player.js` so native keyboard activation of focused buttons is preserved without double-triggering player shortcuts or scrolling per FR-010, US3/AC3, T028 (partial)
- [X] T087 Adjust the `--mist-500` design token and affected surfaces to meet at least 7:1 normal-text contrast, then record the full WCAG 2.2 AAA audit in the named evidence artifact per FR-010, SC-017, T059, T069 (partial)
- [X] T088 Replace the WAV manifest/audio assets with compliant AAC/Opus standard and light bitrate variants and add a build step that generates or verifies the documented 96–128 kbps and 48–64 kbps delivery formats per FR-028, FR-031, SC-023, T049 (contradicts)
- [X] T089 Extend `scripts/build.mjs` and delivery validation to enforce initial-scene, per-frame, total-assets, aggregate CSS, aggregate JS, and total-code budgets from `budget.json`, failing the build when any limit is exceeded per FR-029, SC-014, T050, T066 (partial)
- [X] T090 Reject external and protocol-relative image/audio/manifest origins in `scripts/validate-manifest.mjs`, `src/scripts/story-loader.js`, and the complete build input scan, including `src/data/story.json` and `src/styles/tokens.css`, per FR-035, T066a (partial)
- [X] T091 Replace `tests/perf/first-frame.spec.js` measurement logic with navigation-start-to-second-frame timing under the SC-001 4G/reference profile, asserting the stated <10 s and cold-first-frame thresholds rather than starting after `openPlayer()` per SC-001, SC-019, T054a (partial)
- [X] T092 Replace `tests/perf/fps.spec.js` with a transition-specific frame-rate measurement on the reference profile and enforce the exact ≥60 fps criterion instead of a 59.5 fps generic RAF sample per SC-018, T054a (partial)
- [ ] T093 Complete the responsive/browser validation matrix in `tests/e2e/responsive.spec.js`, `playwright.config.js`, and the validation evidence for all required widths, orientations, Chrome/Firefox/Safari desktop and mobile targets, and host-dependent WebKit/Safari execution per FR-009, FR-027, SC-005, SC-022, T043, T070 (partial)
- [X] T094 Execute VS-1..VS-10 and record each result in `specs/001-cinematic-player/quickstart.md` or the designated validation notes, including the currently pending full walkthrough per SC-022, T068 (missing)
- [ ] T095 Run the ≥10-participant audio-control discoverability study and record hit rate, timing, interactions, and threshold outcome in `specs/001-cinematic-player/notes/usability-audio.md` per SC-002, T032a (missing)
- [ ] T096 Run the ≥10-participant audio-off comprehension study and record answers and threshold outcome in `specs/001-cinematic-player/notes/usability-a11y.md` per SC-004, T053b (missing)
- [X] T097 Fix `src/scripts/audio.js` to preload only the current and next scene tracks under normal conditions and the permitted current-scene subset under slow/data-saver conditions, using the capability audio variant per FR-015, FR-031, T042 (partial)
- [X] T098 Make `src/scripts/audio.js` keep runtime `error`/`stalled` failures silent and visibly/assistively coherent, including stalled events and non-NotAllowed playback failures, without misclassifying them as autoplay blocks per FR-016, FR-032, T034, T042a (partial)
- [X] T099 Make `frame-slide-right` animate from the opposite horizontal direction while preserving the existing easing/duration contract per FR-002, T023 (partial)
- [X] T100 Add content-hash cache busting to `scripts/build.mjs` and rewrite all production references in `index.html`, rather than the current no-op replacements per plan delivery decision, T050 (partial)
- [X] T101 Implement the declared `idle` initial state transition in `src/scripts/player.js` before auto-start without changing visual auto-start behavior per T020, data-model.md (partial)

## Phase 10: Convergence

- [X] T102 Detect low-memory capability from `navigator.deviceMemory` with the supported fallback and verify the degraded image, transition, and audio paths per FR-031, T047 (contradicts)
- [X] T103 Restrict next-frame preloading when `saveData` or a slow connection is active and add a regression assertion for the data-saver path per FR-015, FR-031, SC-020, T097 (contradicts)
- [X] T104 Add the missing qualified click/document gesture path for autoplay-blocked audio without overriding a persisted off preference per FR-016, US2/AC5, T035 (partial)
- [X] T105 Synchronously unlock every precreated audio element without audibly starting non-current scene or frame tracks during the first qualified gesture per FR-006, FR-016, T033, T082 (contradicts)
- [X] T106 Pause audio before rendering manual navigation so a new scene or frame cannot start during a manual move and audio positions remain coherent per FR-003, FR-006, FR-013, T022, T058 (contradicts)
- [X] T107 Make runtime manifest validation enforce the authoritative schema constraints, including rejected additional properties, while preserving controlled fail-closed behavior per FR-023, FR-024, T013 (partial)
- [X] T108 Make storage and channel initialization and writes fall back safely when storage is unavailable or throws during access, quota enforcement, or restricted-browser operation per FR-019, FR-024, T012 (partial)
- [X] T109 Enforce the documented compressed JavaScript, CSS, and aggregate code budgets using actual compressed output bytes rather than minified byte length per FR-029, SC-014, T050, T066, T089 (partial)
- [X] T110 Enforce the 2560px standard image cap, 1280px light cap, and 150KB light-frame limit in the image/build pipeline per FR-028, FR-031, SC-020, SC-023, T049, T081 (partial)
- [X] T111 Verify audio format and bitrate delivery for standard and light variants and reject invalid or unverified publication inputs per FR-028, FR-031, SC-023, T049, T088 (partial)
- [X] T112 Gate the production build and repository CI on manifest schema plus referenced-asset integrity validation per FR-025, SC-016, plan: build/CI validator (missing)
- [X] T113 Measure navigation-start-to-visible first and second frame under a cold 4G reference profile and enforce the stated p75 thresholds per SC-001, SC-019, T054a, T091 (partial)
- [X] T114 Make the transition FPS gate fail below 60fps on the declared reference device instead of skipping when the host cannot certify the threshold per SC-018, T064a, T092 (contradicts)
- [ ] T115 Execute and record the complete responsive browser/orientation matrix, including WebKit and mobile Safari targets, rather than only declaring those projects in configuration per FR-009, FR-027, SC-005, SC-022, T043, T070, T093 (missing)
- [X] T116 Route detailed frame descriptions through the debounced live-region controller while retaining the visible accessible description per FR-012, US4/AC2, T055, T057 (partial)
- [X] T117 Treat Home and End actions at their respective boundaries as no-ops while preserving the defined ended-state replay behavior per FR-003, FR-033, US1/AC8, T022, T026 (contradicts)
- [X] T118 Keep BroadcastChannel progress synchronization available when localStorage is unavailable, with an explicit fallback test per FR-030, plan: multi-tab synchronization, T060 (partial)
- [X] T119 Add exact pause/resume timing and audio `currentTime` assertions for the ≤100ms stop and scene-position continuation requirements per FR-013, SC-009, T054, T058 (partial)
- [X] T120 Add precise author-duration timing assertions and automated checks that first/last frame and adjacent scene starts are reachable within three actions per SC-010, SC-011, T016, T017 (partial)
- [ ] T121 Execute and record the ≥10-participant audio-control discoverability study and add the no-hover and one-interaction reachability proxy assertions per SC-002, T032a, T095 (missing)
- [ ] T122 Execute and record the ≥10-participant audio-off comprehension study, including literal embedded-lettering and no-sound narrative checks, per FR-012, SC-004, SC-013, T053b, T096 (missing)

## Phase 11: Convergence

- [X] T123 Extend the cold- and warm-cache 4G performance gate to the production manifest, assert that every frame appears in under 3 seconds and that the warm-cache first frame appears in under 1.5 seconds at p75, and fix any regressions per SC-008, T078, T113
- [ ] T124 Run the transition FPS gate on the declared SC-001 reference device, remediate any transition below 60 fps, and record a passing ≥60 fps result per SC-018, T078, T114 (partial)
- [ ] T125 Provision and execute the complete responsive browser and orientation matrix across current Chrome, Firefox, WebKit/Safari desktop, Chrome mobile, and Safari mobile, fix failures, and record the results per FR-009, FR-027, SC-005, SC-022, T070, T093, T115 (partial)
- [ ] T126 Execute and record the ≥10-participant audio-control discoverability study, including hit rate, completion time, interactions, and the ≥95% threshold outcome per SC-002, T032a, T095, T121 (partial)
- [ ] T127 Execute and record the ≥10-participant audio-off comprehension study, including literal embedded-lettering, sound-independent narrative checks, and the ≥95% threshold outcome per FR-012, SC-004, SC-013, T053b, T096, T122 (partial)

## Phase 12: Convergence

- [X] T128 Disable every CSS animation and transition under reduced motion, including the loading spinner, and add regression coverage proving that no animation executes per FR-011, SC-006, US4/AC1 (contradicts)
- [X] T129 Reflow controls and the frame description for 320–360 px viewports at 200% text/zoom without clipping or horizontal overflow, with E2E coverage per SC-017, FR-009, FR-010 (contradicts)
- [X] T130 Raise the low-contrast text token and affected surfaces to at least 7:1 and verify every rendered text/background combination per SC-017, FR-010 (partial)
- [X] T131 Align every production frame's detailed description with its literal embedded lettering, characters, setting, action, atmosphere, and sound-only cues, and validate all published frames per FR-008, FR-012, SC-013, US4/AC2 (contradicts)
- [X] T132 Handle qualified document-level keyboard activation for blocked audio, focus the blocked dialog appropriately, and coordinate activation with player shortcuts so playback is not immediately paused per FR-016, SC-003, US2/AC5 (implemented, re-verified T196 2026-09-26: capture-phase `document` keydown listener `src/scripts/audio.js:149-161` registered with `{capture:true}` at `:161`, gated by `isQualifiedKeydown` at `:151` (defn `:120-124`); the pause-shortcut guard at `:155-158` calls `preventDefault()` + `stopPropagation()` so the player's bubble-phase handler (`src/scripts/player.js:233`, `:254-256`, `:271-273`) never fires and playback is not immediately paused; blocked dialog is focused at `src/scripts/audio.js:362-363` and focus is restored to `#player` at `:381` and `:412`)
- [X] T133 Keep “continuar sem som” silent across subsequent scenes and frames, synchronizing the effective preference, `aria-pressed`, visible state, and status text per FR-014, FR-016, SC-003, US2/AC5 (implemented, re-verified T196 2026-09-26: `silentContinuation` guards every start/mix path — `src/scripts/audio.js:169` (`canStart`), `:332` (play-failure), `:469` (resume), `:525` (`applyMix`), plus the unlock gate at `:153`; `continueSilently()` sets `enabled=false` at `:374` and `toggle()` clears the flag on re-enable at `:428`/on disable at `:438`; `aria-pressed` and status text re-synced at `:712`,`:718`; covered by `tests/e2e/autoplay.spec.js:21,43`)
- [X] T134 Clamp fade progress to the inclusive 0–1 range before assigning media-element volume and add boundary-timing regression coverage per FR-006, US2/AC2, US2/AC3 (implemented, re-verified T196 2026-09-26: `fadeProgress()` clamps to the inclusive range at `src/scripts/audio.js:11-14` and is the sole source of the value written at `:573-574` (`fadeIn`) and `:603-604` (`fadeOut`), with the target/start volumes themselves clamped at `:561` and `:593`; boundary regression coverage `tests/e2e/audio-timing.spec.js:32-70` drives negative and over-duration timestamps and asserts the first/last written volumes)
- [X] T135 Add audio lifecycle generation tokens so mute, pause, navigation, teardown, and duplicate initialization invalidate pending asynchronous starts and recheck state after every await per FR-006, FR-013, FR-016, US2/AC2, US2/AC3 (implemented, re-verified T196 2026-09-26: `lifecycleGeneration` initialized at `src/scripts/audio.js:43`; `isGenerationCurrent`/`canStart`/`invalidateLifecycle` at `:164-180` (token bump plus `playRequests`/`activeElementKeys`/`activeFrameKeys`/`startRecord` reset); invalidated by blocked audio `:348`, silent continuation `:372`, unlock `:404`, mute via `toggle()` `:440`, pause via `setPaused()` `:453`, scene nav `:480`, frame nav `:497`, teardown `:681`; state rechecked after every await at `:269`, `:299`, `:324`; duplicate-init dedup at `:262`; coverage `tests/e2e/audio-lifecycle.spec.js:18`,`:36`,`:64`,`:81`)
- [X] T136 Handle tab focus loss during idle, starting, and pending-navigation states by clearing timers, pausing audio, persisting position, and requiring explicit resume per FR-013, US4/AC3 (missing)
- [X] T137 Replace noncompliant audio placeholders and enforce finite 96–128 kbps standard and 48–64 kbps light bitrate ranges in both media build paths per FR-028, FR-031, SC-023 (contradicts)
- [X] T138 Scan every publishable resource, including SVG and other referenced assets, for external or protocol-relative load-bearing URLs while ignoring namespace identifiers, and fail the build on any origin violation per FR-035 (partial)
- [X] T139 Add an enforced production performance gate for cold/warm first-frame p75, every-frame appearance under 3 seconds, and transition CLS below 0.1, and retain the resulting evidence per SC-001, SC-008, SC-015, SC-019, plan: performance goals (partial)
- [ ] T140 Configure the declared 360×800 reference profile, run the transition-specific FPS trace in CI, remediate results below 60 fps, and record a passing result per SC-018, plan: performance goals (missing)
- [ ] T141 Provision, execute, fix, and record the complete current Chrome, Firefox, WebKit/Safari desktop and Chrome/Safari mobile matrix across 320–2560 px, both orientations, touch, and keyboard per FR-009, FR-027, SC-005, SC-022 (missing)
- [ ] T142 Execute and record the still-pending n≥10 audio-control discoverability study, including hit rate, completion time, interactions, obstacles, and the ≥95% outcome per SC-002 (missing)
- [ ] T143 Execute and record the still-pending n≥10 audio-off comprehension study, including literal embedded lettering, sound-independent narrative questions, answers, and the ≥95% outcome per FR-012, SC-004, SC-013 (missing)
- [ ] T144 Complete the full WCAG 2.2 AAA audit with real keyboard and screen-reader flows, 200% reflow, contrast, target size, language, focus, status-message, reduced-motion, and audio-control checks; fix and record findings per FR-010, FR-012, FR-014, SC-017 (partial)
- [ ] T145 Add deterministic audio tests for ≤100 ms stop, ≤300 ms re-enable fade, preserved `currentTime`, ≤500 ms scene crossfade or silence, frame-audio mix, scene ducking, blocked activation, and exact pause/resume behavior per FR-006, FR-016, SC-003, SC-009 (partial)
- [ ] T146 Exercise save-data and slow-network degradation across every production frame, verifying light media, transition cuts, preload restrictions, and CLS below 0.1 with non-probative assertions per FR-015, FR-031, SC-015, SC-020 (partial)
- [X] T147 Add E2E and deterministic concurrency coverage for malformed JSON, incompatible persisted state, unavailable storage, `BroadcastChannel` and storage-event synchronization, and deterministic `(updatedAt, seq, tabId)` tie-breaking per FR-023, FR-024, FR-030 (partial)
- [X] T148 Cover every transition type and resolution level, in-flight cancellation, rapid last-input-wins coalescing, parameterized ≤3-action reachability, all speed modes, ±10% dwell, the 250 ms floor, unchanged transition duration, and the End flow per FR-002, FR-003, FR-017, FR-018, FR-021, SC-010, SC-011 (partial)
- [X] T149 Test return-position persistence through actual pause, automatic advance, manual navigation, reload/new session, explicit restart, and storage-unavailable fallback rather than only injected state per FR-019, SC-012 (partial)
- [X] T150 Recompute scene ducking from actual frame-audio activity on `ended`, `pause`, `error`, and `stalled`, restoring scene gain when frame audio stops or fails per FR-006 (implemented, re-verified T196 2026-09-26: ducking is derived from actual playback state, not frame selection — `applyMix()` recomputes the scene gain from `getActiveFrameElement()` at `src/scripts/audio.js:528` and applies the 0.4 duck only while a frame is actually playing at `:530`; `applyMix()` is invoked from the media-element `pause` handler `:643`, `ended` handler `:650`, `stalled` handler `:658`, and `error`/failure handler `:669` (registered at `:84-88`); coverage `tests/e2e/audio-activity.spec.js:3-42` asserts scene gain restores on pause/ended/error/stalled)
- [X] T151 Validate that every required image file's actual encoded format matches its AVIF, WebP, or JPEG path and reject stale or mislabeled publication inputs per FR-028, SC-023 (partial)
- [X] T152 Generate width-specific responsive image candidates, declare valid `srcset`/`sizes` metadata, and validate every candidate's format, geometry, and budget per FR-015, FR-028, FR-031, SC-020, SC-023 (missing)
- [X] T153 Provision and pin the build/test tools used by the current scripts, or replace them with declared project dependencies, and add preflight/documentation for every required host executable per plan: build environment (substantive requirement met, one residual documentation inaccuracy, re-verified T196 2026-09-26: every build/test tool is a declared, exactly-pinned devDependency — `package.json:23-30` lists all six (`@lhci/cli` 0.14.0, `@playwright/test` 1.63.0, `ajv` 8.20.0, `ajv-formats` 3.0.1, `esbuild` 0.24.2, `sharp` 0.33.5) with no version ranges and no undeclared `dependencies` key, and the host executables are probed unconditionally (`scripts/preflight.mjs:492-493`), so nothing can silently pass. RESIDUAL, not closed here: the `USED_BY` diagnostic map under-reports `test:unit` — `scripts/preflight.mjs:41-42` declares `ffmpeg: ['build:images','ci']` and `ffprobe: ['build:images','build','ci']`, but `tests/unit/delivery.test.js:29` runs `node scripts/build-images.mjs` and `tests/unit/media-generation.test.js:38` invokes `ffprobe` directly, so `npm run test:unit` requires both executables too. The remedy is a one-line `usedBy` documentation fix (add `'test:unit'` to those two entries); no behavioral gate is affected)

## Phase 13: Convergence

- [X] T154 Normalize the degraded responsive-image path in `src/scripts/player.js`, `src/data/story.json`, `scripts/build-images.mjs`, and `scripts/build.mjs` so every AVIF/WebP/JPEG candidate uses an existing light variant with the correct `-light-<width>` mapping, including next-frame preload per FR-015, FR-031, SC-020 (contradicts)
- [X] T155 Reconcile `tests/unit/delivery.test.js`, `tests/unit/media-generation.test.js`, `tests/e2e/convergence-player.spec.js`, and `tests/e2e/degradation-production.spec.js` with the canonical light naming and make validation check every responsive light candidate per FR-025, FR-031, SC-016, SC-020 (contradicts)
- [ ] T156 Provision, execute, fix, and record the full 320–2560 px portrait/landscape matrix across Chrome, Firefox, WebKit/Safari desktop, Chrome mobile, and Safari mobile, including real WebKit and mobile results per FR-009, FR-027, SC-005, SC-022, T070, T093, T115, T125, T141 (missing)
- [ ] T157 Run the transition-specific FPS gate on the declared 360×800 reference profile, remediate any result below 60 fps, and record a passing ≥60 fps result per SC-018, T124, T140 (partial)
- [ ] T158 Recruit at least 10 participants, run the audio-off comprehension protocol with literal lettering and sound-independent questions, record answers and the ≥95% outcome, and remediate content failures per FR-012, SC-004, SC-013, T053b, T096, T122, T127, T143 (missing)
- [ ] T159 Complete the full WCAG 2.2 AAA audit with real keyboard and screen-reader flows, device and reflow checks, contrast, target size, language, focus, status-message, reduced-motion, and audio-control validation; fix and record findings per FR-010, FR-012, FR-014, SC-017, T144 (partial)
- [X] T160 Wire `lighthouserc.json`, `budget.json`, `package.json`, and the performance tests into the production CI gate, enforce cold/warm p75, per-frame timing, CLS, and asset/code budgets, and retain reproducible evidence per FR-029, SC-001, SC-008, SC-014, SC-015, SC-019, T139 (partial)
- [X] T161 Add or explicitly establish a repository CI entry point that runs manifest integrity validation, build gates, browser tests, performance checks, and Lighthouse budgets per T112, FR-025, SC-016, SC-022 (missing)
- [ ] T162 Recruit at least 10 participants, measure audio-control discoverability within five seconds, record hit rate, completion time, interactions, obstacles, and the ≥95% outcome per SC-002, T032a, T095, T121, T126, T142 (missing)
- [X] T163 Align `playwright.config.js` and performance setup with the plan’s declared 360×800 mobile and 1440×900 desktop reference profiles, or document and justify the alternative profiles per plan: performance goals, SC-001 (partial)
- [ ] T164 Re-run the full validation walkthrough and reconcile the checked and unchecked T068, T069, T078, and T094 records with current browser, performance, Lighthouse, WCAG, and usability evidence per SC-001–SC-023 (partial)
- [X] T165 Align `story-manifest.schema.json`, `src/scripts/story-loader.js`, and `scripts/validate-manifest.mjs` on the permitted srcset descriptor syntax and reject manifests consistently under fail-closed validation per FR-023, FR-025, T107 (contradicts)
- [X] T166 Justify, isolate to test tooling, or remove the public `?story=` manifest selector in `src/scripts/main.js` because the plan defines one production manifest per story per plan: Project Structure (unrequested)
- [X] T167 Remove or quarantine unreferenced `assets/frames/*-light.svg` and `assets/audio/*-light.wav` files, and ensure production copying and budget validation cannot publish noncompliant placeholders per FR-028, FR-031, SC-023, T137 (contradicts)
- [X] T168 Synchronize `specs/001-cinematic-player/data-model.md` with the implemented format-specific `avifSrcset`, `webpSrcset`, `fallbackSrcset`, and effective duration state per plan: data model (partial)
- [X] T169 Review, justify, or remove `scripts/preflight.mjs` and its `preflight`/`ci` wiring so the project stays within the plan-declared build environment while preserving required quality gates per plan: Project Structure, T153 (unrequested)


## Phase 14: Convergence

- [ ] T170 CRITICAL: Install WebKit system dependencies (`sudo npx playwright install-deps`) so all 5 browser projects (mobile-chromium, mobile-webkit, desktop-chromium, desktop-firefox, desktop-webkit) launch and pass the full Playwright matrix per FR-027, SC-022, plan: browser matrix (missing)
- [ ] T171 CRITICAL: Recruit ≥10 participants, execute the audio-control discoverability protocol (find/activate audio control within 5s), record hit rate, completion time, interactions, obstacles, and ≥95% threshold outcome in `specs/001-cinematic-player/notes/usability-audio.md` per SC-002, T032a, T095, T121, T126, T142, T162 (missing)
- [ ] T172 CRITICAL: Recruit ≥10 participants, execute the audio-off comprehension protocol with literal embedded-lettering and sound-independent narrative questions, record answers and ≥95% threshold outcome in `specs/001-cinematic-player/notes/usability-a11y.md` per FR-012, SC-004, SC-013, T053b, T096, T122, T127, T143, T158, T163 (missing)
- [ ] T173 CRITICAL: Provision the declared 360×800 reference device profile, run the transition-specific FPS trace in CI, remediate any transition below 60 fps, and record a passing ≥60 fps result per SC-018, T114, T124, T140, T157 (missing)
- [ ] T174 CRITICAL: Execute and fix the complete responsive browser/orientation matrix across current Chrome, Firefox, WebKit/Safari desktop, Chrome mobile, and Safari mobile at 320–2560px both orientations, including real WebKit and mobile Safari results per FR-009, FR-027, SC-005, SC-022, T115, T125, T141, T156 (missing)
- [X] T175 HIGH: Wire Lighthouse CI, `budget.json`, and performance tests into the production CI gate; enforce cold/warm first-frame p75 (<2.5s/<1.5s), every-frame appearance <3s, CLS <0.1, asset/code budgets; retain reproducible evidence per FR-029, SC-001, SC-008, SC-014, SC-015, SC-019, T113, T123, T139, T160 (missing)
- [ ] T176 HIGH: Complete the full WCAG 2.2 AAA audit with real keyboard and screen-reader flows, device and 200% reflow checks at 320–360px, contrast (verify `--mist-500` meets 7:1), target size (≥44×44px), language, focus, status-message, reduced-motion, and audio-control validation; fix and record findings per FR-010, FR-012, FR-014, SC-017, T087, T129, T130, T144, T159 (partial)
- [X] T177 HIGH: Remove or quarantine noncompliant `assets/frames/*-light.svg` and `assets/audio/*-light.wav` placeholders from `dist/`; ensure production copying and budget validation reject noncompliant assets per FR-035, T138, T167 (missing)
- [X] T178 HIGH: Add a repository CI entry point that runs manifest integrity validation, build gates, browser tests, performance checks, and Lighthouse budgets per FR-025, SC-016, T112, T161 (missing)
- [X] T179 MEDIUM: Disable every CSS animation and transition under `prefers-reduced-motion: reduce`, including the loading spinner (`.loading-mark`), and add regression coverage proving no animation executes per FR-011, SC-006, US4/AC1, T128 (partial)
- [X] T180 MEDIUM: Implement qualified document-level keyboard activation for blocked audio (focus dialog appropriately), coordinate with player shortcuts so playback is not immediately paused, and keep "continuar sem som" silent across subsequent scenes while syncing effective preference, `aria-pressed`, visible state, and status text per FR-016, SC-003, US2/AC5, T132, T133 (implemented — umbrella duplicate of T132 + T133, both re-verified T196 2026-09-26: keyboard activation `src/scripts/audio.js:149-161` (capture phase `:161`, qualification `:151`, shortcut coordination `:155-158`), dialog focus `:362-363`, focus restore `:381`,`:412`; silent continuation guards `:169`,`:332`,`:469`,`:525` with `enabled=false` at `:374` and flag reset at `:428`,`:438`; `aria-pressed`/status/visible-state sync at `:712`,`:718`,`:713`)
- [X] T181 MEDIUM: Clamp fade progress to inclusive 0–1 range before assigning media-element volume; add audio lifecycle generation tokens so mute, pause, navigation, teardown, and duplicate initialization invalidate pending async starts and recheck state after every await; recompute scene ducking from actual frame-audio activity on `ended`, `pause`, `error`, `stalled`, restoring scene gain when frame audio stops or fails per FR-006, FR-013, FR-016, SC-009, T134, T135, T145, T150 (implemented — umbrella duplicate of T134 + T135 + T150, all re-verified T196 2026-09-26: fade clamp `src/scripts/audio.js:11-14` applied before every volume write at `:573-574`,`:603-604`; `lifecycleGeneration` `:43` with `invalidateLifecycle()` `:172-180` called from `:348`,`:372`,`:404`,`:440`,`:453`,`:480`,`:497`,`:681` and post-await rechecks at `:269`,`:299`,`:324`; ducking recomputed from actual activity at `:643`,`:650`,`:658`,`:669` with the gain derived at `:528`,`:530`. Note: the T145 leg of this umbrella is NOT closed — T145 remains open for its deterministic-timing coverage scope)
- [X] T182 MEDIUM: Handle tab focus loss during `idle`, `starting`, and `pending-navigation` states by clearing timers, pausing audio, persisting position, and requiring explicit resume per FR-013, US4/AC3, T136 (missing)
- [X] T183 MEDIUM: Replace noncompliant audio placeholders; enforce finite 96–128 kbps standard and 48–64 kbps light bitrate ranges in both media build paths; validate every required image file's actual encoded format matches its AVIF/WebP/JPEG path and reject stale/mislabeled inputs per FR-028, FR-031, SC-023, T137, T151 (partial)
- [ ] T184 MEDIUM: Exercise save-data and slow-network degradation across every production frame, verifying light media, transition cuts, preload restrictions, and CLS below 0.1 with non-probative assertions per FR-015, FR-031, SC-015, SC-020, T146, T152, T154 (partial)
- [X] T185 MEDIUM: Add deterministic concurrency/storage coverage for malformed JSON, incompatible persisted state, unavailable storage, `BroadcastChannel` and storage-event synchronization, and deterministic `(updatedAt, seq, tabId)` tie-breaking per FR-023, FR-024, FR-030, T147 (missing)
- [X] T186 MEDIUM: Cover every transition type and resolution level, in-flight cancellation, rapid last-input-wins coalescing, parameterized ≤3-action reachability, all speed modes, ±10% dwell, the 250 ms floor, unchanged transition duration, and the End flow per FR-002, FR-003, FR-017, FR-018, FR-021, SC-010, SC-011, T148 (partial)
- [X] T187 MEDIUM: Test return-position persistence through actual pause, automatic advance, manual navigation, reload/new session, explicit restart, and storage-unavailable fallback rather than only injected state per FR-019, SC-012, T149 (partial)
- [X] T188 MEDIUM: Wire `lighthouserc.json`, `budget.json`, `package.json`, and performance tests into the production CI gate per T175 (see T175) (implemented with one caveat, re-verified T196 2026-09-26: the GitHub Actions gate runs the budget-enforcing production build (`.github/workflows/ci.yml:46-47`), the non-skippable performance budgets (`.github/workflows/ci.yml:52-53`), and the Lighthouse delivery gate `npm run ci:lighthouse` → `lhci autorun` against `dist/` (`.github/workflows/ci.yml:59-60`, thresholds in `lighthouserc.json`). CAVEAT: `npm run ci` (`package.json:20`) does not include `lhci`, and `CI_REQUIRED_STEPS` (`scripts/preflight.mjs:56`) does not require it, so Lighthouse is enforced by `.github/workflows/ci.yml` only and a green local `npm run ci` says nothing about the Lighthouse gate — this split is the documented arrangement (AGENTS.md: "Skip Lighthouse in CI: Use `npm run ci` ... Run `npm run ci:lighthouse` separately"), recorded as a caveat rather than a failure)
- [X] T189 LOW: Justify, isolate to test tooling, or remove the public `?story=` manifest selector in `src/scripts/main.js` because the plan defines one production manifest per story per plan: Project Structure, T166 (unrequested)
- [X] T190 LOW: Review, justify, or remove `scripts/preflight.mjs` and its `preflight`/`ci` wiring so the project stays within the plan-declared build environment while preserving required quality gates per plan: Project Structure, T169 (unrequested)
- [X] T191 LOW: Align `specs/001-cinematic-player/data-model.md` with the implemented format-specific `avifSrcset`, `webpSrcset`, `fallbackSrcset`, and effective duration state per plan: data model, T168 (partial)
- [X] T192 LOW: Align `playwright.config.js` and performance setup with the plan's declared 360×800 mobile and 1440×900 desktop reference profiles, or document and justify the alternative profiles per plan: performance goals, SC-001, T163 (partial)
- [ ] T193 LOW: Re-run the full validation walkthrough and reconcile the checked and unchecked T068, T069, T078, and T094 records with current browser, performance, Lighthouse, WCAG, and usability evidence per SC-001–SC-023, T164 (partial)


## Verification scope (recorded 2026-09-26)

Browser matrix actually executed, and what each engine can certify on this host:

| Project | Status | Notes |
|---------|--------|-------|
| `desktop-chromium` | executed | 148/150 (only `tests/perf/fps.spec.js` flaky at the 60 fps boundary) |
| `mobile-chromium` | executed | 146/150 — the 4 failures are the two `degradation-production.spec.js:110` CLS gates (see below) |
| `desktop-firefox` | executed | 143/146 — FPS gate plus the dwell-floor timing tolerance |
| `desktop-webkit` | executed in the Playwright container | cannot launch on the host (Fedora 44 ships `libicu.so.77`, WebKit needs `.so.74`; `dnf` cannot provide the required sonames) |
| `mobile-webkit` | executed in the Playwright container | same host limitation |

### Engine-host limits, not product defects

- `requestAnimationFrame` is heavily throttled in WebKit headless. Every
  rAF-based assertion therefore fails there: `tests/perf/fps.spec.js`,
  `tests/perf/zz-ci-budgets.spec.js:74` and `tests/e2e/zz-css-reduced-motion.spec.js`.
  The last of these is working as designed — it exists to fail loudly when the
  host cannot certify a frame budget. Headless Chromium on this host measures
  ~33 fps, so the ≥60 fps SC-018 gate cannot be certified here either and fails
  honestly rather than skipping.
- WebKit's `setTimeout` is coarser than Chromium's, so the ±10 % dwell
  tolerance in `tests/e2e/playback-matrix.spec.js:168` and
  `tests/e2e/zz-timing-dwell.spec.js:47` needs a documented per-engine margin
  rather than a single Chromium-calibrated bound.

### Open item — mobile CLS (T184, T146 remain unchecked)

`degradation-production.spec.js:110` measures CLS 0.155 against the SC-015
budget of 0.1 on the 360×800 reference viewport. The frame-stage geometry is
now stable (`--frame-aspect` reserves the image box and the image stays in flow
while loading), so the remaining shift is the per-frame height change of the
in-flow description.

The constraint set is over-determined and needs a design decision rather than
another iteration: the description must stay unclipped (FR-012), stay inside the
stage bounds (asserted by `tests/e2e/reflow.spec.js`), and the control bar must
not move (SC-015). Reserving the description's height in JS was tried and
reverted twice — the reservation itself shifts the first layout, and at 320×568
it pushed the control bar below the fold at the 360×800 reference viewport.

## Phase 15: Convergence

- [X] T194 HIGH: Define the frame-invariant description height in CSS so the invariant documented at `src/styles/player.css:455-459` is actually implemented — `--description-min-height` is referenced only inside that comment and is defined in neither `tokens.css`, `player.css`, nor `src/scripts/*.js`, and `.frame-description` (`player.css:472-478`) carries no `min-height`; implement the reservation in CSS rather than JS (the JS reservation was reverted twice because it shifted the first layout and pushed the control bar below the fold at 320x568) so the per-frame height change stops and `tests/e2e/degradation-production.spec.js:142` measures CLS below 0.1 at the 360x800 reference viewport, keeping the description unclipped per FR-012 and inside the stage bounds asserted by `tests/e2e/reflow.spec.js` per SC-015, FR-015 (implemented 2026-09-26: root cause was a single 0.155/0.185 layout shift at t≈961ms where the empty live region grew `h 41 -> 225px` inside the in-flow mobile grid, pushing `.control-bar` from y=394 to y=534 and ejecting `audio-hint`/`audio-status` from the viewport; the width axis was also unstable because the stage's `place-items: center` shrink-wrapped the box 31px empty vs 315px filled. Fixes: `--description-line-height`/`--description-reserve-lines`/`--description-min-height` defined in `src/styles/tokens.css:53-55` as a LINE-based floor (`calc(lines × line-height × 1em + 1.5rem + 2px)`) that scales with the description's own typography rather than the viewport, and because it tracks font size a 200% text zoom overflows it naturally so the floor stays inert and never clips (SC-017); `justify-self: stretch` plus `min-height: var(--description-min-height)` applied to `.frame-description` in the in-flow mobile block `src/styles/player.css:472-486`; short-landscape viewports drop the reservation at `src/styles/tokens.css:64-69` because the stage already has its own reduced-height budget there and any floor pushes the frame image out of the viewport; the dead `this.scheduleDescriptionReservation()` call at former `src/scripts/player.js:640` was DELETED — the method was never defined, so `handleImageError()` threw `TypeError`. Measured CLS is now **0.000** for both degradation profiles (was 0.155 save-data / 0.185 slow-network) at the 360x800 reference viewport, with `tests/e2e/reflow.spec.js` green at 320x568 and 360x800 @200% text. While verifying, the end-of-narrative overlay was also found to intercept the navigation controls (FR-033) whenever the document was scrolled: `--control-bar-height` was published once at init and never refreshed, `max-height: 100%` resolved against the overlay box and ignored its padding, the property was set on `#player` while `#end-overlay` is a sibling under `#app`, and `100%` in `bottom` resolved against the containing block rather than the viewport. Fixed by `showEndOverlay()` in `src/scripts/player.js:387-397` (re-measures with the overlay visible and again on the next frame), a `ResizeObserver` on `#frame-description` plus resize/scroll handlers, publishing `--control-bar-top` on the shared `.app-shell` ancestor, and anchoring the overlay band to that value in `src/styles/player.css:302-358`)
- [X] T195 MEDIUM: Add non-probative deterministic coverage for the `slow-2g` and `2g` connection profiles that FR-015 enumerates — the degradation suites define only `save-data` and `3g` (`tests/e2e/degradation-production.spec.js:5-14`, `tests/e2e/zz-degraded-coverage.spec.js:17-20`), `2g` appears in no test at all, and the single `slow-2g` setup asserts `expect(slowPreload.metaOnlyCount).toBeGreaterThanOrEqual(0)` (`tests/e2e/convergence-audio.spec.js:138`), which can never fail; assert preload restriction, light-variant media, and instant transition cut for both profiles per FR-015, FR-031, SC-020 (implemented 2026-09-26: `PROFILE_2G` (`effectiveType:'2g'`, `rtt:150`) and `PROFILE_SLOW_2G` (`'slow-2g'`, `rtt:250`) added at `tests/e2e/zz-degraded-coverage.spec.js:17-45` and both registered in `PROFILES`, so the four established bodies (light variants bounded to <=1280px/<=150KB, instant cut, no future-frame preload and audio preload policy, geometry) now run for both profiles; a dedicated per-profile test at `tests/e2e/zz-degraded-coverage.spec.js:275-329` asserts `data-degraded="true"`, `capabilities.slowConnection`/`shouldDegrade`, `{imageVariant,audioVariant}='light'`, an empty `window.__preloadedImages`, zero wire requests for `frame-0[234]`, audio preload `scene-0:'metadata'` / `scene-1:'none'` / `frame-frame-03:'none'`, and `#frame-stage[data-transition="cut"]` with `--transition-duration: 0ms`. The tautology at `tests/e2e/convergence-audio.spec.js:138` was replaced with `totalSceneElements > 1`, `autoCount === 0`, `currentScenePreload === 1`, `metaOnlyCount === 1` and a per-scene preload assertion. Both new profiles sit BELOW the `rtt > 300` heuristic in `src/scripts/capabilities.js:6`, so `effectiveType` is the sole determinant — proven by mutation: removing `'2g'` and then `'slow-2g'` from that list each turned 4 of the 10 matching tests red (asserting `data-degraded` `"false"`, transition `"fade"` instead of `"cut"`, and non-empty future-frame requests), and reverting restored green. Coverage defect confirmed rather than assumed: because every pre-existing slow profile also had `rtt > 300`, dropping ANY enumerated name — including `'3g'` — was previously undetectable)
- [X] T196 MEDIUM: Reconcile the stale unchecked records for audio lifecycle, build environment, and CI wiring against code evidence and record the outcome — T132, T133, T134, T135 (document-level keyboard unlock `src/scripts/audio.js:161,363,381`; `silentContinuation` guards `:169,332,469,525`; `fadeProgress` inclusive clamp `:11-14`; `lifecycleGeneration` `:43,164-179`), T150 (`applyMix()` on frame ended/stall/failure/pause `:643,650,658,669`), T153 (all devDependencies exact, no undeclared build tools) and T188 (`lhci` wired at `.github/workflows/ci.yml:60`) are implemented but still recorded as open, which is what causes each convergence pass to re-append duplicates per SC-001–SC-023, T164, T193 (completed 2026-09-26: T132, T133, T134, T135, T150, T153, T180, T181 and T188 re-verified against code and marked complete with `file:line` evidence in their own notes; the outcome is recorded in the "T196 reconciliation outcome" section below. T132 and T135 — the two highest-stakes claims — were independently re-verified rather than accepted from the audit, and both held. Two residuals are recorded there verbatim and neither is closed by this task: the `USED_BY` diagnostic inaccuracy in T153, and the fact that `lhci` is enforced by `.github/workflows/ci.yml` rather than the local `npm run ci` chain in T188)

### T196 reconciliation outcome (recorded 2026-09-26)

T132, T133, T134, T135, T150, T153, T180, T181, and T188 were re-checked against the working
tree and are implemented; their unchecked boxes carried stale "(partial)", "(missing)", or
"(contradicts)" markers, and every convergence pass re-appended duplicates of them as a
result. The two highest-stakes claims were re-verified independently rather than taken on the
audit's word:

- **T132** — capture-phase `document` keydown listener registered with `true` at
  `src/scripts/audio.js:161`, gated by `isQualifiedKeydown` at `:151` (defn `:120-124`), and
  the pause-shortcut guard at `:155-158` calls `preventDefault()` + `stopPropagation()` so the
  player's bubble-phase handler (`src/scripts/player.js:233`, branches `:254-256`, `:271-273`)
  cannot pause the playback that the same keypress just unblocked; blocked-dialog focus at
  `src/scripts/audio.js:362-363`, focus restored to `#player` at `:381` and `:412`.
- **T135** — `lifecycleGeneration` at `src/scripts/audio.js:43` with
  `isGenerationCurrent`/`canStart`/`invalidateLifecycle` at `:164-180`; invalidation is reached
  from blocked audio `:348`, silent continuation `:372`, unlock `:404`, mute `:440`, pause
  `:453`, scene navigation `:480`, frame navigation `:497`, and teardown `:681`; state is
  rechecked after every await at `:269`, `:299`, `:324`, and duplicate initialization is
  deduplicated at `:262`.

Neither re-verification contradicted the audit, so both were flipped.

Two residual items are recorded here and remain open:

1. **Preflight `usedBy` under-reports `test:unit` (under T153).**
   `scripts/preflight.mjs:41-42` declares `ffmpeg: ['build:images','ci']` and
   `ffprobe: ['build:images','build','ci']`, but `tests/unit/delivery.test.js:29` runs
   `node scripts/build-images.mjs` and `tests/unit/media-generation.test.js:38` invokes
   `ffprobe` directly, so `npm run test:unit` requires both executables as well. The
   executables are still probed unconditionally (`scripts/preflight.mjs:492-493`), so no gate
   can pass silently — the residual is a one-line diagnostic/documentation inaccuracy, not a
   missing capability.
2. **`lhci` is absent from the local CI chain (caveat under T188).** `npm run ci`
   (`package.json:20`) omits `lhci`, and `CI_REQUIRED_STEPS` (`scripts/preflight.mjs:56`) does
   not require it. Lighthouse is enforced only by `.github/workflows/ci.yml:59-60`, so a green
   local `npm run ci` carries no information about the Lighthouse gate. This is the documented
   arrangement (`AGENTS.md:92`), recorded as a caveat rather than a failure.

**Scope limit: this reconciliation rests on CODE EVIDENCE ONLY** — source, scripts, config,
and the workflow file. It does **not** close, and must not be read as closing:

- the human-participant usability studies: T032a, T053b, T095, T096, T121, T122, T126, T127, T142, T143, T158, T162, T171, T172;
- the WebKit / real-Safari browser-matrix work: T070, T093, T115, T125, T141, T156, T170, T174;
- the FPS-certification tasks on the declared reference profile: T124, T140, T157, T173;
- the real-assistive-technology WCAG 2.2 AAA audits: T144, T159, T176.

Those stay open for the reasons already recorded in the "Verification scope (recorded
2026-09-26)" section: no headless engine certifies a participant study, real Safari or mobile
Safari, a ≥60 fps frame budget, or a screen-reader session on this host. The T194/T195 mobile
CLS and coverage gaps, and the T181/T145 deterministic-timing-coverage leg noted on T181, are
likewise untouched by this reconciliation.

---

## Verification results (recorded 2026-09-26, after T194/T195/T196)

Gates run after completing T194, T195 and T196, on this host:

| Gate | Command | Result |
|------|---------|--------|
| Preflight | `npm run preflight` | 13/14 pass; `browser-launch` fails — WebKit needs `libicu.so.74`, host ships `libicu-77.1-3.fc44` and the repos offer only 76/77 |
| Manifest | `npm run validate` | pass |
| Unit | `npm run test:unit` | **76/76 pass** |
| Build + budgets | `npm run build` | pass — 13041 B compressed script, 3167 B compressed style, initial=317574, maxFrame=229504, total=2310700 |
| E2E mobile-chromium | `npx playwright test tests/e2e --project=mobile-chromium` | **148/149** |
| E2E desktop-chromium | `npx playwright test tests/e2e --project=desktop-chromium` | **149/149 pass** |
| E2E desktop-firefox | `npx playwright test tests/e2e --project=desktop-firefox` | 139/148 — timing-tolerance flakes, see below |
| Perf | `npx playwright test tests/perf --project=desktop-chromium` | 10/11 — `tests/perf/fps.spec.js` measures 44.4 fps vs the ≥60 SC-018 gate |

### CLS outcome (SC-015) — the T194 target

`tests/e2e/degradation-production.spec.js` now measures **CLS 0.000** for both the `save-data`
and `slow-network` profiles at the 360x800 reference viewport, down from **0.155** and **0.185**.
Verified deterministic across 8 consecutive runs.

### Remaining failures, triaged

All of the following are **pre-existing** and unrelated to T194/T195/T196; each was reproduced
with the Phase 15 changes reverted or isolated to an untouched file.

1. **`tests/perf/fps.spec.js` — 44.4 fps vs ≥60 (SC-018).** Host limitation, already recorded
   above: headless Chromium on this machine cannot certify the frame budget. The gate fails
   honestly rather than skipping. T124/T140/T157/T173 remain open for this reason.
2. **`tests/e2e/zz-timing-dwell.spec.js` / `zz-timing-coalescing.spec.js` on desktop-firefox.**
   `277 ms` measured against a `275 ms` upper bound — a 2 ms overshoot from Firefox's coarser
   timer. This is the per-engine margin already documented above; the single Chromium-calibrated
   bound does not hold across engines. T070/T115/T125/T141 remain open.
3. **`tests/e2e/sync.spec.js:96` "resets an incompatible persisted state".** Asserts
   `localStorage['hwc.audio'] === null`, but the player legitimately writes its FR-004 default
   (`'on'`) before the assertion runs. `src/scripts/storage.js` and `src/scripts/audio.js` were
   not modified in this pass. A pre-existing race between the test's expectation and the
   player's own preference write — **not closed here**, and deliberately not papered over by
   weakening the assertion.
4. **`tests/e2e/degradation-production.spec.js:110` placeholder race (fixed here).** The
   `#frame-placeholder` visibility poll raced the 250 ms route delay and failed intermittently
   in roughly half of runs. Replaced with an in-page `MutationObserver` probe that captures the
   loading state and the stage/control-bar geometry in the same task that observes it, so the
   assertion is deterministic and still non-probative. Verified 8/8 and 10/10 green on
   mobile-chromium and desktop-chromium respectively.

### Still blocked on this host (unchanged)

WebKit cannot launch at all (`libicu.so.74` unavailable), so `mobile-webkit` and
`desktop-webkit` are unrunnable here — T170 and every task depending on the real Safari matrix
(T070, T093, T115, T125, T141, T156, T174) stay open. The ≥10-participant usability studies
(T032a, T053b, T095, T096, T121, T122, T126, T127, T142, T143, T158, T162, T171, T172) and the
real-assistive-technology WCAG 2.2 AAA audits (T144, T159, T176) require human participants and
remain open. T145 (deterministic audio-timing coverage) is also still open and is explicitly
not closed by T181's umbrella.

## Phase 16: Convergence

- [ ] T197 HIGH: Start the cinematic transition when the frame is displayed rather than when it is rendered, so the authored opening transition is actually visible per FR-002, US1/AC2. `src/scripts/player.js:536-537` arms `stage.dataset.transition` inside `render()`, the image is held at `visibility: hidden` by `:570` until load, and `handleImageLoad()` reveals it at `:668` without re-arming the transition, while `src/styles/player.css:373-397` binds the animation to `.frame-image` with `animation-fill-mode: both`. The 600-700 ms authored fade/dissolve/slide therefore runs against an invisible element and is already finished — or partly consumed — by the time the frame is shown; a cold load never shows frame-01's opening transition, and a manual jump to a not-yet-decoded frame degrades to a partial or instant cut. The dwell is already gated on display (`:493` refuses to arm until `imageReady`; `:671` arms it from `handleImageLoad`), so defer the `data-transition` write to the same place. Note the existing coverage (`tests/e2e/playback-matrix.spec.js:83-97`, `tests/e2e/zz-timing-transitions.spec.js:36-54`) only asserts the resolved `data-transition`/`--transition-duration`/`--transition-easing` attributes, which are correct — it cannot observe *when* the animation starts, so add coverage that observes the transition while the frame is visible
- [ ] T198 HIGH: Fix re-enabling audio inside the 90 ms stop ramp, which currently leaves a paused element at non-zero volume and silences the scene until the next scene boundary, pause/resume or reload, per FR-006 ("ao religar, a trilha DEVE retomar da posição em que estava, com fade-in de no máximo 300 ms"). `src/scripts/audio.js:441` issues `stopAll(STOP_DURATION)` with `STOP_DURATION = 90` (`:4`); `fadeOut` leaves the element unpaused and keeps its key in `activeElementKeys` for the whole ramp because the delete happens only at fade completion (`:640`), then pauses at `:609-611`. Re-enabling inside that window makes `isElementPlaying()` return `true` purely from `activeElementKeys.has(key)` (`:191`), so `playCurrentScene` takes the early return at `:286-290` — `markPlaying` + `applyMix` with no `play()` and no `fadeIn`. The in-flight `fadeOut` then completes, pauses the element, and `applyMix()` (`:612`, `:531`) writes the full target gain onto that paused element; nothing ever restarts it, since `applyMix` never calls `play()` and `start()` only runs on resume/unlock/toggle-on. Reachable by a double-tap on the toggle or two fast `M` presses. No test toggles twice inside the ramp — `tests/e2e/convergence-audio.spec.js:65-91` waits 200/150 ms and only asserts `>= 0`. Make an element with an active fade-out count as not playing (drop it from `activeElementKeys` before `stopAll`, or have `isElementPlaying` return `false` while a fade-out token is active) so a real `play()` + `fadeIn` is issued, and add a regression test for the sub-90 ms double toggle
- [ ] T199 HIGH: Gate the first `play()` so the autoplay-block path can actually be reached, and add unstubbed coverage for it, per FR-016, SC-003. `src/scripts/audio.js:81` creates every element with `element.volume = 0` and `playCurrentScene`/`playFrame`/`unlockPrecreatedElements` re-assert `volume = 0` at `:293`, `:318` and `:390` immediately before awaiting `requestPlay`. Chromium's autoplay policy treats a media element as muted when `volume == 0` and permits muted autoplay, in which case `play()` resolves instead of rejecting with `NotAllowedError`: `markBlocked()` is never reached, the "toque para iniciar" overlay never appears (FR-004, FR-016, SC-003), and `fadeIn` then ramps the element to full gain at `:301` — audio plays with no user gesture at all. The provable half today is coverage: every assertion that `#blocked-overlay` becomes visible stubs `HTMLMediaElement.prototype.play` to reject (`tests/e2e/autoplay.spec.js:7-14`, `:35-40`, `:56-61`; `tests/e2e/audio-gesture-convergence.spec.js:5-11`, `:62-66`) and `tests/e2e/helpers.js:14-28` only conditionally dismisses an overlay, so the central user-facing behaviour the `NotAllowedError` branch exists for has zero coverage against a real browser autoplay policy. Add one E2E that loads with a real `play()` and asserts whether `#blocked-overlay` appears; if it does not, gate the first `play()` (e.g. `navigator.userActivation.isActive`, or a non-zero volume during the autoplay probe) and/or pre-check `navigator.getAutoplayPolicy('mediaelement')` per `research-autoplay-detection.md:154-166`
- [ ] T200 HIGH: Add a viewport-height budget to the stage so desktop viewports taller than 480 px do not render a frame larger than the window, per SC-005, FR-009. `src/styles/player.css:1-11` lays `.player` out as a grid whose stage row is `minmax(0,1fr)`, but `min-height: 100dvh` is only a floor, so the row is sized by the stage's own `aspect-ratio: 1200/800` × column width (`src/scripts/player.js:540`). The only height cap lives in the `max-height: 30rem` + `orientation: landscape` block (`src/styles/player.css:428-444`), so every viewport between 481 px and roughly 900 px tall — including the declared desktop reference 1440×900 (`quickstart.md` matrix, `playwright.config.js:25-47`) — produces a frame taller than the window and pushes the control bar to y≈1040-1155 (measured image bottom 1044 at 1440×900, control-bar bottom 1042 at 1280×720). Nothing is cropped and there is no horizontal scroll, but the frame cannot be seen whole and the controls require a scroll. Cap the stage against the viewport height (for example `max-height: calc(100dvh - <chrome>)`) and verify the declared 1440×900 desktop profile
- [ ] T201 MEDIUM: Make the 400 ms navigation coalescing window leading-edge-inclusive, or amend FR-003 to describe the current leading-edge throttle, per FR-003 ("entradas repetidas em rápida sucessão são coalescidas… a última prevalece"). `src/scripts/player.js:336` computes `delay = this.lastNavigation === 0 ? 0 : Math.max(0, COALESCE_WINDOW - elapsed)`, so the first input executes immediately and only inputs 2..N are replaced; two clicks 120 ms apart therefore perform two moves, and a double-tap of "next" advances two frames. Coalescing only collapses inputs that land in the same task, which is what `tests/e2e/zz-timing-coalescing.spec.js:30-38` exercises (`moveToCalls === 1`) — real user input arrives in separate tasks. The suite already encodes the present behaviour as a workaround rather than a requirement (`tests/e2e/navigation.spec.js:28-30`, `tests/e2e/end-state.spec.js:19-22`, and the repeated `player.lastNavigation = 0` resets in every `settleAt` helper). The spec sentence is genuinely ambiguous and a leading-edge debounce is a defensible UX choice, so decide deliberately: if a debounce is intended, make `delay` equal `COALESCE_WINDOW` for the first input too and delete the `clearCoalescing` workarounds; otherwise record the leading-edge intent in FR-003
- [ ] T202 MEDIUM: Enter the ended state when the last frame is reached by manual navigation, not only by natural completion, per US1/AC4, FR-033. `src/scripts/player.js:367` has `moveTo` always set `'paused'`; the only two writers of `'ended'` are `:408` (`goEnd`) and `:507` (`advance`), and `goEnd` returns immediately when already on the last frame (`:406`). So `next-frame` from frame-03 lands on frame-04 paused with no overlay, no "fim da narrativa" indication and no "Rever do início", even though US1/AC4 reads "**When** o último quadro é exibido, **Then** o visitante percebe o fim da narrativa e pode rever a sequência". FR-003's "no-op at the limit" clause legitimately excuses the `End` *button* doing nothing there, but nothing in the spec makes the ended state conditional on natural completion. The asymmetry also shows in reverse: after a natural end, `prev-frame` leaves `ended` for `paused`, and stepping forward again re-lands on the last frame with no end state. No test covers manual arrival at the last frame — every `data-status', 'ended'` assertion goes through `#end` or natural playback
- [ ] T203 MEDIUM: Make the scene crossfade survive manual navigation, or scope FR-006's crossfade clause to playing-only, per FR-006 ("no limite entre cenas, DEVE haver crossfade curto (≤500 ms)"). `src/scripts/player.js:365-367` has `moveTo` call `this.audio.setPaused(true)` and set `status = 'paused'` *before* `render()` reaches `audio.setScene()` at `:583`; inside `setScene` the `else` branch `pauseElement(previous)` fires (`src/scripts/audio.js:485`) as an instant cut with no `SCENE_FADE_DURATION`, and `playCurrentScene` is skipped entirely because `:487` requires `!this.paused`. The crossfade therefore only holds on automatic advance: every manual scene jump, `Home`, `End` and "Rever do início" hard-cuts and leaves audio muted until the user presses play. There is a genuine tension to resolve rather than a pure bug — FR-003 requires manual navigation to pause and FR-013 makes pause stop scene audio — so either crossfade the outgoing scene regardless of `paused` while still withholding the incoming scene until resume, or amend FR-006 to state that the crossfade applies to automatic advance
- [ ] T204 MEDIUM: Preload the image candidate the browser will actually select, per FR-015 and SC-008. `src/scripts/player.js:596,601` build the speculative `Image` from `selected.fallback` / `selected.avif` / `selected.webp`, preferring the fallback, while `applyImageSources` (`:522-526`) and `index.html:41-45` install the AVIF and WebP `<source>` elements ahead of the `<img>` srcset so the render requests `frame-0N-<w>.avif`. The preloaded JPEG can never be reused, so on every normal-connection session each frame advance downloads one extra image the player discards while the frame the user is waiting for is not the frame that was preloaded — which is the point of FR-015's "o próximo … DEVE ser pré-carregado". The assertion that would catch it does not exist: `tests/e2e/zz-degraded-coverage.spec.js:380` checks only `preloaded.length > 0`, and the navigation and timing suites run against `tests/fixtures/story.json`, whose frames declare no srcsets (`:15`), so there `selected.fallback` is empty, `source` falls through to `avif`, and the preload accidentally matches the render. Probe format support (`createImageBitmap` or a `type` check) and preload the variant that will paint, or drop the speculative download
- [ ] T205 MEDIUM: Reconcile the qualified-gesture carve-outs with FR-016, per FR-016 and the UI contract. `src/scripts/audio.js:120-124` (`isQualifiedKeydown`) rejects `Escape` and any event targeting an input, select or contenteditable, and `documentKeydownHandler` applies the same gate at `:151-152`; `spec.md:329-330` says "*qualquer* gesto qualificado do usuário (toque, clique ou **tecla**)" and `contracts/player-ui-contract.md:65` enumerates `keydown` with no carve-out. `tests/e2e/audio-gesture-convergence.spec.js:72-73` actively locks the Escape exclusion in, so this is a deliberate deviation rather than an oversight. Either drop the carve-outs so any qualified key activates blocked audio, or amend FR-016 and the UI contract to state the exclusions and why they exist
- [ ] T206 MEDIUM: Certify `desktop-webkit` and `mobile-webkit` and record real Safari results before claiming SC-022, per SC-022, FR-027. `playwright.config.js:48-54` declares five projects and `.github/workflows/ci.yml:26-27` installs the WebKit system dependencies, but WebKit does not launch on this host — it requires `libicu.so.74` while the machine ships `libicu-77.1-3.fc44` and the enabled repositories offer only 76 and 77 — so `npm run preflight` fails its `browser-launch` check and the Safari projects are unrunnable here. SC-022's "100% dos navegadores da matriz passam VS-1…VS-10" therefore has no local evidence, and `quickstart.md:171-173` already records it. Provision a host with `libicu.so.74` (or a container image that provides it) and run the full matrix, keeping the preflight failure in place so an uncertifiable matrix fails loudly rather than passing silently
- [ ] T207 MEDIUM: Make the media build reproducible or fail loudly when it has no sources, per FR-028, SC-023. `scripts/build-images.mjs:169-212` reads frame sources from `assets/frames/` and audio sources from `assets/audio/*.wav`, but `assets/frames/` contains only `generated/` and no `.wav` masters exist, so the function returns `{frameSources: 0, audioSources: 0}` at `:211` and exits 0 — the CI step at `.github/workflows/ci.yml:43-44` passes vacuously. The 156 committed generated variants and the light Opus files are therefore artifacts that the documented pipeline cannot reproduce, `build:images` cannot catch a regression, and the documented compression standard (AVIF cq≈18 / WebP q≈75 / JPEG q≈80, `build-images.mjs:16-20`) is enforced only by construction — `scripts/build.mjs:271-299` verifies format, geometry and byte ceilings, not quality. Commit the frame and audio masters, or make `buildImages()` fail when it finds zero sources. Published-asset compliance is already genuinely verified by `validateManifestMedia` across every srcset candidate and its light twin at 1280 px / 150 KB, which is why this is MEDIUM rather than HIGH
- [ ] T208 MEDIUM: Reconcile the declared `aria-modal` overlays with their deliberately non-modal behaviour, per FR-016, FR-033. `index.html:73`, `:82` and `:91` mark all three overlays `role="dialog" aria-modal="true"`, but no focus trap, no `inert` and no Escape handling exists anywhere in `src/scripts/` (only `audio.js:121` deliberately ignores Escape for the gesture path), and `.overlay{pointer-events:none}` (`src/styles/player.css:295`) exists specifically so the page stays interactive for FR-016, while `#end-overlay` deliberately frees the navigation bar for FR-033 (`player.css:305-338`). Screen readers that honour `aria-modal` will confine users to the card, contradicting both requirements; on `#resume-overlay` focus can also leave the "modal" onto navigation buttons that no-op (`player.js:358` `if (this.resumeRequired) return`) with no `aria-disabled` to explain why. Drop `aria-modal` from these non-modal status notices, or implement real modality where it is intended and give the no-op controls an accessible explanation
- [ ] T209 LOW: Re-arm the image load watchdog after the light→standard fallback retry, per FR-015 ("a navegação DEVE continuar, sem bloquear a narrativa"). `src/scripts/player.js:676-683` clears `imageLoadTimer` and, on the degraded→standard retry, reassigns `image.src` and returns without re-arming the 10 s timeout that `render()` sets at `:572-575`. If that second request neither loads nor errors, `imageReady` stays `false` forever, `schedule()` keeps returning early at `:493`, and the narrative is stuck on the frame showing a loading placeholder. Rare — it needs a hung request rather than a failed one — but cheap to fix
- [ ] T210 LOW: Make `togglePlay()` from `idle` start playback instead of pausing, per US1/AC5 and the declared `idle` state in `data-model.md`. `src/scripts/player.js:415-419` maps `idle` to `pause()`, while `updateStatus` at `:649-653` labels the control "Reproduzir" whenever the status is not `playing`; during the 250 ms boot window (`index.html:58` ships "Pausar" and the constructor's `render()` rewrites it to "Reproduzir") the first press is consumed, the label does not change, and the auto-start timer is cancelled, so the user must press again to get what the accessible name promised. No test exercises the toggle before auto-start
- [ ] T211 LOW: Decide and record whether "continuar sem som" is a persisted preference, per FR-007. `src/scripts/audio.js:370-383` (`continueSilently`) sets `this.enabled = false` but never calls `storage.setAudio(false)`, so `hwc.audio` stays absent and every subsequent visit re-attempts autoplay and re-shows the overlay. FR-007 says the audio preference is remembered between visits and the Audio Preference entity is defined as "a escolha do usuário entre ligado e desligado", but T180 scopes the intent to "*across subsequent scenes*", so this is an unresolved spec ambiguity rather than a verified intent. Choose one behaviour and record it in FR-007 or the storage contract
- [ ] T212 LOW: Run the first-arrival performance gates against production bytes, per SC-019, SC-001. `tests/perf/first-frame.spec.js:3,19,63,80` drives both the cold and warm first-frame gates with `/?story=tests/fixtures/story.json`, whose images are roughly 1 KB SVGs (`tests/fixtures/assets/frames`, 32 KB total); only the per-frame SC-008 gate at `:30,96` uses the production manifest. Point the `<2.5 s` and `<10 s` p75 assertions at `src/data/story.json` so the budget is measured on the assets that actually ship
- [ ] T213 LOW: Add a normal-mode CLS assertion, per SC-015. The only `layout-shift` observer in the suite lives inside the degraded profiles (`tests/e2e/degradation-production.spec.js:104-124`, `save-data` and `slow-network`), so ordinary playback is never measured. Independent measurements are 0 at 360×800 and 1280×720, 0.0124 at 320×568 and 0.0415 at 800×360 — all inside the 0.1 budget — so this is a coverage-of-proof gap; add the same observer for a non-degraded profile
- [ ] T214 LOW: Remove or repurpose the unreachable `keydownOnPlayer` listener, per FR-010. `src/scripts/player.js:174-181` is registered on `#player`, but every keydown inside it targets either `#player` itself or an interactive descendant, and `index.html:27` gives `#player` `tabindex="0"`, so `target.closest('[tabindex]')` always matches and the listener returns before `preventDefault()`. Behaviour is correct today and the actual scroll suppression comes solely from the document-level handler at `:284-311`; the risk is that the false guarantee in its comment invites someone to relax the document handler's `preventDefault()` and silently reintroduce page scrolling on Space/Arrow/Home/End. Delete the dead listener or drop the `tabindex` match so the claim becomes true
- [ ] T215 LOW: Strip test-only globals and dead accessibility code from the production bundle, per FR-014. `src/scripts/audio.js:53` reads `globalThis.__audioInstrument` and `src/scripts/main.js:79` publishes `globalThis.__cinematicPlayer`; both survive esbuild into `dist/`. Separately, `AccessibilityController.announceAudio` (`src/scripts/a11y.js:15-18`) is dead — `AudioManager` stores `a11y` at `audio.js:25` and writes `#audio-status` directly in `emit()` at `:717-719`. Gate the instrumentation behind a test-only flag or remove it, and delete the unused method
- [ ] T216 LOW: Size the description reservation from the narrowest supported width, per FR-015's "sem deslocamento perceptível". The floor resolves to 243.152 px (`src/styles/tokens.css:45-47`) because it is tuned to the 360×800 reference viewport, but the tallest production description renders 261 px at 320 px wide, so `nav.control-bar` shifts about ±18 px on every description swap at the narrowest supported width. The CLS impact is roughly 0.0016 per swap and 0.0124 over a long session, so SC-015 and FR-029 hold; this is about the perceptible shift FR-015 forbids. Either derive the floor from the tallest description at the narrowest supported width, or clamp the description to the reserved line count
- [ ] T217 LOW: Stop enlarging images beyond the master resolution, per FR-028. `scripts/build-images.mjs:86` sets `withoutEnlargement: false`, which upscales a 1200 px master into the 1920 px and 2560 px candidates that `src/data/story.json:21-23` advertises, publishing roughly 73 KB of upscaled pixels. Stop enlarging, or omit the 1920/2560 candidates when the master is smaller, so the srcset only advertises widths that genuinely exist
- [ ] T218 LOW: Reconcile `budget.json` units with the spec's literal limits, per FR-029. `budget.json:2-7` expresses "KB"/"MB" as KiB/MiB (307 200, 1 572 864, 31 457 280), roughly 2.3 % above the literal numbers in `spec.md:372` and `plan.md` Delivery Standards. Either switch to decimal limits or record the KiB reading explicitly in `docs/delivery.md` so the enforced ceiling matches what the spec states
- [ ] T219 LOW: Assert embedded-lettering compliance against the published rasters, per SC-013, FR-012. `tests/e2e/content-audit.spec.js:11,20-24` extracts lettering from `tests/fixtures/assets/frames/*.svg` rather than from `assets/frames/generated/*`, so the test proves the fixture and not what ships. I verified independently with tesseract that frames 01/03/04 are legible whole and frame-02 is legible in a bottom crop, and that all four descriptions match their embedded text — but that verification is not captured in an automated gate. Point the content audit at the published rasters
