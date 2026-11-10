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

- [x] T039 Add missing unit tests for sensory taxonomy, manifest fields, and storage keys in `tests/unit/` per FR-001/FR-004 (missing)
- [x] T040 Add missing E2E tests for sensory dialog, catalog, and memory illusion in `tests/e2e/` per SC-001..SC-006 (missing)
- [x] T041 Complete sensory mode persistence and BroadcastChannel sync across all entry points per FR-004 (partial)
- [x] T042 Complete sensory dialog gating with reduced-motion/recurring bypass per FR-003 (partial)
- [x] T043 Complete catalog dialog/navigation with progress bars/badges/Escape per FR-005/FR-014 (partial)
- [x] T044 Complete memory illusion latch/sessionStorage hydration and 20% sting attenuation per FR-007 (partial)
- [x] T045 Complete atomic sensory purge without render per FR-005 (partial)
- [x] T046 Complete badge auto-hide and audio-state text per FR-013 (partial)
- [ ] T047 Verify full `npm run ci` passes with all spec 005 features (verification)

## Phase 6: Convergence

- [x] T048 CRITICAL: Move sensory dialog gating to before `player.schedule()` in `src/scripts/main.js` per FR-003 (contradicts)
- [x] T049 HIGH: Add deep equality check for `sensoryAdvisory.descriptors` between `src/data/catalog.json` and each story manifest in `scripts/validate-manifest.mjs` per FR-002 (missing)
- [x] T050 HIGH: Add fallback key `horror_comic_sensory_mode` in sensory mode resolution in `src/scripts/main.js` and `src/scripts/storage.js` per FR-004 (missing)
- [x] T051 HIGH: Implement full sensory advisory badge behavior (descriptors from catalog/story, audio state text, 5s auto-hide with fade) in `src/scripts/main.js` per FR-013 (partial)
- [x] T052 HIGH: Add "Próxima Obra Curada: O Alojamento" link with 600ms audio fade-out and "Ver Catálogo Completo" button to `#end-overlay` in `index.html`/`alojamento.html` and wire handlers per FR-014 (missing)
- [x] T053 HIGH: Wire sensory dialog button clicks to unlock audio via `audio.unlock()`/gesture handling per FR-003/Q18 (partial)
- [x] T054 HIGH: Add unit tests for manifest fx/memoryIllusion/sensoryAdvisory fields and storage key partitioning (`hwc.progress:${storyId}`) in `tests/unit/` per FR-001/FR-014 (missing)
- [x] T055 HIGH: Add E2E tests for catalog navigation/progress/badges/Escape, memory illusion latch/sessionStorage/20% attenuation, atomic purge on toggle without render, badge behavior, end overlay actions, reduced motion/recurring bypass per SC-001..SC-006 (missing)
- [x] T056 MEDIUM: Validate catalog.json schema against `specs/005-korean-horror-mechanics/contracts/catalog-manifest.schema.json` if present or enforce required fields in `scripts/validate-manifest.mjs` per FR-002 (missing)
