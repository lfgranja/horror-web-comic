# Repository Guidelines

## Project Overview

Vanilla ES-module cinematic comic player (no backend/framework). A manifest-driven player (`src/data/story.json`, schema v1) loads scenes/frames/images (AVIF/WebP/JPEG + srcset), audio, and transitions. The build pipeline (`esbuild`) bundles JS/CSS, validates asset refs, enforces byte budgets, and copies to `dist/`. `npm run preflight` is the hard gate before work. The app supports themes, accessibility (reduced motion/announcements), audio with fading/ducking, cross-tab progress sync via BroadcastChannel + `storage` events, and capability-based degradation.

## Architecture & Data Flow

### Boot order (`src/scripts/main.js` `boot()`)
1. `createStorageManager()` → load saved state; apply theme to `document.documentElement` and sync `#theme`
2. `await loadStory(storyUrl)` → `storage.setStoryId?.(story.id)`; set `globalThis.__bootDebug`
3. `detectCapabilities()` → `new AccessibilityController()` → `new AudioManager({...})` → `new CinematicPlayer({...})` (DI: `{story, storage, audio, capabilities, a11y}`)
4. Sync controls from saved state (volume/speed/theme), wire theme changes/listeners (`storage.onTheme`, `pageshow`), show sensory dialog on first run (non-reduced/non-automated), render catalog dialog, set titles
5. Subscribe to cross-tab progress: `storage.onProgress(record => player?.adoptProgress?.(record))`
6. `player.setAudioState(audio.state())`. Test hooks (`__cinematicPlayer`, `__audioManager`, `__initialPlayerIndex`) attached only when not production bundle (`!globalThis.__CINEMATIC_PRODUCTION__`)

### Entry points
- `index.html` loads styles and `<script type="module" src="src/scripts/main.js"></script>`; `alojamento.html` also exists. Default manifest `src/data/story.json`. Dev/test may override via `?story=` only for `tests/...` or the manifest (production bundle ignores override). Errors map loader codes to friendly messages.
- `src/scripts/main.js`: resolves story URL, wires UI (theme/sensory/catalog), bootstraps DI graph.

### Key modules
- `src/scripts/player.js` (`CinematicPlayer`): state machine `idle`→`playing`/`paused`/`ended`; navigation coalescing; `moveTo(target)` bounds-checks/cancels transition/saves progress/renders; `adoptProgress(record)` for cross-tab sync (moves to frame if different, preserves play state, pauses audio during transition, calls `render()`); memory illusions on backward nav (sessionStorage latched); image loading with watchdog + fallback; transitions `cut` under reduced-motion/degradation else fade; `preloadNext()` gated by connection/memory. Renders `<picture>` with srcset/sizes.
- `src/scripts/audio.js` (`AudioManager`): source-less elements with URLs on `dataset.trackSource`, armed via `assignSource()` before `play()`; autoplay probe at low volume; fades/ducking (scene bed ducked when frame track active); blocked → overlay; `continueSilently()` persists `hwc.audio=off`.
- `src/scripts/story-loader.js`: `loadStory(url, fetcher=fetch)` with `no-store`; `validateStory` enforces schema v1 (allow-listed keys, transition types/easings/durations, fx, image `avif`+`fallback` required, srcset/sizes); throws `manifest-unavailable`/`manifest-malformed`/`manifest-incompatible`. Uses `isSafeLocalReference` (no schemes/`//`/absolute/drive/query/hash/backslash, no `.`/`..`/empty segments).
- `src/scripts/storage.js` (`StorageManager`): keys `hwc.audio|volume|speed|progress|theme|schemaVersion` (v1); defaults; BroadcastChannel for progress/theme with `storage` event fallback; `tabId` via `crypto.randomUUID()`; progress ordered by `(updatedAt, seq, tabId)`; `saveProgress` bumps monotonic `seq`; schema mismatch wipes; localStorage unavailable → in-memory fallback. Exposes `onProgress`, `onTheme`, `onSensory`.
- `src/scripts/light-variants.js`: single source of truth for `-light-*` naming/resolution (`LIGHT_MAX_SIDE=1280`).
- `src/scripts/capabilities.js`: `detectCapabilities()` returns network/memory/cpu/reduced-motion/degradation + `imageVariant`/`audioVariant`; `watchCapabilities(cb)`.
- `src/scripts/a11y.js` (`AccessibilityController`): debounced announcements to `#frame-description` (`role="status"`, `aria-live="polite"`).
- `src/scripts/safe-reference.js`, `src/scripts/sensory-taxonomy.js`: validation/taxonomy helpers.

