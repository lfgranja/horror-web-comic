# Bug Assessment: Lighthouse LCP gate fails at 2.87 s against a 2.5 s budget on the mobile 4G profile

- **Slug**: lighthouse-lcp-over-budget
- **Created**: 2026-09-29T06:57:08-04:00
- **Source**: pasted text (CI run `36519876459`, `gate` job, step "Lighthouse delivery gate")
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

From the user's triage of the repository, and the CI log of run `36519876459` on
`fix/sc-018-comparison` (HEAD `ae654ab`):

> O que resta é o Lighthouse: LCP 2862ms vs. orçamento de ≤2500ms (3 runs:
> 2861.9 / 2863.9 / 2866.0).

CI log, verbatim assertion:

```
✘ largest-contentful-paint failure for maxNumericValue assertion
   Largest Contentful Paint
   expected: <=2500
   found: 2861.8606499999996
   all values: 2861.8606499999996, 2863.8540000000003, 2866.0423499999997
Assertion failed. Exiting with status code 1.
```

Every other step in the `gate` job is green — Preflight toolchain gate, Validate
story manifest, Unit tests, Build media variants, Production build, End-to-end
browser matrix, Performance budgets (non-skippable) — as is the
`macos-webkit-compositor` job. Only the Lighthouse assertion fails.

## Symptom

Under the mobile-emulated, 4×-CPU-slowed, slow-4G profile newly configured in
`lighthouserc.json`, Largest Contentful Paint lands at 2.87 s against a hard
`maxNumericValue: 2500` assertion; expected ≤ 2.5 s, observed 2.87 s — a ~14%
overshoot that is stable across all 3 runs (spread of 4 ms, so it is not noise).

## Reproduction

1. `git checkout fix/sc-018-comparison` (HEAD `ae654ab`).
2. `npm run ci` up to and including the production build (`npm run build`).
3. `npm run ci:lighthouse` (equivalently `npm run lhci`).

Observed locally, reproducing CI within 8 ms: LCP `2870.33` in
`.lighthouseci/127_0_0_1-_-2026_09_29_04_30_11.report.json` (run locally
2026-09-29 04:30, `configSettings.formFactor: "mobile"`,
`throttlingMethod: "simulate"`, `cpuSlowdownMultiplier: 4`).

[NEEDS CLARIFICATION: `largest-contentful-paint-element` **errored** in that report —
`Required TraceElements gatherer encountered an error: Dependency "RootCauses" failed
with exception: Cannot read properties of undefined (reading 'frame_sequence')`. So
Lighthouse never reported *which* element is the LCP. The identification of the frame
image as the LCP element below is inferred from the network record and the FCP/LCP gap,
not read from an audit. `prioritize-lcp-image`, `lcp-lazy-loaded` and
`render-blocking-resources` all returned `score: null` for the same reason.]

## Suspected Code Paths

Critical-path chain, taken verbatim from the `network-requests` audit of the local
report (observed request times, ms, before Lighthouse's throttling simulation is
layered on top):

| t (ms) | bytes | resource |
|---|---|---|
| 2.1 | 2,183 | `/` (document) |
| 41 | 902 | `src/styles/tokens-BHGJTCTD.css` |
| 42 | 1,056 | `src/styles/base-ADZFQEE4.css` |
| 43 | 2,798 | `src/styles/player-2P5E3ZOY.css` |
| 44 | 14,062 | `src/scripts/main-PATMSF4W.js` |
| **121** | 2,323 | **`src/data/story.json`** |
| **187** | 3,646 | **`assets/frames/generated/frame-01-960.avif`** |
| 198 | 5,692 | `assets/frames/generated/frame-02-960.webp` (preload of next frame) |
| 224 | 115,843 | `assets/audio/scene-01.aac` |
| 229 | 115,843 | `assets/audio/scene-02.aac` |
| 236 | 115,843 | `assets/audio/frame-03.aac` |

- `index.html:41-45` — the first frame's `<picture>` ships **empty**. Both
  `<source>` elements carry only a `type` attribute, no `srcset`; the `<img>` has
  no `src`. There is no `<link rel="preload">`, `rel="preconnect"`, or
  `fetchpriority` anywhere in the document. The LCP element is therefore not
  discoverable by the preload scanner at all.
