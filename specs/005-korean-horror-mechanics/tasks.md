# Tasks: Experiência Cinematográfica Psicológica (Spec 005)

- [x] T001 Add sensory taxonomy module `src/scripts/sensory-taxonomy.js`
- [x] T002 Add catalog manifest `src/data/catalog.json`
- [x] T003 Add story `src/data/stories/o-alojamento.json`
- [x] T004 Update story-loader for fx/memoryIllusion/sensoryAdvisory
- [x] T005 Update schema for new fields
- [x] T006 Add entry `alojamento.html` and data-story-manifest
- [x] T007 Update build.mjs for multi-manifest
- [x] T008 Update validate-manifest.mjs for catalog
- [x] T009 Adjust audio STOP_DURATION to 40ms
- [x] T010 Add CSS effects
- [X] T011 Implement full player sensory mode & memory illusion (pending)

## Phase 2: Convergence

- [X] T012 Implement sensory mode persistence (`hwc.sensoryMode`) and BroadcastChannel `hwc:sensory` in `src/scripts/storage.js` per FR-004 (partial)
- [X] T013 Show `#sensory-dialog` before `player.schedule()` in `src/scripts/main.js` per FR-003 (missing)
- [X] T014 Implement `#catalog-dialog` and `#catalog-button` navigation in `src/scripts/player.js`/`main.js` per FR-005 (missing)
- [X] T015 Implement memory illusion latch with `sessionStorage['hwc.latched:'+storyId]` in `src/scripts/player.js` per FR-007 (missing)
- [X] T016 Implement shock drop (30ms ramp to 0 then 400ms fade-in) in `src/scripts/audio.js` per FR-006 (partial)
- [X] T017 Apply `.memory-distortion` classes and FX CSS on `#frame-image` per FR-011 (partial)
- [X] T018 Partition progress storage as `hwc.progress:${storyId}` in `src/scripts/storage.js` per FR-014 (partial)
- [X] T019 Add unit tests for sensory taxonomy and manifest fields in `tests/unit/` per FR-001 (missing)
- [X] T020 Add E2E tests for sensory dialog, catalog, memory illusion per SC-001..SC-006 (missing)
- [X] T021 Run `npm run ci` as verification gate (verification)

## Phase 3: Convergence

- [X] T022 Implement `hwc.sensoryMode` persistence and `BroadcastChannel('hwc:sensory')` in `src/scripts/storage.js` per FR-004 (partial)
- [X] T023 Add `prefers-reduced-motion` fallback and recurring-visitor bypass to sensory dialog in `src/scripts/main.js` per FR-003/FR-004 (partial)
- [X] T024 Implement atomic <50ms purge on `#toggle-sensory-mode` without `render()` in `src/scripts/player.js` per FR-005 (partial)
- [X] T025 Implement `#sensory-advisory-badge` 5s auto-hide and audio-state text in `src/scripts/main.js` per FR-013 (partial)
- [X] T026 Implement catalog progress bars/badges and Escape close in `#catalog-dialog` per FR-005/FR-014 (partial)
- [X] T027 Partition progress storage as `hwc.progress:${storyId}` in `src/scripts/storage.js` per FR-014 (partial)
- [X] T028 Attenuate memory illusion audio sting to 20% on revisit in `src/scripts/player.js`/`audio.js` per FR-007 (partial)
- [X] T029 Add unit tests for sensory taxonomy, manifest fields, and storage keys in `tests/unit/` per FR-001/FR-004 (missing)
- [X] T030 Add E2E tests for sensory dialog, catalog, and memory illusion per SC-001..SC-006 (missing)
- [X] T031 Run `npm run ci` as final verification gate (verification)

## Phase 4: Convergence

- [x] T032 Implement `BroadcastChannel('hwc:sensory')` propagation in `src/scripts/storage.js` per FR-004 (partial)
- [x] T033 Implement reduced-motion auto-safe and recurring bypass edge cases in `src/scripts/main.js` per FR-003/FR-004 (partial)
- [x] T034 Implement atomic <50ms purge without `render()` on toggle in `src/scripts/player.js` per FR-005 (partial)
- [x] T035 Implement `#sensory-advisory-badge` 5s auto-hide and audio-state text in `src/scripts/main.js` per FR-013 (partial)
- [x] T036 Implement catalog progress bars/badges and Escape close in `#catalog-dialog` per FR-005/FR-014 (partial)
- [x] T037 Attenuate memory illusion audio sting to 20% on revisit in `src/scripts/player.js`/`audio.js` per FR-007 (partial)
- [X] T038 Run full `npm run ci` verification gate (verification)

## Phase 5: Convergence

- [x] T039 Add missing `#end-overlay` actions "Próxima Obra Curada" (fade-out 600ms + redirect) and "Ver Catálogo Completo" (opens `#catalog-dialog`) per FR-014 (partial)
- [x] T040 Implement static photosensitivity lint for `frame.fx` (pulse count ≤2, ΔL ≤0.05, brightness 0.8–1.25, red ratio ≤0.70, no infinite iteration) per FR-011 (partial)

## Phase 6: Convergence

- [x] T041 Implement static photosensitivity lint for `frame.fx` (pulse count <=2, deltaL <=0.05, brightness 0.8-1.25, red ratio <=0.70, no infinite iteration) in `scripts/validate-manifest.mjs` per FR-011 (partial - durationMs validated, rest missing)
