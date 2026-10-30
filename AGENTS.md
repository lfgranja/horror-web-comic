# Repository Guidelines

Concise, AI-assistant-oriented reference for the `horror-web-comic` codebase. Vanilla ES-module, manifest-driven cinematic comic player with audio, accessibility, and automated quality gates. No backend, no framework.

## Project Overview

Static HTML/CSS/JS comic player. A narrative manifest (`src/data/story.json`, schema v1) drives scenes, frames, images (AVIF/WebP/JPEG + srcset), audio, and transitions. Build pipeline (esbuild) bundles JS/CSS, validates asset refs, enforces byte budgets, copies to `dist/`. All tooling pinned; `npm run preflight` is the hard gate before any work.

## Architecture & Data Flow

Boot order (`src/scripts/main.js` `boot()`):
1. `createStorageManager()` → load saved theme → set `document.documentElement.dataset.theme`
2. `await loadStory(storyUrl)` → `storage.setStoryId(story.id)`
3. `detectCapabilities()` → `new AccessibilityController()` → `new AudioManager(...)` → `new CinematicPlayer(...)`
4. Apply saved volume/speed/theme; wire theme change, `pageshow` restore, sensory dialog, catalog dialog
5. `player.schedule()` → `player.setAudioState(audio.state())`

Key modules:
- `player.js` (`CinematicPlayer`): state machine `idle`→`playing`/`paused`/`ended`; 250ms auto-start; 400ms navigation coalescing (`queueNavigation`); `moveTo(target)` bounds-checks, cancels transition, saves progress, renders; `resumeRequired` latch on visibility loss (modal overlay, FR-033); memory illusions on backward nav (latched in `sessionStorage hwc.latched:<id>`); image loading with 10s watchdog + fallback retry; transitions `cut` under reduced-motion/degradation else fade 600ms; `preloadNext()` gated on connection/memory.
- `audio.js` (`AudioManager`): source-less elements (URL parked on `dataset.trackSource`), armed via `assignSource()` before `play()`; autoplay probe at volume 0.01 (not muted — T199); fades (in 300ms, scene 500ms, frame 300ms, stop 40ms) guarded by generation tokens; scene bed ducked to 40% when a frame track is active (FR-006); blocked → `markBlocked()` overlay; `continueSilently()` persists `hwc.audio=off` across visits (T211).
- `story-loader.js`: `loadStory(url, fetcher=fetch)` with `no-store` cache; `validateStory` (schema v1, allow-listed keys, transition types `cut|fade|zoom-in|zoom-out|dissolve|slide-left|slide-right|none`, easings, integer durations 500–30000ms, fx types/intensity, image `avif`+`fallback` required, srcset width descriptors, sizes syntax); throws `manifest-unavailable`/`manifest-malformed`/`manifest-incompatible`. `isSafeLocalReference` (from `safe-reference.js`): no scheme/`//`/absolute/drive-letter/query/hash/backslash, no `.`/`..`/empty segments.
- `light-variants.js`: single source of `-light-*` naming (`lightUrl`, `lightAudioSource`, `lightSrcset`, `resolveImageSources`, `LIGHT_MAX_SIDE=1280`). Never re-derive inline.
- `storage.js` (`StorageManager`): keys `hwc.audio|volume|speed|progress|theme|schemaVersion`; channels `progress`/`theme`/`hwc:sensory` via BroadcastChannel with `storage` fallback; `tabId` via `crypto.randomUUID`; progress ordering `(updatedAt, seq, tabId)`; `receiveProgress` adopts only newer; `saveProgress` bumps monotonic `seq`. `schemaVersion` mismatch → wipe. localStorage unavailable → silent in-memory fallback.
- `capabilities.js`: `detectCapabilities()` → `{saveData, effectiveType, rtt, deviceMemory, hardwareConcurrency, reducedMotion, slowConnection, lowMemory, lowCpu, shouldDegrade, imageVariant, audioVariant}`; `watchCapabilities(cb)` returns unsubscribe.
- `a11y.js` (`AccessibilityController`): debounced 500ms announce into `#frame-description` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`).

Data flow: manifest → `loadStory` (validate) → `CinematicPlayer` (builds frames, renders `<picture>` avif→webp→fallback, manages transitions) → `AudioManager` (scene bed + frame stings, ducking, fades) → `StorageManager` (progress/theme/audio persisted, cross-tab sync). Light variants resolved at runtime (`shouldDegrade`/`saveData`).

## Key Directories

- `src/scripts/` — player, audio, storage, story-loader, light-variants, capabilities, a11y, safe-reference, sensory-taxonomy
- `src/styles/` — tokens.css, base.css, player.css
- `src/data/` — story.json, catalog.json, stories/o-alojamento.json
- `media-src/` — masters (frames/audio), never published; sidecar `.json` required
- `assets/` — publishable tree (manifest-referenced, delivery-encoded only)
- `scripts/` — build/validation pipeline (see Development Commands)
- `tests/unit/` — Node native tests; `tests/e2e/` — Playwright; `tests/perf/` — perf budgets; `tests/fixtures/` — manifests + assets
- `docs/` — delivery, authoring, authoring-accessibility, briefs, monetization, image-quality-assessment
- `specs/` — 001–005 feature specs with spec/plan/tasks/checklists
- `.specify/bugs/` — 18 bug assessments (assess/fix/test)

## Development Commands

```bash
npm run preflight        # host/toolchain gate (run before anything)
npm run validate         # manifest schema + asset refs
npm run report           # compatibility report (static, no build/browser)
npm run build:images     # generate light variants (needs ffmpeg)
npm run build            # validate + production build to dist/
npm run test:unit        # node --test tests/unit/*.test.js
npm run test:e2e         # Playwright matrix (5 projects)
npm run test:perf        # perf budgets (Chromium only)
npm run test:perf:webkit # SC-018 on WebKit projects (macOS job)
npm run ci               # preflight → validate → test:unit → build:images → build → test:e2e → test:perf
npm run ci:lighthouse    # Lighthouse (needs Chrome)
npm run serve            # python3 -m http.server 8080 (NO Range — dev only)
```

Single files: `node --test tests/unit/storage.test.js`; `npx playwright test tests/e2e/playback.spec.js --project=mobile-chromium`; `npx playwright test tests/perf/first-frame.spec.js`.

## Code Conventions & Common Patterns

- **Modules**: vanilla ES modules (`"type": "module"`), no framework. Group imports: std → external → local (`use crate::` style per AGENTS.md).
- **Naming**: structs/classes PascalCase, functions/variables snake_case (JS camelCase in practice: `CinematicPlayer`, `openPlayer`), constants UPPER_SNAKE_CASE, modules snake-case.
- **Formatting**: 4-space indent, 100 soft / 120 hard line limit, trailing commas, `cargo fmt`-equivalent `npm run` (no formatter configured; follow existing style). Run `cargo fmt`/clippy only for Rust (not applicable here).
- **Error handling**: custom error codes (`manifest-unavailable`, `manifest-malformed`, `manifest-incompatible`); `?`-style propagation via try/catch with friendly error screen; `thiserror`-equivalent not used (plain JS).
- **Async**: `async/await` throughout; `boot()` is async top-level. Tests use `node:test` + `assert/strict`.
- **State management**: in-memory + localStorage with BroadcastChannel cross-tab sync; `defaultsOnly` flag for private-mode fallback; `seq` monotonic for progress ordering.
- **Dependency injection**: constructors take `{story, storage, audio, capabilities, a11y}`; `loadStory(url, fetcher=fetch)` injectable for tests.
- **Test hooks**: gated by `__CINEMATIC_PRODUCTION__` define (stripped from prod bundle by esbuild).
- **PT-BR copy** throughout UI and comments.
- **Pinned deps**: all 8 devDependencies exact (no ranges); preflight fails on drift. `engines.node >=20.0.0`.

## Important Files

- Entry: `src/scripts/main.js`, `index.html`
- Manifest: `src/data/story.json`, `src/data/catalog.json`
- Core: `src/scripts/player.js`, `audio.js`, `storage.js`, `story-loader.js`, `light-variants.js`, `capabilities.js`, `a11y.js`, `safe-reference.js`, `sensory-taxonomy.js`
- Config: `package.json`, `budget.json`, `playwright.config.js`, `lighthouserc.json`
- Build: `scripts/build.mjs`, `build-images.mjs`, `preflight.mjs`, `validate-manifest.mjs`, `serve-e2e.mjs`
- Gates: `svg-sanitize.mjs`, `sidecar.mjs`, `delivery-fidelity.mjs`, `atomic-write.mjs`, `ci-trailers.mjs`, `compatibility-report.mjs`
- Docs: `docs/delivery.md`, `authoring.md`, `authoring-accessibility.md`, `image-quality-assessment.md`

## Runtime/Tooling Preferences

- **Node.js ≥20.0.0**, npm ≥10.0.0 (pinned). No Bun/Deno.
- **Package manager**: npm (exact pins, lockfile v3). Run `npm ci` (not `npm install`) to respect pins.
- **Python 3 ≥3.10** (serve, Playwright webServer).
- **ffmpeg/ffprobe ≥5** with `aac` + `libopus` encoders (build:images, build).
- **tesseract ≥4** (e2e OCR).
- **Playwright browsers**: chromium, firefox, webkit (same revision as pinned @playwright/test). `npx playwright install --with-deps chromium firefox webkit`.
- **Chrome/Chromium** binary for Lighthouse (`CHROME_PATH`).
- **librsvg** (pkg-config or sharp SVG decode) for SVG masters.
- **Fedora caveat**: WebKit cannot launch locally (ICU 74 pinned vs 77 system); browser-launch preflight check fails; run chromium+firefox subset only. CI uses ubuntu-latest.
- **Audio sink**: Firefox needs a real output device (PulseAudio `module-null-sink`); otherwise tracks latch as failed.

## Testing & QA

- **Unit**: `npm run test:unit` (`node --test tests/unit/*.test.js`). 227 tests, given-when-then naming, happy path + error cases.
- **E2E**: `npm run test:e2e` (Playwright, 5 projects: mobile-chromium, mobile-webkit, desktop-chromium, desktop-firefox, desktop-webkit). Serial (`workers: 1`) to avoid cross-context BroadcastChannel progress leakage.
- **Perf**: `npm run test:perf` (Chromium-only, CDP network emulation 170ms RTT/9Mbps). SC-018: 0 animation frames during transition (counter, not FPS). SC-001/SC-019/SC-008 first-frame budgets. WebKit pair: `npm run test:perf:webkit` (macOS job only — hardware compositor).
- **Lighthouse**: `npm run ci:lighthouse` (perf ≥0.9, a11y ≥0.95, CLS ≤0.1, LCP ≤2500ms).
- **Gotchas**: E2E server must be `scripts/serve-e2e.mjs` (HTTP Range); `python3 -m http.server` answers 200 to range requests and breaks WebKit/Firefox seeking. Firefox needs null PulseAudio sink. `zz-boot-manifest.spec.js` requires `npm run build` first.
- **Coverage expectations**: no formal coverage tool; tests pin behavior, boundaries, invariants, transitions, precedence, errors. Avoid testing wiring/copies/forwarding.

## Notes

- `index.html` has a duplicated closing `</section>` after `#player` (harmless).
- `docs/attestation.md` is empty; `docs/delivery.md` lists stale pinned versions vs `package.json` (0.15.1 / 1.64.1 / 0.28.2 / 0.35.5).
- `playwright.config.js` comment says pinned Playwright 1.63.0; `package.json` pins 1.64.1.
- `build-images.mjs` imports `atomic-write.mjs` but never calls it (dead import); rejects masters >1200px while `docs/delivery.md` says 2560px ceiling (contradictory).
- `ci-trailers.mjs` enforces commit trailers but the sidecar-provenance comparison is not implemented.
- `npm run serve` (python3, no Range) must not substitute for `serve-e2e.mjs` in E2E.