# Bug Assessment: 347 KB of unplayable audio is fetched on the critical path, and `preload` cannot stop it

- **Slug**: audio-preload-critical-path
- **Created**: 2026-09-29T08:52:49-04:00
- **Source**: follow-up raised by `./lighthouse-lcp-over-budget/test.md` and `./lighthouse-lcp-over-budget/fix.md`
  (Deviations §1)
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

The `lighthouse-lcp-over-budget` assessment attributed part of the 2.87 s LCP to three AAC tracks
totalling 347 KB (≈88% of the 384 KiB initial page weight) being fetched at `preload='auto'` from
the `AudioManager` constructor, before any `play()` had been attempted. Its proposed remedy was
to withhold `preload='auto'` until playback is granted.

That remedy was implemented, measured and **reverted**. Verbatim from `fix.md`, Deviations §1:

> `metadata` and `auto` transfer exactly the same 346,452 bytes. `preload` is advisory, and for
> these AAC files Chromium downloads the whole resource either way. The 347 KB was never gated by
> `preload`, so changing it gates nothing.

## Symptom

On a cold load, three audio tracks — `scene-01.aac`, `scene-02.aac`, `frame-03.aac`, 115,843 B
each — are downloaded in full even when the session can never play them, because playback is
blocked until a user gesture and no lever in `preload` prevents the fetch. Expected: a blocked or
silent session pays no bytes for audio. Observed: all three transferred, in full, before the
overlay is even resolved.

## Reproduction

1. Load the app with a cold cache under any network profile.
2. Force the blocked-autoplay path (stub `HTMLMediaElement.prototype.play` to reject with
   `NotAllowedError`, as `tests/e2e/autoplay.spec.js:6` does).
3. Read `performance.getEntriesByType('resource')` filtered on `/assets/audio/`, and compare
   `encodedBodySize` against `preload`.

Measured, blocked session with `preload='metadata'`:

```json
{ "preload": "metadata", "scene-01.aac": 115484, "scene-02.aac": 115484, "frame-03.aac": 115484, "totalEncoded": 346452 }
```

Identical byte counts under `preload='auto'`. Confirmed independently from the Lighthouse side:
`total-byte-weight` was **384 KiB both before and after** the preload change.

## Suspected Code Paths

- `src/scripts/audio.js:76-93` — `createElements()` iterates every scene and frame and calls
  `new Audio(source)` with a `preload` value chosen by the current-or-next-scene policy. With
  `currentSceneIndex ?? 0`, that is `scene-01.aac` (scene 0), `scene-02.aac` (scene 1) and
  `frame-03.aac` (scene 1) — all three created at construction, which runs from
  `AudioManager`'s constructor before the player renders.
- `src/scripts/audio.js:95-108` — `createElement()`: `new Audio(source)` with the `src` already
  set is itself the trigger; `preload` only adjusts how far the fetch proceeds afterwards.
- `src/scripts/audio.js:115-126` — `updatePreloadPolicy()` recomputes the same values on every
  scene change.
- `src/scripts/audio.js:427-444` — `unlockPrecreatedElements()` plays every pre-created element to
  prove the autoplay grant, which is why the elements must already exist.
- `src/data/story.json` — `scenes[0].audio.src`, `scenes[1].audio.src`, `scenes[1].frames[0].audio.src`
  (frame-03). Each renders to a 115,843 B `.aac` under the delivery budget in `budget.json`.

## Root Cause Hypothesis

The bytes are not gated by `preload` at all but by **element construction with `src` already
assigned**. `new Audio(src)` causes the media stack to begin fetching immediately; `preload` is a
downstream hint about how much to buffer, and for a small progressive AAC Chromium takes the whole
file either way. Making the tracks invisible to `preload` cannot work because the only thing
`preload` controls is a fetch that has already begun. Confidence: **high** for "not a `preload`
problem" (measured directly, two independent ways) and **medium** for the replacement remedy, which
has not been prototyped.