- `src/scripts/main.js:56` — `const story = await loadStory(storyUrl);` inside
  `boot()`. This `await` sits between module evaluation and the existence of the
  player, serializing a full network round trip onto the critical path.
- `src/scripts/main.js:8` — `const PRODUCTION_MANIFEST = 'src/data/story.json'`.
  The manifest is a separate runtime fetch, not inlined; `dist/src/data/story.json`
  (8,362 B) is emitted as a standalone file.
- `src/scripts/main.js:75` — `player.schedule()`, the first call that reaches into
  the DOM and points the image at a real URL.
- `src/scripts/player.js:578` — `this.image.src = source;` — the assignment that
  finally triggers the image request.
- `src/scripts/audio.js:62` — `this.createElements();` runs in the `AudioManager`
  **constructor**, i.e. during `boot()` at `main.js:59`, before `player.schedule()`.
- `src/scripts/audio.js:76-93` — `createElements()` sets `preload='auto'` for every
  scene track at `currentScene` or `currentScene + 1` and every frame track in those
  scenes. With `currentSceneIndex ?? 0`, that is exactly `scene-01.aac`,
  `scene-02.aac` and `frame-03.aac` — **347,529 B, ~88% of the 384 KiB total page
  weight** — all three requests observable above starting at t=224-236 ms.
- `src/data/story.json` — `frame-01.image.avifSrcset` / `sizes: "100vw"` /
  `width: 1200` / `height: 800`. At 360 CSS px × `deviceScaleFactor: 2` = 720
  device px needed, the browser picks the **960w** candidate. Note the byte counts
  are *tiny* (3,646 B for the LCP image), so payload is not the problem.

## Root Cause Hypothesis

**The LCP image cannot start downloading until four serialized round trips have
elapsed, and 347 KB of inaudible audio shares the constrained link with it.**

`index.html` ships an empty `<picture>` (index.html:41-45). The image URL only
exists after: (1) the document arrives, (2) the JS module arrives and executes,
(3) `await loadStory()` resolves a separate `story.json` request (main.js:56), and
(4) `player.schedule()` → `player.js:578` assigns `src`. Each of those is a
serialized request; with Lighthouse's `requestLatencyMs: 562.5`, the four-round-trip
chain costs ~2,250 ms of pure latency before the 3,646 B image has even begun
transferring — which is why the measured 2.87 s is so far out of proportion to a
3.6 KB payload. Layered on top is `cpuSlowdownMultiplier: 4` over parsing and
executing the 50,622 B bundle plus AVIF decode and paint. Concurrently,
`AudioManager`'s constructor arms `preload='auto'` on three AAC tracks
(audio.js:62 → 76-93) that **cannot possibly produce sound before a user gesture** —
the shell's own `blocked-overlay` (index.html:73-80) exists because autoplay is
blocked — yet they consume ~88% of the initial page weight on a link modeled at
1.44 Mbit/s.

Confidence: **high** for the round-trip chain (read directly off the network record
and the source), **medium** for the audio contention as a contributing rather than
dominant term, and **medium** overall for the exact split between the two, since the
LCP-element audit errored and no phase breakdown (`TTFB` / load delay / load
duration / render delay) is available to apportion the 2.87 s.

### The budget is not the thing that is wrong

Two independent sources define 2.5 s as the reference-4G cold first-frame target, and
both were recorded on this same branch:

- `specs/001-cinematic-player/spec.md:543` — **SC-019**: *"Em conexão 4G de referência
  e cache frio, o primeiro quadro aparece [em < 2,5 s]"*.
- `docs/delivery.md:94` — *"Primeiro quadro frio: inferior a 2,5 s p75 em 4G de
  referência (SC-019)"*.

And `spec.md:84` records that the `formFactor: mobile` + 360×800 + `cpuSlowdownMultiplier: 4`
+ 4G network switch was made **deliberately**, so that *"as asserções de carga
(SC-014/SC-019) passem a ser decididas no perfil de forma da SC-001"* — i.e. so the load
assertions would be decided under the profile that actually represents the stated
intent. The previous desktop, unthrottled configuration never tested that intent at
all. So the audit is now correctly measuring the documented requirement, and the app
misses it by ~0.37 s. Relaxing the budget would be moving a goalpost the spec sets,
not correcting a mis-set threshold — but note it is a legitimate *policy* question,
since a previously-unmeasured condition has become newly binding.

