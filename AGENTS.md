# Repository Guidelines

Concise, AI-assistant-oriented reference for the `horror-web-comic` codebase. Vanilla ES-module, manifest-driven cinematic comic player with audio, accessibility, and automated quality gates. No backend, no framework.

## Project Overview

Static HTML/CSS/JS comic player. A narrative manifest (`src/data/story.json`, schema v1) drives scenes, frames, images (AVIF/WebP/JPEG + srcset), audio, and transitions. The build pipeline (`esbuild`) bundles JS/CSS, validates asset refs, enforces byte budgets, and copies to `dist/`. All tooling is pinned; `npm run preflight` is the hard gate before any work.

## Architecture & Data Flow

### Boot order (`src/scripts/main.js` `boot()`)
1. `createStorageManager()` → load saved state; apply theme via `document.documentElement.dataset.theme` and sync `#theme` select.
2. `await loadStory(storyUrl)` → `storage.setStoryId?.(story.id)`; set `globalThis.__bootDebug`. URL resolution: production bundle ignores `?story=` override and forces `src/data/story.json`; in dev/test only allows override to production manifest or `tests/...` (else fails closed).
3. `detectCapabilities()` → `new AccessibilityController()` → `new AudioManager({story, storage, a11y, capabilities, onStateChange})` → `new CinematicPlayer({story, storage, audio, capabilities, a11y})` (DI constructors).
4. Sync controls from saved state (volume/speed/theme), wire theme changes/listeners (`storage.onTheme`, `pageshow`), show sensory dialog on first run (non-reduced/non-automated), render catalog dialog, set titles.
5. Apply sensory mode (`html[data-sensory-mode]`), wire toggle, `player.schedule()`, `player.setAudioState(audio.state())`. Test hooks (`__cinematicPlayer`, `__audioManager`, `__initialPlayerIndex`) attached only when not production bundle (`!globalThis.__CINEMATIC_PRODUCTION__`).

### Entry points
- `index.html` loads `src/styles/{tokens,base,player}.css` and `<script type="module" src="src/scripts/main.js"></script>`. App shell `#app`, story manifest default `src/data/story.json`. UI includes player frame/controls/overlays/dialogs/badges. (`alojamento.html` also exists.)
- `src/scripts/main.js`: resolves story URL via `?story=` only in dev/non-production bundle with allowlist; otherwise forces production manifest. Maps loader errors (`manifest-unavailable`/`manifest-malformed`/`manifest-incompatible`) to friendly messages via `showError()`.

