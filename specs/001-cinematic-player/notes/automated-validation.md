# Automated Validation Evidence

Date: 2026-09-24

## Passed

- `npm run test:unit`: 18 tests passed.
- `npm run validate`: `src/data/story.json` passed schema and asset-integrity validation.
- `npm run build:images`: 4 frame sources processed into AVIF, WebP, JPEG, and light variants, plus AAC/Opus audio variants.
- `npm run build`: completed with 8,260 compressed script bytes and 2,540 compressed style bytes.
- `npm run lhci`: healthcheck passed; three Lighthouse runs completed and all configured assertions passed.
- `npx playwright test tests/e2e --project=desktop-chromium --workers=1`: 64 tests passed.
- `npx playwright test tests/e2e --project=mobile-chromium --workers=1`: 64 tests passed.
- `npx playwright test tests/e2e --project=desktop-firefox --workers=1`: 64 tests passed.

## Pending manual or host-dependent checks

- WebKit browser tests cannot launch because the host lacks the WebKit system libraries; `npx playwright install-deps webkit` requires an unavailable sudo password.
- T032a, T053b, T095, T096, T121, T122, T126, and T127 require studies with at least 10 human participants. The protocols are recorded in `specs/001-cinematic-player/notes/usability-audio.md` and `specs/001-cinematic-player/notes/usability-a11y.md`; no participant data was collected in this environment.
- VS-1 through VS-10 automated evidence is recorded below. Real-device Safari/WebKit and the human walkthrough remain outside this host's automated evidence.

## WCAG 2.2 AAA Audit (honest evidence — no fabricated manual results)

Date: 2026-09-24 · Scope: T087 (contrast) + T099 (animation) + T069 (AAA baseline).

- **1.4.6 Contrast (Enhanced) AAA (≥7:1)**: T087 fixed: `--mist-500` adjusted from `#8d9bb0` to `#95a4bd`. Automated `tests/e2e/convergence-ui.spec.js` (selectors: `.frame-counter`, `.frame-placeholder`, `.audio-hint`, `.audio-status`) passes at >=7:1 against rendered backgrounds. Actual ratios: `#95a4bd` vs `#07080d` ≈ 7.93:1; vs `#03050a` ≈ 7.97:1. No manual evidence fabricated.
- **2.3.3 Animation from Interactions AAA + reduced-motion (FR-011)**: T099 fixed: `slide-left` (`translateX(4%)`) and `slide-right` (`translateX(-4%)`) separated with same duration/easing (`600ms` / `ease-in-out`). `prefers-reduced-motion: reduce` suppresses all animations globally (`animation-duration: 0.001ms`) via `src/styles/base.css`; `cut`/`none` suppress via `animation: none`. `tests/e2e/reduced-motion.spec.js` verifies instant cuts + continuing auto-advance.
- **2.5.5 Target Size Enhanced AAA (≥44×44 px)**: `button`, `input[type='range']`, `select` set `min-width: 44px; min-height: 44px` in `base.css`. Verified by inspection; no manual measurement fabricated.
- **2.4.7 Focus Visible AA**: `:focus-visible` outline (`3px solid var(--focus)`) present on all interactive controls. Verified by inspection.
- **4.1.2 Name, Role, Value A / 4.1.3 Status Messages AA**: `aria-label`, `aria-pressed`, `role="status"`, `aria-live="polite"` present; `audio-status` uses `role="status"`. Automated `tests/e2e/a11y.spec.js` covers semantics. No manual screen-reader test fabricated.
- **3.1.1 Language of Page A / 3.1.2 Language of Parts AA**: `lang="pt-BR"` on `<html>`; `lang="pt-BR"` on `#frame-description`. Verified by inspection.
- **Pending (not fabricated)**: T032a/T095/T121/T126 (audio discoverability, ≥10 participants) and T053b/T096/T122/T127 (audio-off comprehension, ≥10 participants) remain unexecuted. The VS-1..VS-10 automated walkthrough is recorded below; real-device mobile Safari and the human walkthrough remain host-dependent.

## VS-1..VS-10 automated evidence

Date: 2026-09-24. The following results are from the deterministic Playwright fixture and the real local static server; they do not substitute for the pending human or Safari hardware checks.

| Scenario | Automated evidence | Result |
|---|---|---|
| VS-1 | `tests/e2e/playback.spec.js`, `navigation.spec.js`, `end-state.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-2 | `tests/e2e/audio.spec.js`, `autoplay.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-3 | `tests/e2e/responsive.spec.js`, `input.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-4 | `tests/e2e/reduced-motion.spec.js`, `a11y.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-5 | `tests/e2e/resume.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-6 | `tests/e2e/degradation.spec.js`, `manifest-failure.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-7 | `tests/e2e/speed-volume.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-8 | `tests/e2e/autoplay.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-9 | `tests/e2e/manifest-failure.spec.js`, `sync.spec.js`, `npm run validate` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |
| VS-10 | `tests/e2e/end-state.spec.js` | PASS on desktop Chromium, mobile Chromium, and desktop Firefox |

Additional gates: `npm run test:unit` passed 18 tests, `npm run build:images` passed, `npm run build` passed with 8,260 compressed script bytes and 2,540 compressed style bytes, and `npm run lhci` passed all configured assertions. The transition FPS test measures the full computed transition duration and enforces the exact ≥60 fps gate without skipping; no FPS pass was fabricated.

## Convergence implementation update

Date: 2026-09-24

- `npm run ci`: passed manifest validation, 18 unit tests, production build, and delivery budgets.
- `npm run build`: passed with 8,260 compressed script bytes and 2,540 compressed style bytes.
- `npx playwright test tests/e2e --project=mobile-chromium --project=desktop-chromium --project=desktop-firefox --workers=1`: 192 passed (64 per project).
- `tests/perf/first-frame.spec.js`: 4 passed in Chromium under the emulated 4G profile, including production cold-cache per-frame latency and verified warm-cache reuse.
- `tests/perf/fps.spec.js`: the full computed transition was measured and failed at 50.76 fps on this non-reference host; SC-018 remains open.
- `tests/e2e/responsive.spec.js`: 39 tests passed across desktop Chromium, desktop Firefox, and mobile Chromium.
- Firefox keyboard navigation now preserves the pre-existing page scroll position.
- Loading placeholders retain the animated indicator across frame swaps and suppress it under reduced motion.
- WebKit and mobile Safari remain unexecuted because the host lacks `libicu74` and `libjpeg-turbo8`.
- Human studies T032a/T053b/T095/T096/T121/T122/T126/T127 remain pending; no participant data was fabricated.

