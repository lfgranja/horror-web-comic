# Repository Guidelines

## Project Overview

Vanilla ES-module cinematic comic player (no backend/framework). A manifest-driven player (`src/data/story.json`, schema v1) loads scenes/frames/images (AVIF/WebP/JPEG + srcset), audio, and transitions. The build pipeline (`esbuild`) bundles JS/CSS, validates asset refs, enforces byte budgets, and copies to `dist/`. The app supports themes, accessibility (reduced motion/announcements), audio with fading/ducking, cross-tab progress sync via BroadcastChannel + `storage` events, and capability-based degradation.

## Architecture & Data Flow

### Boot order (`src/scripts/main.js` `boot()`)
1. `createStorageManager()` → load saved state; apply theme to `document.documentElement` and sync `#theme`
2. `await loadStory(storyUrl)` → `storage.setStoryId?.(story.id)`; set `globalThis.__bootDebug`
3. `detectCapabilities()` → `new AccessibilityController()` → `new AudioManager({...})` → `new CinematicPlayer({...})` (DI: `{story, storage, audio, capabilities, a11y}`)
4. Sync controls from saved state (volume/speed/theme), wire theme changes/listeners, show sensory dialog on first run (non-reduced/non-automated), render catalog dialog, set titles
5. Subscribe to cross-tab progress: `storage.onProgress(record => player?.adoptProgress?.(record))`
6. `player.setAudioState(audio.state())`. Test hooks gated by `__CINEMATIC_PRODUCTION__` (stripped from prod bundle).

### Data flow
Manifest → `story-loader.js` (validate via `validateStory`, enforce safe local refs, validate srcset/sizes) → `CinematicPlayer` (frames/picture/transitions/navigation/preload/progress, light-variants) → `AudioManager` (beds/stings/ducking/fades/autoplay gating) → `StorageManager` (persistence/cross-tab sync via BroadcastChannel + localStorage + `storage` events, ordering via monotonic `seq`).

## Key Directories

- `src/scripts/` — Core runtime (`main.js`, `player.js`, `audio.js`, `storage.js`, `story-loader.js`, `capabilities.js`, `a11y.js`, `light-variants.js`, `safe-reference.js`, `sensory-taxonomy.js`)
- `src/styles/` — `tokens.css`, `base.css`, `player.css`
- `src/data/` — Manifests/catalog (`story.json`, `catalog.json`, `stories/`)
- `assets/` — Publishable delivery tree (frames/audio with variants)
- `media-src/` — Masters (never published), sidecars required
- `scripts/` — Build/validation/gates (`build.mjs`, `build-images.mjs`, `preflight.mjs`, `validate-manifest.mjs`, `serve-e2e.mjs`, `delivery-fidelity.mjs`, etc.)
- `tests/unit/` — Node native tests (`node --test`)
- `tests/e2e/` — Playwright specs (serial execution)
- `tests/perf/` — Performance budgets
- `tests/fixtures/` — Manifests/assets/audit samples
- `docs/` — Delivery/authoring/accessibility docs
- `specs/` — Feature specs/plans/tasks

## Development Commands

```bash
npm run preflight        # Host/toolchain gate (run before anything)
npm run validate         # Manifest schema + asset refs (scripts/validate-manifest.mjs)
npm run report           # Compatibility report (static)
npm run build:images     # Generate light variants (needs ffmpeg/ffprobe)
npm run build            # validate + production build to dist/ (esbuild)
npm run test:unit        # node --test tests/unit/*.test.js
npm run test:e2e         # Playwright matrix (serial). Use scripts/serve-e2e.mjs for E2E
npm run test:perf        # Perf budgets (Chromium)
npm run test:perf:webkit # Perf on WebKit projects
npm run ci               # preflight → validate → test:unit → build:images → build → test:e2e → test:perf
npm run ci:lighthouse    # Lighthouse CI
npm run serve            # python3 -m http.server 8080 (dev only; use scripts/serve-e2e.mjs for E2E)
```

Examples:
- `node --test tests/unit/storage.test.js`
- `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium`

## Code Conventions & Common Patterns