**Data flow:** manifest → `loadStory` (validate) → `CinematicPlayer` (frames/picture/transitions) → `AudioManager` (beds/stings/ducking/fades) → `StorageManager` (persistence/cross-tab sync). Cross-tab: storage emits progress via BroadcastChannel/storage events → `onProgress()` subscribers (e.g. `main.js` calls `player.adoptProgress()`). Light variants resolved via capabilities/saveData.

## Key Directories

- `src/scripts/` — core runtime (player, audio, storage, story-loader, main, light-variants, capabilities, a11y, safe-reference, sensory-taxonomy)
- `src/styles/` — `tokens.css`, `base.css`, `player.css`
- `src/data/` — `story.json`, `catalog.json`, `stories/o-alojamento.json`; schema in `specs/001-cinematic-player/contracts/story-manifest.schema.json`
- `media-src/` — masters (never published), sidecars required
- `assets/` — publishable delivery tree (manifest-referenced)
- `scripts/` — build/validation/gates (`build.mjs`, `build-images.mjs`, `preflight.mjs`, `validate-manifest.mjs`, `serve-e2e.mjs`, `svg-sanitize.mjs`, `sidecar.mjs`, `delivery-fidelity.mjs`, `atomic-write.mjs`, `ci-trailers.mjs`, `compatibility-report.mjs`)
- `tests/unit/` — Node native tests (`node --test`) (~33 files)
- `tests/e2e/` — Playwright specs (~71 files + helpers), serial execution
- `tests/perf/` — perf budgets (`fps.spec.js`, `first-frame.spec.js`, `zz-ci-budgets.spec.js`)
- `tests/fixtures/` — manifests/assets/audit samples
- `docs/` — delivery/authoring/accessibility/image quality/monetization/briefs/attestation
- `specs/` — feature specs/plans/tasks/checklists (001–005)
- `.specify/` — speckit artifacts (bugs/assessments/fixes/tests, templates/memory/commands)

## Development Commands

```bash
npm run preflight        # host/toolchain gate (run before anything)
npm run validate         # manifest schema + asset refs
npm run report           # compatibility report (static)
npm run build:images     # generate light variants (needs ffmpeg/ffprobe)
npm run build            # validate + production build to dist/
npm run test:unit        # node --test tests/unit/*.test.js
npm run test:e2e         # Playwright matrix (5 projects, serial)
npm run test:perf        # perf budgets (Chromium only)
npm run test:perf:webkit # SC-018 on WebKit projects
npm run ci               # preflight → validate → test:unit → build:images → build → test:e2e → test:perf
npm run ci:lighthouse    # Lighthouse CI
npm run serve            # python3 -m http.server 8080 (dev only, NO Range - use scripts/serve-e2e.mjs for E2E)
```

Examples:
- `node --test tests/unit/storage.test.js`
- `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium`
- `npx playwright test tests/perf/first-frame.spec.js`

## Code Conventions & Common Patterns

- **Modules**: Vanilla ES modules (`"type": "module"`), no framework. Imports grouped std → external → local.
- **Naming**: Classes/constructors PascalCase (`CinematicPlayer`, `AudioManager`, `StorageManager`, `AccessibilityController`), functions/variables camelCase, constants UPPER_SNAKE_CASE, modules kebab-case/flat.
- **Formatting**: 4-space indent, ~100 soft/120 hard line limit, trailing commas. No configured formatter.
- **Error handling**: Custom error codes (`manifest-unavailable`, `manifest-malformed`, `manifest-incompatible`); try/catch with friendly error screen (`#error-screen`). Validation via AJV/schema + `validateStory`.
- **Async**: `async/await` throughout; `boot()` is async top-level.
- **State management**: In-memory + localStorage with BroadcastChannel cross-tab sync; `defaultsOnly` fallback for private mode; monotonic `seq` for progress ordering; schema versioning with wipe on mismatch.
- **Dependency injection**: Constructors take explicit deps (`{story, storage, audio, capabilities, a11y}`); `loadStory(url, fetcher=fetch)` injectable for tests.
- **Test hooks**: Gated by `__CINEMATIC_PRODUCTION__` (stripped from prod bundle); attached only in dev/non-production.
- **i18n**: PT-BR copy throughout UI/comments.
- **Safety**: Local-safe references enforced (`safe-reference.js`), SVG sanitized, sidecars required, fidelity checked, byte budgets enforced.
- **Pinned deps**: All devDependencies exact; `preflight` fails on drift. `engines.node >=20.0.0`.