## Proposed Remediation

**Preferred**: stop giving the media stack a `src` until playback is actually possible — construct
the `<audio>` elements without a source, or defer their creation until the session is unlocked.
`unlockPrecreatedElements()` (`audio.js:427-444`) would need to assign `src` at unlock time and
then run its existing play-probe, so the Safari per-element unlock decision (T199) is preserved
rather than skipped. This makes the blocked path genuinely free instead of merely honest about its
intent.

**Alternatives** (trade-offs):
- **Reduce the tier at boot** — keep only the current scene's track, defer scene-02 and frame-03
  until navigation. Cheaper and much smaller blast radius, but still fetches ~116 KB the blocked
  reader cannot hear.
- **Shorten the tracks.** `scene-*.aac` at 115,843 B is a per-scene bed; if the budget in
  `budget.json` permits, a lower bitrate or a shorter fade would shrink the constant cost for every
  session rather than only the blocked one. Requires an audio decision, not a code one.
- **Accept it.** The 792 ms of LCP headroom from `lighthouse-lcp-over-budget` absorbs it today.
  Recorded here so the choice is explicit rather than accidental, and so a future regression that
  consumes the headroom points here.

**Files likely to change**:
- `src/scripts/audio.js` — `createElements()` (`:76-93`), `createElement()` (`:95-108`),
  `unlockPrecreatedElements()` (`:427-444`), and possibly `updatePreloadPolicy()` (`:115-126`).
- `tests/e2e/` — the ~40 audio specs that observe element state will need rechecking, especially
  `tests/e2e/zz-autoplay-real.spec.js`, `tests/e2e/audio-gesture-convergence.spec.js` and
  `tests/e2e/zz-silent-persist.spec.js`.
- `budget.json` — only under the audio-tier alternative.

**Tests to add or update**:
- A byte-level assertion, not a request-count one: on a blocked session, total
  `encodedBodySize` across `/assets/audio/` must be materially below the 346,452 B measured today.
  The existing assertion style (`expect(audioRequests).toEqual([])`) is not sufficient — Chromium
  issues the request and downloads the body regardless of `preload`, which is exactly why the first
  attempt at this fix measured as a no-op.
- The promotion contract itself, if the remedy introduces one: tracks must reach `'auto'` only
  after a granted `play()`.

## Risks & Considerations

- **Highest risk of this bug is regressing audio**, not the reverse. The unlock path depends on
  per-element `play()` resolution (T199) and on `handleMediaFailure` / `handleMediaStall` latching a
  broken track for the session. Deferring `src` touches exactly that path.
- **First-play latency**: assigning `src` at unlock defers buffering to the moment it is needed. If
  the unlock gesture is immediately followed by an expectation of sound, the first track may start
  late. The null audio sink in CI cannot hear this, so it needs a deliberate check rather than
  inference from green tests.
- **The light-variant convention must survive**: any deferral must keep honoring
  `capabilities.shouldDegrade` via `lightAudioSource()`, which `createElement()` currently applies
  at construction.
- This did **not** cause the LCP gate failure and does not block merging
  `lighthouse-lcp-over-budget`.

## Open Questions

- [NEEDS CLARIFICATION: How much of the LCP does this actually cost? The 1.44 Mbit/s simulated
  profile puts ~1.9 s of transfer time for 347 KB on the wire, but contention with the LCP image
  was never isolated — the preload experiment conflated "can we stop the bytes" with "do the bytes
  delay LCP", and only answered the first. An A/B that simply omits the audio from the manifest
  would measure the second directly.]
- [NEEDS CLARIFICATION: Does Safari honour `preload` more strictly than Chromium here? Only
  Chromium was measured; the new perf/e2e tests ran on Chromium and Firefox, and WebKit cannot run
  on this Fedora host per `AGENTS.md`. The "not a `preload` problem" conclusion is therefore
  single-engine, and the replacement remedy should not assume the same behaviour elsewhere.]