- **Modules**: Vanilla ES modules (`"type": "module"`), no framework. DI-style constructors take explicit deps (`{story, storage, audio, capabilities, a11y}`).
- **Classes/Managers**: `StorageManager` (persistence, cross-tab sync via BroadcastChannel + `storage` events, schema versioning, monotonic `seq`), `AudioManager` (state machine, fades/ducking/autoplay probe), `CinematicPlayer` (navigation/transitions/preload/progress), `AccessibilityController` (debounced announcements).
- **Validation/Safety**: Strict schema validation in `story-loader.js` (`validateStory`), local-safe refs via `safe-reference.js` (`isSafeLocalReference`), SVG sanitization, sidecars required.
- **Capability-driven**: `detectCapabilities()`/`watchCapabilities()` drive `imageVariant`/`audioVariant` and degradation/reduced-motion behavior.
- **State/Sync**: `hwc.*` localStorage keys, progress ordering by `(updatedAt, seq, tabId)`, cross-tab reconciliation, schema mismatch wipes storage.
- **Build gating**: Production bundle detection gates `?story=` override and test hooks (`__cinematicPlayer`/`__audioManager`/etc.) via `__CINEMATIC_PRODUCTION__`.
- **Testing**: `node:test` + `assert/strict` + `fast-check` property-based tests; E2E serial (`workers: 1`) to avoid cross-context leakage.

## Important Files

- **Entry/UI**: `src/scripts/main.js`, `index.html`, `alojamento.html`
- **Core runtime**: `src/scripts/player.js`, `src/scripts/audio.js`, `src/scripts/storage.js`, `src/scripts/story-loader.js`, `src/scripts/capabilities.js`, `src/scripts/a11y.js`, `src/scripts/light-variants.js`, `src/scripts/safe-reference.js`
- **Manifests/contracts**: `src/data/story.json`, `src/data/catalog.json`, `specs/001-cinematic-player/contracts/story-manifest.schema.json`
- **Styles**: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/player.css`
- **Config**: `package.json`, `playwright.config.js`, `budget.json`, `lighthouserc.json`
- **Build/gates**: `scripts/build.mjs`, `scripts/build-images.mjs`, `scripts/preflight.mjs`, `scripts/validate-manifest.mjs`, `scripts/serve-e2e.mjs`

## Runtime/Tooling Preferences

- **Node.js ≥20.0.0**, npm ≥10.0.0 (pinned). Use `npm ci`. No Bun/Deno.
- **Python 3 ≥3.10** for dev server; Playwright webServer uses `scripts/serve-e2e.mjs` (range-capable).
- **ffmpeg/ffprobe ≥5** with `aac` + `libopus` encoders (required for `build:images`/build).
- **tesseract ≥4** (E2E OCR/content audits).
- **Playwright browsers**: chromium, firefox, webkit (install via `npx playwright install --with-deps`).
- **Chrome/Chromium** for Lighthouse (`CHROME_PATH`).
- **Firefox** needs a real audio output device (PulseAudio null sink in CI).
- **WebKit** may have issues locally on some distros; CI uses ubuntu-latest.

## Testing & QA

- **Unit**: `npm run test:unit` via `node --test tests/unit/*.test.js`. Given-when-then naming, property-based tests where appropriate.
- **E2E**: `npm run test:e2e` (Playwright, 5 projects: `mobile-chromium`, `mobile-webkit`, `desktop-chromium`, `desktop-firefox`, `desktop-webkit`). **Serial** (`workers: 1`). Must use `scripts/serve-e2e.mjs` (range-capable).
- **Perf**: `npm run test:perf` (Chromium-only). `npm run test:perf:webkit` for WebKit compositor validation.
- **Lighthouse**: `npm run ci:lighthouse` (perf ≥0.9, a11y ≥0.95, CLS ≤0.1, LCP ≤2500ms).
- **CI gates**: `preflight && validate && test:unit && build:images && build && test:e2e && test:perf` enforced.
- **Gotchas**: E2E server must be range-capable (`scripts/serve-e2e.mjs`), Firefox needs audio sink, `tests/e2e/zz-boot-manifest.spec.js` requires `npm run build` first.