## Important Files

- **Entry/UI**: `src/scripts/main.js`, `index.html`, `alojamento.html`
- **Manifests/contracts**: `src/data/story.json`, `src/data/catalog.json`, `src/data/stories/o-alojamento.json`, `specs/001-cinematic-player/contracts/story-manifest.schema.json`
- **Core runtime**: `src/scripts/player.js`, `src/scripts/audio.js`, `src/scripts/storage.js`, `src/scripts/story-loader.js`, `src/scripts/light-variants.js`, `src/scripts/capabilities.js`, `src/scripts/a11y.js`, `src/scripts/safe-reference.js`, `src/scripts/sensory-taxonomy.js`
- **Styles**: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/player.css`
- **Config**: `package.json`, `budget.json`, `playwright.config.js`, `lighthouserc.json`
- **Build/gates**: `scripts/build.mjs`, `scripts/build-images.mjs`, `scripts/preflight.mjs`, `scripts/validate-manifest.mjs`, `scripts/serve-e2e.mjs`, `scripts/svg-sanitize.mjs`, `scripts/sidecar.mjs`, `scripts/delivery-fidelity.mjs`, `scripts/atomic-write.mjs`, `scripts/ci-trailers.mjs`, `scripts/compatibility-report.mjs`
- **Docs/specs**: `docs/delivery.md`, `docs/authoring.md`, `docs/authoring-accessibility.md`, `docs/image-quality-assessment.md`, `specs/*`, `.specify/bugs/*`

## Runtime/Tooling Preferences

- **Node.js ≥20.0.0**, npm ≥10.0.0 (pinned). No Bun/Deno.
- **Package manager**: npm with exact pins and lockfile v3. Use `npm ci` (not `npm install`).
- **Python 3 ≥3.10** (dev server; Playwright webServer).
- **ffmpeg/ffprobe ≥5** with `aac` + `libopus` encoders (required for `build:images`/build).
- **tesseract ≥4** (used by E2E OCR/content audits).
- **Playwright browsers**: chromium, firefox, webkit (same revision as pinned `@playwright/test`). Install via `npx playwright install --with-deps chromium firefox webkit`.
- **Chrome/Chromium** binary for Lighthouse (`CHROME_PATH`).
- **librsvg** (pkg-config or sharp SVG decode) for SVG masters.
- **Fedora caveat**: WebKit may fail to launch locally due to ICU mismatch; browser-launch preflight may fail — run chromium+firefox subset locally. CI uses ubuntu-latest.
- **Audio sink**: Firefox needs a real output device (PulseAudio `module-null-sink` in CI).

## Testing & QA

- **Unit**: `npm run test:unit` via `node --test tests/unit/*.test.js`. Given-when-then naming, covers happy path and error cases. Avoid testing wiring/copies/forwarding.
- **E2E**: `npm run test:e2e` (Playwright, 5 projects: `mobile-chromium`, `mobile-webkit`, `desktop-chromium`, `desktop-firefox`, `desktop-webkit`). **Serial** (`workers: 1`) to avoid cross-context BroadcastChannel progress leakage. Use `scripts/serve-e2e.mjs` (range-capable). Mobile viewports 360×800; desktop defaults.
- **Perf**: `npm run test:perf` (Chromium-only, CDP network emulation ~170ms RTT/9Mbps). SC-018 measures 0 animation frames during transition (rAF counter). SC-001/SC-019/SC-008 cover first-frame budgets. `npm run test:perf:webkit` runs WebKit perf on macOS-15 for hardware compositor validation.
- **Lighthouse**: `npm run ci:lighthouse` (perf ≥0.9, a11y ≥0.95, CLS ≤0.1, LCP ≤2500ms).
- **CI gates (enforced)**: `preflight && validate && test:unit && build:images && build && test:e2e && test:perf` (see `.github/workflows/ci.yml`). Additional jobs: `webkit-layout-gate` (Linux WebKit layout specs), `macos-webkit-compositor` (SC-018). Trailers enforced by `scripts/ci-trailers.mjs`.
- **Gotchas**: E2E server must be `scripts/serve-e2e.mjs` (python `http.server` breaks range/seeking in WebKit/Firefox). Firefox needs audio sink. `tests/e2e/zz-boot-manifest.spec.js` requires `npm run build` first.