### Why the Playwright SC-019 gate passes while Lighthouse fails

`tests/perf/first-frame.spec.js:76` also asserts `frame-01` under a "reference
network" within 2,500 ms at p75, and it passes. The two gates assert the same number
under contradictory conditions:

| | `first-frame.spec.js:11-16` | `lighthouserc.json:17-25` |
|---|---|---|
| latency | 170 ms | 562.5 ms (`requestLatencyMs`) |
| download | 9 Mbit/s | 1.44 Mbit/s (1474.56 kbps) — **6.2× slower** |
| CPU throttling | **none** | 4× slowdown |
| milestone measured | image `complete && naturalWidth > 0` | actual contentful paint |

`measureVisibleFrame` (`first-frame.spec.js:19-27`) returns `performance.now()` when
the `<img>` reports decode-complete. Decode-complete is strictly earlier than paint,
and it is polled by `waitForFunction` on rAF. Under 6.2× more bandwidth headroom,
3.3× less latency and no CPU slowdown, that earlier milestone still lands under
2.5 s. The Lighthouse profile is both stricter and spec-sanctioned. The Playwright
gate passing is therefore **not** counter-evidence to this bug.

## Proposed Remediation

**Preferred**: break the round-trip chain so the LCP image is discovered by the
preload scanner, and stop arming audio that cannot yet be heard.

1. **Emit the first frame's `<picture>` statically into `index.html` at build time.**
   `scripts/build.mjs` already rewrites asset references in the HTML; extend it to
   read the first scene's first frame out of the same manifest and write real
   `srcset`/`sizes` onto the existing `<source>`/`<img>` elements, plus a
   `<link rel="preload" as="image" imagesrcset="…" imagesizes="100vw"
   fetchpriority="high">` in `<head>`. This moves the image request into the preload
   scan, in parallel with the CSS and JS, removing one full serialized round trip
   (~562 ms of the simulated 562.5 ms `requestLatencyMs`) and starting the transfer
   roughly 185 ms earlier in observed terms. `index.html` is already the shell that
   declares the player, so a statically-known first frame belongs there; the manifest
   remains the source of truth and the build must derive the markup from it so the
   two cannot drift.
2. **Stop arming `preload='auto'` for audio before the audio context is unlocked.**
   In `src/scripts/audio.js:76-93`, use `preload='metadata'` (or `'none'`) while
   autoplay is still blocked, and promote to `'auto'` from the existing
   unlock/gesture path. This removes ~347 KB — ~88% of initial page weight — from the
   critical path on a cold load, on the reasoning that a track which cannot play
   until the user taps should not compete with the frame they are waiting for.

Together these should bring LCP well under budget without touching image encoding:
the payload is already 3.6 KB, and `uses-optimized-images`, `uses-responsive-images`,
`offscreen-images`, `total-byte-weight` and `server-response-time` all score 1.0.

**Alternatives** (if 1+2 prove insufficient, or if a smaller diff is preferred):

- **Inline the manifest** into the bundle or the HTML, eliminating one more
  serialized round trip. Larger blast radius: it couples content to the code bundle,
  disturbs the "one production manifest" contract at `main.js:8-37` and the `?story=`
  test override that 40+ browser specs depend on, and moves manifest validation off
  the network path. Do this last.
- **Reduce the audio tier at boot** without changing the unlock semantics — e.g. load
  only `scene-01` and defer `scene-02` / `frame-03` until navigation. Cheaper than 2,
  but leaves 116 KB on the critical path.
- **Raise the budget** to ~3 s. Not recommended as a *fix* — it contradicts SC-019 and
  `docs/delivery.md:94` — but it is a defensible *policy* option if the team decides
  the newly-binding profile is the wrong one, and should then be recorded as an
  explicit decision against the spec rather than a silent threshold bump.

**Files likely to change**:

- `index.html` — static first-frame `<picture>` markup and/or the `<link rel="preload">`.
- `scripts/build.mjs` — derive and inject the first-frame preload from the manifest; keeps HTML and manifest from drifting.
- `src/scripts/audio.js` — `createElements()` (`:76-93`) and `updatePreloadPolicy()` (`:115-126`): gate `preload` on the unlock state.
- `lighthouserc.json` — only if a threshold or profile change is deliberately adopted.

**Tests to add or update**:

