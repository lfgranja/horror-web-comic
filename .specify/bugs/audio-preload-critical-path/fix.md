# Bug Fix: 347 KB of unplayable audio is no longer fetched on the critical path

- **Slug**: audio-preload-critical-path
- **Fixed**: 2026-09-30
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`<audio>` elements are now built without a source. The resolved URL is parked on
`data-track-source` and handed to the media stack by `assignSource()` at the single
place playback is actually attempted, so a session that can never play a track never
downloads it. Measured on the production story, a blocked session transfers
**115,484 B instead of 346,452 B** (−66.7 %), and every one of those 230,968 bytes
were tracks the reader could not hear. A granted session transfers the identical
346,452 B as before.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/scripts/audio.js` | modified | `createElement()` builds `new Audio()` and parks the light-variant-resolved URL on `dataset.trackSource`; new `assignSource()` and `warmDeferredTracks()`; `requestPlay()` arms immediately before `play()` and warms the deferred tracks once a play is granted |
| `tests/e2e/zz-audio-deferred-bytes.spec.js` | added | 4 tests pinning the byte-level contract, the per-element arming state and the granted-session no-regression |
| `tests/e2e/degradation-production.spec.js` | modified | reads `element.dataset.trackSource` instead of `element.src` |
| `tests/e2e/zz-degraded-coverage.spec.js` | modified | same, in both audio-policy readers |

## Diff Highlights

```js
// audio.js — createElement(): the fetch trigger itself is gone
const element = new Audio();
element.dataset.trackSource = source;   // observable, arms nothing
```

```js
// audio.js — requestPlay(): the single funnel for every play() call
this.assignSource(element);            // before play(), never after
try { result = element.play(); } catch (error) { … }
```

```js
// audio.js — warmDeferredTracks(): once a play() is granted, re-apply the policy
if (this.playbackGranted || this.destroyed) return;
this.playbackGranted = true;
for (const element of this.allElements()) {
  if (element.preload === 'none') continue;
  this.assignSource(element);
}
```

## Tests Added or Updated

- `zz-audio-deferred-bytes.spec.js` — *a blocked session pays for at most the track it
  is looking at*: asserts total `encodedBodySize` across `/assets/audio/` is below
  240,000 B and that `scene-02.aac`/`frame-03.aac` are absent. A byte assertion, not a
  request count, because the request count could not have caught the original bug.
- `zz-audio-deferred-bytes.spec.js` — *no off-screen element is armed while the session
  is blocked*: pins the mechanism (element state) rather than only its consequence, so a
  future refactor cannot reintroduce construction-time arming and pass by luck.
- `zz-audio-deferred-bytes.spec.js` — *a granted session still fetches the next scene
  before the reader reaches it*: asserts all three tracks are armed and fetched. The
  no-regression guard; fails loudly if the deferral is ever "optimised" away.
- `zz-audio-deferred-bytes.spec.js` — *a silent continuation arms nothing that was not
  already on screen*.
- `degradation-production.spec.js:77` / `zz-degraded-coverage.spec.js:247,388` — read
  the parked source. `element.src` is now `''` until a play is attempted, so it can no
  longer tell "light variant" apart from "not armed yet" (FR-031, FR-015).

## Local Verification

- `npx playwright test tests/e2e/zz-audio-deferred-bytes.spec.js --project=desktop-chromium`
  → **4 passed**.
- Teeth check — same spec with `src/scripts/audio.js` reverted: **3 failed / 1 passed**.
  The 3 that fail are the blocked-path tests; the 1 that passes is the granted-session
  no-regression guard, which is supposed to hold before and after.
- Byte measurement, blocked vs granted (Chromium, production story, `encodedBodySize`):
  blocked `{scene-01.aac=115484}` = **115,484 B**; granted `{scene-01, scene-02,
  frame-03}` = **346,452 B** — identical to the pre-fix number.
- `npm run test:unit` → **133 passed, 0 failed**.
- `npm run build` → **complete**: 13,279 compressed script bytes, 3,192 style, raw assets
  `initial=187355 maxFrame=160252 total=1515886`; manifest valid, all budgets held.
- `npx playwright test tests/perf --project=desktop-chromium --project=desktop-firefox --workers=1`
  → **19 passed, 5 skipped** (SC-018 `app frames 0` on both engines).
- Full audio e2e (15 audio specs × mobile-chromium / desktop-chromium / desktop-firefox)
  → **203 passed, 9 failed**; all 9 are wall-clock timing assertions and fail identically
  with `src/scripts/audio.js` reverted (**11 failed / 25 passed** on the same subset, same
  tests). Re-run with `--workers=1`: **36/36 passed**. Parallel-load flakes on this host,
  tracked separately as `e2e-audio-timing-flakes`.
- Full e2e on desktop-chromium → **222 passed, 13 failed**; the 13 are dwell/timing and
  legacy-nav specs. `zz-legacy-pause.spec.js:94 "mute stops audio within 100ms"`
  (312 ms vs a 150 ms budget) fails identically pre-fix — pre-existing, not a regression.
- `npm run preflight` → **14 of 15 pass**. The single failure is the `browser-launch`
  check for WebKit (`libicudata.so.74`, ICU 74 vs Fedora 44's ICU 77) — the condition
  `AGENTS.md` documents as expected on this host and CI-enforced on `ubuntu-latest`. This
  change is consequently **not** exercised on WebKit locally.

Manual checks: none beyond the above; no real-device or audible verification was possible
here, which is why "First-play latency" below is stated as a known, unmeasured risk.

## Deviations from Assessment

Three, all expansions inside `src/scripts/audio.js`. The assessment's own Risks section
flagged the first two, and the third is required to keep the fix from being a regression.

1. **`warmDeferredTracks()` was added and is not in the assessment.** The assessment
   listed "Shorten the tracks / Accept it" as alternatives but did not spell out the
   consequence of the preferred remedy: without a warm-up, a *granted* session stops
   prefetching the next scene's track at boot, so navigating to the next scene pays for
   its first frame of audio. That trades a majority-path latency regression for a
   minority-path byte win. `warmDeferredTracks()` re-applies the existing `preload`
   policy after the first granted `play()` — and only then — so a granted session
   transfers exactly the 346,452 B it did before (verified) while a blocked session
   transfers 115,484 B. `preload === 'none'` is still honoured, so FR-015 on a degraded
   connection is unaffected.
2. **The blocked session still fetches one track (115,484 B), not zero.** The boot-time
   `play()` is the only evidence available that autoplay was blocked, and that probe
   needs a real track: `play()` on a source-less element rejects `NotSupportedError`,
   which `handlePlayFailure()` would latch as a broken file. So the scene bed the reader
   is *looking at* is armed. That is the floor for this design. Reaching 0 B would
   require either serialising the scene bed and the frame layer (the frame stinger would
   land a few hundred ms late — the assessment's own first-play-latency risk) or a
   synthetic network-free probe element (a new mechanism, out of scope). Recorded as a
   follow-up rather than taken.
3. **`preload` is now inert until a source is assigned, but its values are unchanged.**
   `createElement()`/`updatePreloadPolicy()` still compute and set the same
   `auto`/`metadata`/`none` policy, so the FR-015 contract and the ~40 specs that assert
   it are untouched; the browser now applies it at the moment the source is handed over
   rather than at construction. `updatePreloadPolicy()` needed no change.

Also noted, not a deviation from the remedy but a fact the assessment did not have: a
session that chooses "continuar sem som" now arms nothing at all, which was worth 347 KB
on that path too.

## Follow-ups

- **Unanswered `[NEEDS CLARIFICATION]` #1 — how much LCP did those bytes actually cost?**
  Not measured here. What is now measurable cheaply: the blocked cold load carries
  230,968 B less. To answer the original question, run the A/B the assessment describes —
  a throttled LCP measurement with the audio tracks removed from the manifest entirely —
  before and after this fix. The `lighthouse-lcp-over-budget` headroom this was raised
  against has not been re-measured.
- **Unanswered `[NEEDS CLARIFICATION]` #2 — does WebKit honour `preload` more strictly
  than Chromium?** Still open, and now moot for *this* fix: no track has a source at
  construction, so there is no fetch for `preload` to fail to gate on any engine. The
  claim that must be verified on a real device instead is the *first-play latency* risk:
  assigning the source at unlock defers buffering to the moment it is needed, and a null
  audio sink in CI cannot hear a late start. Needs a manual check on a real browser.
- Run the WebKit projects and the macOS `test:perf:webkit` job in CI — this change is
  untested on WebKit locally (ICU mismatch, see Verification).
- `e2e-audio-timing-flakes` covers the parallel-load audio timing failures observed here;
  nothing was added to it by this fix.
- `git status` shows unrelated untracked files from previous bug work
  (`.specify/bugs/lcp-render-delay/`, `.specify/bugs/lighthouse-lcp-element-audit/`);
  they were left alone.