### Key modules (exact responsibilities)
- `src/scripts/player.js` (`CinematicPlayer`): state machine `idle`→`playing`/`paused`/`ended`; 250ms auto-start; navigation coalescing via `queueNavigation()`; `moveTo(target)` bounds-checks, cancels transition, saves progress, renders. Builds frames via `buildFrames()` (flattened scenes→frames). `resolveDuration()` uses authored values with defaults (`Math.max(MINIMUM_DWELL, authored/speed)`). `resolveTransition()` respects reduced-motion (cut) and degrades non-cut to cut when `shouldDegrade`. Image loading with timeouts/fallback; uses `light-variants` based on capabilities. Resume overlay on focus loss/modal states (`resumeRequired`), end overlay at completion.
- `src/scripts/audio.js` (`AudioManager`): source-less elements with URL parked in `dataset.trackSource`, assigned via `assignSource()` before `play()`; autoplay probe at volume 0.01 (not muted); fades with generation tokens; scene bed ducking behavior; blocked → `#blocked-overlay` with unlock/`continueSilently()` (persists `hwc.audio=off`).
- `src/scripts/story-loader.js`: `loadStory(url, fetcher=fetch)` with `no-store` cache; `validateStory()` enforces schema v1 (allow-listed keys), transition types (`cut|fade|zoom-in|zoom-out|dissolve|slide-left|slide-right|none`), easings, integer durations 500–30000ms, fx types/intensity, image `avif`+`fallback` required with validated srcset/sizes; throws `manifest-unavailable`/`manifest-malformed`/`manifest-incompatible`. Re-exports `isSafeLocalReference` from `safe-reference.js`.
- `src/scripts/light-variants.js`: single source of truth for `-light-*` naming (`LIGHT_MAX_SIDE=1280`). `lightUrl()`, `lightAudioSource()`, `lightSrcset()`, `resolveImageSources()`. Never re-derive inline.
- `src/scripts/storage.js` (`StorageManager`): keys `hwc.audio|volume|speed|progress|theme|schemaVersion` (SCHEMA_VERSION `1`); defaults; BroadcastChannel for `progress`/`theme` with `storage` fallback; `tabId` via `crypto.randomUUID()` (with fallback); progress ordering by `(updatedAt, seq, tabId)`; `receiveProgress()` adopts only newer; `saveProgress()` bumps monotonic `seq`. Schema version mismatch → wipe. localStorage unavailable → in-memory fallback (`defaultsOnly`).
- `src/scripts/capabilities.js`: `detectCapabilities()` → `{saveData, effectiveType, rtt, deviceMemory, hardwareConcurrency, reducedMotion, slowConnection, lowMemory, lowCpu, shouldDegrade, imageVariant, audioVariant}`; `watchCapabilities(cb)` returns unsubscribe.
- `src/scripts/a11y.js` (`AccessibilityController`): debounced 500ms announcements into `#frame-description` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`).
- `src/scripts/safe-reference.js`: local-safe reference validation (no scheme/authority/absolute/drive-letter/query/hash/backslash, no `.`, `..`, empty segments; decodes once and re-validates).
- `src/scripts/sensory-taxonomy.js`: sensory descriptors/taxonomy normalization.

**Data flow:** Manifest (`src/data/story.json`) → `loadStory` (validate) → `CinematicPlayer` (flatten frames, restore progress, render with variant selection) → `AudioManager` (scene/frame elements, fades/ducking, autoplay unlock) → `StorageManager` (persistence/cross-tab sync). Light variants resolved via `capabilities`/`shouldDegrade`.

## Key Directories

- `src/scripts/` — core runtime modules (main, player, audio, storage, story-loader, light-variants, capabilities, a11y, safe-reference, sensory-taxonomy)
- `src/styles/` — `tokens.css`, `base.css`, `player.css`
- `src/data/` — `story.json`, `catalog.json`, `stories/o-alojamento.json`; schema at `specs/001-cinematic-player/contracts/story-manifest.schema.json`
- `media-src/` — masters (frames/audio), never published; sidecar `.json` required
- `assets/` — publishable delivery tree (manifest-referenced)
- `scripts/` — build/validation pipeline and gates (`build.mjs`, `build-images.mjs`, `preflight.mjs`, `validate-manifest.mjs`, `serve-e2e.mjs`, `svg-sanitize.mjs`, `sidecar.mjs`, `delivery-fidelity.mjs`, `atomic-write.mjs`, `ci-trailers.mjs`, `compatibility-report.mjs`)
- `tests/unit/` — Node native tests (`node --test`)
- `tests/e2e/` — Playwright specs, helpers in `tests/e2e/helpers.js` and `tests/e2e/helpers/`
- `tests/perf/` — perf budgets/specs
- `tests/fixtures/` — manifests/assets/audit samples
- `docs/` — authoring/delivery/image quality/monetization/briefs/attestation
- `specs/` — feature specs/plans/tasks/checklists
- `.specify/` — speckit artifacts

## Development Commands

```bash
npm run preflight        # host/toolchain gate (run before anything)
npm run validate         # manifest schema + asset refs
npm run report           # compatibility report (static, no build/browser)
npm run build:images     # generate light variants (needs ffmpeg/ffprobe)
npm run build            # validate + production build to dist/
npm run test:unit        # node --test tests/unit/*.test.js
npm run test:e2e         # Playwright matrix (5 projects), serial workers
npm run test:perf        # perf budgets (Chromium only)
npm run test:perf:webkit # SC-018 on WebKit projects (macOS job)
npm run ci               # preflight → validate → test:unit → build:images → build → test:e2e → test:perf
npm run ci:lighthouse    # Lighthouse CI (needs Chrome)
npm run serve            # python3 -m http.server 8080 (NO Range — dev only)
```

Single files/examples:
- `node --test tests/unit/storage.test.js`
- `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium`
- `npx playwright test tests/perf/first-frame.spec.js`

## Code Conventions & Common Patterns

- **Modules**: Vanilla ES modules (`"type": "module"`), no framework. Group imports: std → external → local.
- **Naming**: Classes/constructors PascalCase (`CinematicPlayer`, `AudioManager`, `StorageManager`, `AccessibilityController`), functions/variables camelCase, constants UPPER_SNAKE_CASE.
- **Formatting**: 4-space indent, ~100 soft/120 hard line limit, trailing commas.
- **Error handling**: Custom error codes (`manifest-unavailable`, `manifest-malformed`, `manifest-incompatible`); try/catch with friendly error screen (`#error-screen`). Validation via AJV/schema + `validateStory()`.
- **Async**: `async/await` throughout; `boot()` is async top-level.
- **State management**: In-memory + localStorage with BroadcastChannel cross-tab sync; `defaultsOnly` for private-mode fallback; monotonic `seq` for progress ordering; schema versioning with wipe on mismatch.
- **Dependency injection**: Constructors take explicit deps (`{story, storage, audio, capabilities, a11y}`); `loadStory(url, fetcher=fetch)` injectable for tests.
- **Test hooks**: Gated by `__CINEMATIC_PRODUCTION__` (stripped from prod bundle by esbuild); attached only in dev/non-production.
- **Safety**: Local-safe references enforced (`safe-reference.js`), SVG sanitized, sidecars required, fidelity checked, byte budgets enforced.

