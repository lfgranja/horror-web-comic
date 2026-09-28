# Bug Fix: Four e2e failures on the dev gate

- **Slug**: e2e-audio-timing-flakes
- **Fixed**: 2026-09-27
- **Assessment**: ./assessment.md
- **Status**: partial — one of the two causes is fixed, the other is a product defect and is NOT fixed here

## CI diagnostic that changed the diagnosis (second pass)

A probe replicating `pause.spec.js:17` was run **in CI** (the host's engines resume
correctly and cannot reproduce it). Result, after `openPlayer` and before the test's own
resume:

| | `failed` set | `play()` outcomes | scene after resume | `currentTime` |
|---|---|---|---|---|
| chromium | `[]` | 1× `NotAllowedError`, then 3× resolved | not paused, vol 0.36 | advances 0.19 → 3.03 |
| webkit | **`['scene-0']`** | 1× `NotAllowedError`, then 2× resolved | **paused**, vol 0 | **stuck at 0.04** |
| firefox | **`['scene-0']`** | 1× resolved | **paused**, vol 0 | **stuck at 0.04** |

`enabled`, `awaitingUnlock`, `sessionBlocked` and `silentContinuation` are all healthy
in every engine. The **only** difference is that on webkit and firefox the scene track
is already inside `AudioManager.failed` before the test resumes — and that set has no
`delete` and no `clear` anywhere, so the track can never be restarted again.

**The cause of `pause.spec.js:17` is the path-(b) one-way latch, i.e. the product defect
reported separately in `../audio-track-latch-on-transient-refusal/`.** It is not
autoplay policy, and not a test race. On firefox the only recorded `play()` *resolved*,
yet the track was already latched — so a refusal with a name other than
`NotAllowedError` is reaching `handlePlayFailure` and permanently killing the track
exactly as that report predicted.

This falsifies the premise of decision P1 ("scope this fix to the tests; the latch is a
separate, latent defect"). The latch is not latent and not unrelated: it is the cause of
three of the four gate failures. `freezeAdvance` was aimed at a frame-advance race that
does not exist on these engines, which is why `pause.spec.js:17` still fails.

## Summary

The P2 diagnostic **refuted the assessment's root cause A**. Autoplay was never
involved: on Firefox every `play()` call *resolved*, there was no permission
refusal, the `failed` latch was empty, and `duration` was a valid number. The real
causes are two load-sensitive races — a 250 ms observation window and a frame-advance
race — which fail on every engine and even on a test that stubs `play()`. This fix
removes both races from the test process rather than retrying them, per the
`spec.md` → *Session 2026-09-27* decisions P1 (tests only) and P4 (record, don't race).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/e2e/helpers.js` | modified | added `freezeAdvance()` and `installAutoStartObserver()` as shared helpers |
| `tests/e2e/pause.spec.js:17` | modified | `freezeAdvance()` before the 1 100 ms wait |
| `tests/e2e/focus-loss.spec.js:11` | modified | `waitForFunction(autoStartTimer > 0)` → in-page recorder read after the fact |
| `tests/e2e/zz-audio-double-toggle.spec.js` | modified | local `freezeAdvance` removed in favour of the shared helper (no behaviour change) |

## Diff Highlights

The auto-start race, before and after:

```js
// before — polls a ~250 ms window from the test process
await page.waitForFunction(() => globalThis.__cinematicPlayer?.autoStartTimer > 0);

// after — samples from inside the page, installed before any page script runs
await installAutoStartObserver(page);
await page.goto('/?story=tests/fixtures/story.json', { waitUntil: 'commit' });
await page.waitForFunction(() => Boolean(globalThis.__cinematicPlayer));
expect(await page.evaluate(() => window.__autoStartObservedMax)).toBeGreaterThan(0);
```

## Tests Added or Updated

- `tests/e2e/focus-loss.spec.js::startup focus loss clears auto-start…` — the assertion
  still proves the timer *was* armed, but no longer depends on the test process
  winning a 250 ms race
- `tests/e2e/pause.spec.js::pauses within 100 ms and preserves the scene position` —
  pins frame dwell so the wait cannot cross a boundary. **This did not fix the failure**
  in CI: the test still fails on webkit and firefox because the underlying cause is the
  `failed` latch, not a frame race. The `freezeAdvance` call is retained because the
  frame-advance race it removes is real and observable, but it is not what was breaking
  this assertion.
- No production code touched, per decision P1 — a decision whose premise the CI
  diagnostic then falsified

## Local Verification

- `node --check` on all four modified test files → **PASS**
- `npm run test:unit` → **PASS**, 119/119 (no browser required)
- Diagnostic probe (`tests/e2e/zz-diagnostic-probe.spec.js`, temporary) run on
  `desktop-firefox` → full evidence below; probe deleted afterwards
- **End-to-end NOT verified locally.** This host cannot run the matrix reliably: load
  average reached 50 on 8 cores from the agent/IDE processes themselves (multiple
  `opencode`, `rust-analyzer`, `cargo-clippy`), producing 1.1–2.8 min test durations
  against a 30 s timeout, and failures on `zz-audio-double-toggle.spec.js:61` — a test
  with no timing or audio dependency. CI is the only meaningful signal for e2e here.

### Diagnostic result (the reason this fix differs from the assessment)

Recorded on `desktop-firefox`, replicating the `pause.spec.js` flow exactly:

| Probe | Value | Verdict |
|---|---|---|
| `play()` outcomes | 5 calls, **all `resolved`**, zero rejections | **autoplay refuted** |
| `awaitingUnlock` / `sessionBlocked` | `false` / `false` | no block ever occurred |
| `failedTracks` (the path-b latch) | `[]` | never latched |
| `sceneDuration` / `computedIsNaN` | `8` / `false` | path (c) not triggered |
| `currentTimeAdvanced` after resume | `true` | the flow works |

The same flow then failed on **chromium** under load, including `pause.spec.js:4`
which stubs `play()` and has no audio dependency at all. In isolation it passed every
time. The CI pattern (webkit + firefox failing, chromium passing) was therefore a
scheduling artifact, not an engine difference.

## Deviations from Assessment

**The proposed remediation was wrong and was not applied.** The assessment recommended
a trusted user gesture to unlock autoplay, premised on un-gestured `play()` being
refused on Firefox/WebKit. The diagnostic disproved that premise. Applying the gesture
would have treated a symptom that was never present, while leaving both real races
untouched. Two further assessment corrections, already applied to `assessment.md`:
`resume.spec.js` was a false positive, and `zz-audio-double-toggle.spec.js:92` is in
scope rather than latent.

**What the assessment got right, and is retained:** do not `test.skip` the affected
engines and do not stub `play()`. A resolve-stub would make
`zz-audio-double-toggle.spec.js:43` *fail* outright, and T199's original defect was
structurally invisible to resolve-stubs. No such change was made.

## Follow-ups

- **Verify in CI.** The e2e fix is unverified; open a PR and read the matrix result.
- **Decide whether the local box can run the matrix at all.** If not, that is a
  standing constraint, and the `AGENTS.md` local-bar note should say so.
- **The suite is load-sensitive by design.** Many specs wait a fixed wall-clock time
  and then assert. This fix removes two such races; a sweep for the pattern across the
  other 45 spec files is not done.
- The path-(b) latch is a real latent defect and is **not** fixed here, per decision
  P1. It now has a normative requirement in `spec.md` FR-016 saying what it should do;
  see the separate bug report.