- A unit test asserting the built `dist/index.html` contains a first-frame
  `<link rel="preload" as="image">` whose `imagesrcset` matches the first frame in the
  manifest — this locks the build/manifest coupling so the two cannot drift.
- Extend `tests/perf/first-frame.spec.js` to assert the first image request starts
  before `story.json` resolves, i.e. that the round-trip chain is actually gone, rather
  than relying on the wall-clock budget alone.
- Reconcile the two 2.5 s gates: bring `configureReferenceNetwork`
  (`first-frame.spec.js:11-16`) to the same latency/throughput/CPU profile Lighthouse
  uses, or document in `docs/delivery.md` why they are intentionally different.
  Leaving them silently divergent is how this class of bug recurs.
- Consider measuring paint rather than decode-complete in `measureVisibleFrame`
  (`first-frame.spec.js:24-26`) so the Playwright gate and the Lighthouse gate observe
  the same milestone.
- Investigate the `largest-contentful-paint-element` gatherer error — while it is
  failing, Lighthouse cannot name the LCP element and three related audits
  (`prioritize-lcp-image`, `lcp-lazy-loaded`, `render-blocking-resources`) return
  `score: null`, which materially weakens this audit's diagnostic value.

## Risks & Considerations

- **Preload/format mismatch**: a `rel="preload"` whose `imagesrcset` names a different
  tier than the `<picture>` will paint is discarded and re-fetched, causing a *double
  download*. Use `imagesrcset`/`imagesizes` and let the browser choose, and keep the
  AVIF→WebP→fallback ordering that `player.js:603-611` and `applyImageSources()` were
  explicitly built to preserve (T204).
- **Static/manifest drift**: if the HTML's first-frame markup is ever not the
  manifest's, the user sees the wrong frame until JS corrects it — a visible flash and
  a correctness regression, not just a perf one. The build must derive it from the
  manifest, never hand-maintain it.
- **Audio first-play latency**: reducing `preload` risks a stall if the user enables
  sound and presses play immediately. The unlock path must start the fetch at unlock
  time, early enough to cover the gesture-to-play gap.
- **Audio semantics**: `preload='metadata'` still issues a request; verify with
  `Network.emulateNetworkConditions` and the existing 40+ audio specs that no
  regression in `AudioManager`'s unlock/failure paths (`handleMediaFailure`,
  `handleMediaStall`) is introduced.
- **`capacities.shouldDegrade` / `saveData`**: light variants (`-light-*`) must still be
  honored by the preload path. A hardcoded standard-tier preload would defeat the
  light-variant convention that `src/scripts/light-variants.js` centralizes — note
  that `rel="preload"` in HTML cannot be conditioned on a runtime capability check, so
  the degradation story for the preloaded first frame needs an explicit decision.
- **Budgets vs. the spec**: any threshold change is a change to SC-019's enforcement and
  should be recorded as such.

## Open Questions

- [NEEDS CLARIFICATION: What element did Lighthouse actually score? The
  `largest-contentful-paint-element` audit errored out, so the frame image as LCP is
  inferred from the network record and the 1.1 s FCP → 2.87 s LCP gap, not observed.
  This should be confirmed before committing to a fix shape.]
- [NEEDS CLARIFICATION: Should the Playwright SC-019 gate and the Lighthouse LCP
  assertion both exist at 2.5 s? They currently encode the same target under profiles
  that differ by 6.2× in bandwidth and 4× in CPU, and one of them will keep passing for
  the wrong reasons.]
- [NEEDS CLARIFICATION: Is `measureVisibleFrame`'s decode-complete milestone an
  acceptable proxy for "first frame visible"? `docs/delivery.md:94` says the frame
  *appears*; the test only proves it decoded.]
- [NEEDS CLARIFICATION: How much of the 0.37 s overshoot is the round-trip chain versus
  the 347 KB of audio contention? Isolating it requires a phase-level LCP breakdown
  (`lcp-breakdown-insight`), which is unavailable while the TraceElements gatherer is
  erroring. An A/B with the audio prefetch disabled would quantify it.]
- [NEEDS CLARIFICATION: Should the 2500 ms budget stand? Evidence says the app misses
  its own documented SC-019 target, so relaxing it looks like moving a goalpost — but
  the mobile profile is newly binding, which makes it a real policy decision rather than
  a purely technical one.]