## Important Files

- **Entry/UI**: `src/scripts/main.js`, `index.html`, `alojamento.html`
- **Manifests/contracts**: `src/data/story.json`, `src/data/catalog.json`, `src/data/stories/o-alojamento.json`, `specs/001-cinematic-player/contracts/story-manifest.schema.json`
- **Core runtime**: `src/scripts/player.js`, `src/scripts/audio.js`, `src/scripts/storage.js`, `src/scripts/story-loader.js`, `src/scripts/light-variants.js`, `src/scripts/capabilities.js`, `src/scripts/a11y.js`, `src/scripts/safe-reference.js`, `src/scripts/sensory-taxonomy.js`
- **Styles**: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/player.css`
- **Config**: `package.json`, `budget.json`, `playwright.config.js`, `lighthouserc.json`
- **Build/gates**: `scripts/build.mjs`, `scripts/build-images.mjs`, `scripts/preflight.mjs`, `scripts/validate-manifest.mjs`, `scripts/serve-e2e.mjs`, `scripts/svg-sanitize.mjs`, `scripts/sidecar.mjs`, `scripts/delivery-fidelity.mjs`, `scripts/atomic-write.mjs`, `scripts/ci-trailers.mjs`, `scripts/compatibility-report.mjs`
- **CI**: `.github/workflows/ci.yml`
- **Docs/specs**: `docs/delivery.md`, `docs/authoring.md`, `docs/authoring-accessibility.md`, `docs/image-quality-assessment.md`, `specs/*`, `.specify/bugs/*`, `ROADMAP.md`

## Runtime/Tooling Preferences

- **Node.js ≥20.0.0**, npm ≥10.0.0 (pinned). ESM (`"type":"module"`). Use `npm ci` (not `npm install`).
- **Python 3 ≥3.10** (dev server). Custom range-capable server `scripts/serve-e2e.mjs` required for E2E (python `http.server` breaks range/seeking in WebKit/Firefox).
- **ffmpeg/ffprobe ≥5** with `aac` + `libopus` encoders (required for `build:images`/build).
- **tesseract ≥4** (used by E2E OCR/audits).
- **Playwright browsers**: chromium, firefox, webkit (same revision as pinned `@playwright/test`). Install via `npx playwright install --with-deps chromium firefox webkit`.
- **Chrome/Chromium** binary for Lighthouse (`CHROME_PATH`).
- **librsvg** (pkg-config or sharp SVG decode) for SVG masters.
- **Fedora caveat**: WebKit may fail to launch locally due to ICU mismatch; run chromium+firefox subset locally. CI uses ubuntu-latest.
- **Audio sink**: Firefox needs a real output device (PulseAudio `module-null-sink` in CI); otherwise tracks may latch as failed.
- **Pinned deps**: All devDependencies exact (no ranges); `preflight` fails on drift/lockfile/engines/scripts chain issues.

## Testing & QA

- **Unit**: `npm run test:unit` via `node --test tests/unit/*.test.js`. Given-when-then naming, covers happy path and error cases. Avoid testing wiring/copies/forwarding.
- **E2E**: `npm run test:e2e` (Playwright, 5 projects: `mobile-chromium`, `mobile-webkit` @360×800, `desktop-chromium`, `desktop-firefox`, `desktop-webkit`). **Serial** (`workers: 1`) to avoid cross-context BroadcastChannel progress leakage. Use `scripts/serve-e2e.mjs` (range-capable, cache-control). Firefox needs audio sink.
- **Perf**: `npm run test:perf` (Chromium-only, CDP network emulation ~170ms RTT/9Mbps). SC-018 measures 0 animation frames during transition (rAF counter). SC-001/SC-019/SC-008 cover first-frame budgets. `npm run test:perf:webkit` runs on macOS-15 for hardware compositor validation.
- **Lighthouse**: `npm run ci:lighthouse` (perf ≥0.9, a11y ≥0.95, CLS ≤0.1, LCP ≤2500ms), 3 runs, mobile 360×800.
- **CI gates (enforced)**: `gate` job runs `preflight && validate && test:unit && build:images && build && test:e2e && test:perf`, plus `ci-trailers`. Additional: `webkit-layout-gate` (fast WebKit layout specs), `macos-webkit-compositor` (SC-018). Artifacts on failure: `playwright-report/`, `test-results/`, `.lighthouseci/`.
- **Gotchas**: E2E server must be range-capable (`scripts/serve-e2e.mjs`); `tests/e2e/zz-boot-manifest.spec.js` requires `npm run build` first; trailers enforced by `scripts/ci-trailers.mjs`.
