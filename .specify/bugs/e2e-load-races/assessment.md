# Bug Assessment: Four residual e2e failures after the media-range fix

- **Slug**: e2e-load-races
- **Created**: 2026-09-28
- **Source**: pasted text (CI `gate` output on `dev` @ `8bf0da3`, run 36412924292)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

After #12 (Range-capable e2e server) and #13 (two load-race fixes), the gate clears
10 of 11 steps and the matrix reports **4 failed / 834 passed / 2 flaky**:

```
[desktop-chromium]        › tests/e2e/zz-autoplay-real.spec.js:82
[desktop-webkit]          › tests/e2e/zz-autoplay-real.spec.js:82
[mobile-webkit]           › tests/e2e/zz-autoplay-real.spec.js:82
[desktop-firefox]         › tests/e2e/pause.spec.js:17
[desktop-firefox]         › tests/e2e/zz-audio-double-toggle.spec.js:36
[desktop-firefox]         › tests/e2e/audio-timing.spec.js:72
```

The report's own hypothesis was that the two firefox playback failures share one
cause (no audio device) and that `audio-timing.spec.js:72` is a regression from
#12. **Both were checked. The first is half right; the second is not supported.**

## Symptom

Four assertions fail, in three unrelated groups. The accessibility control reports
the wrong state when autoplay is blocked, and three playback-timing assertions do
not reach the state they expect on firefox.

## Reproduction

1. `git checkout dev` (`8bf0da3`)
2. `npx playwright install --with-deps chromium firefox webkit`
3. `npx playwright test tests/e2e/zz-autoplay-real.spec.js tests/e2e/pause.spec.js tests/e2e/zz-audio-double-toggle.spec.js tests/e2e/audio-timing.spec.js`
4. Observe: `zz-autoplay-real:82` on chromium + both webkits; the other three on firefox

The webkit half cannot be reproduced on the Fedora host (`AGENTS.md` → *Environment
Gotchas*); firefox reproduces locally.

## Suspected Code Paths

### Group 1 — `zz-autoplay-real.spec.js:82` (3 engines) — **product defect**

- `src/scripts/audio.js:757` — `toggle.setAttribute('aria-pressed', String(this.enabled))`.
  The attribute is derived from the **preference**, not from `state()`.
- `src/scripts/audio.js:743-748` — `state()` returns `'blocked'` when
  `sessionBlocked || awaitingUnlock`, so `data-audio-state` is correct while
  `aria-pressed` is not. The two disagree.
- `tests/e2e/zz-autoplay-real.spec.js:120` — `expect(observed.overlayVisible).toBe(observed.blocked)`.
  **This passes**, so the overlay *is* up. Then `:125-126` assert
  `audioState === 'blocked'` and `ariaPressed === 'false'`, and `ariaPressed` is `'true'`.
- `tests/e2e/zz-autoplay-real.spec.js:133` — the T198 invariant
  `pausedWithGain` is empty, so no element is stranded.

The test is right and the product is wrong: the overlay is displayed, the state
attribute says `blocked`, and the control still advertises itself as pressed.

### Group 2 — firefox playback does not start (`pause.spec.js:17`, `zz-audio-double-toggle:36`)

- `tests/e2e/pause.spec.js:59` — `expect.poll(currentTime).toBeGreaterThan(pausedPosition + 0.005)`;
  CI reports `Expected: > 0.045, Received: 0.04`, i.e. the position never moves.
- `tests/e2e/zz-audio-double-toggle.spec.js:57` — `expect(result.paused).toBe(false)`;
  CI reports `Expected: false, Received: true`.
- Both require the media element to actually reach a playing state. Both previously
  logged `OnMediaSinkAudioError` in CI, and firefox has been the only engine failing
  them since before #12.
- `src/scripts/audio.js:692-717` — the `error`/`stalled` handlers. A sink failure raises
  `error` → `handleMediaFailure` → `failed.add(key)` (`:709`), a **one-way latch with no
  `delete`/`clear` anywhere**, after which `playCurrentScene` returns early at `:315`.

Chromium and WebKit degrade silently when there is no audio device; Firefox's cubeb
sink fails outright. GitHub-hosted `ubuntu-latest` runners have no audio device.

### Group 3 — `audio-timing.spec.js:72` (firefox) — **not the same cause as group 2**

- `tests/e2e/audio-timing.spec.js:97` — `expect(stopped.volume).toBe(0)`; CI reports
  `Expected: 0, Received: 0.108`.
- `tests/e2e/audio-timing.spec.js:3-21` — `openWithClock` stubs `play()` to resolve and
  replaces `currentTime` with a fake, and replaces `performance.now` /
  `requestAnimationFrame` with a manual queue. **This test performs no real playback at
  all**, so an audio device is irrelevant here.
- `src/scripts/audio.js:490-506` — `setPaused(true)` sets `element.volume = 0` directly,
  with no ramp. So a final volume of 0.108 cannot come from the pause itself.
- `src/scripts/audio.js:605-634` — `fadeIn` writes `element.volume = target * progress`.
  0.108 is consistent with a `fadeIn` tick driven forward by the test's manual
  `requestAnimationFrame` drain *after* the pause, rather than a `fadeOut`.
- `src/scripts/audio.js:27-30` — `fadeProgress` is `clamp(elapsed / duration, 0, 1)`, so a
  `fadeOut` reaching its duration would land exactly on 0.

The `isFadeCurrent` generation guard at `:250-252` is what should stop that stale tick.
The guard appears not to be holding on firefox; why is not yet established.

### Rejected: "the #12 regression"

`audio-timing.spec.js:72` also failed on `desktop-chromium` in the run immediately
after #12, and that chromium failure disappeared once #13 landed. With 2 flaky
reported in the latest run and the failing set rotating between runs, the evidence
does not support treating it as a regression introduced by #12.

## Root Cause Hypothesis

**Three independent causes, not one.**

1. `aria-pressed` is wired to the user preference instead of the effective state, so
   any blocked state advertises the control as pressed. This is a real accessibility
   defect against FR-014, and it is engine-independent — the T199 test fails wherever
   autoplay is actually blocked. **Confidence: high.** The evidence is direct: the
   overlay is up, the state attribute is `blocked`, the pressed attribute is not.
2. Firefox's audio sink fails on a runner with no audio device; the resulting `error`
   event latches the track through a handler that has no recovery path. **Confidence:
   medium** — the `OnMediaSinkAudioError` string was captured, but not on the current
   run, so it is inferred from history plus the "only firefox, only playback-dependent
   tests" pattern.
3. A stale `fadeIn` ramp is being driven by the test's manual rAF drain after the
   pause, so the element ends at 0.108 instead of 0. **Confidence: low** — the
   arithmetic fits, but the generation guard that should prevent it has not been
   traced on the failing engine.

## Proposed Remediation

**Preferred, for group 1 — derive `aria-pressed` from the effective state.**
`src/scripts/audio.js:757` should use the same `state()` the `data-audio-state`
attribute already uses, so the two cannot disagree. A blocked state must render the
control as not-pressed. This is a small, local change and it makes the control
honest for a screen-reader user, which is the whole point of FR-014.

**Preferred, for group 2 — decide whether the latch should be recoverable.** A single
`error` event permanently disabling a track is a product decision, not a test one.
Either the sink failure is recognised and treated as transient, or the runner is given
a working (or null) audio backend so firefox behaves like the other two engines. These
are different decisions with different owners; the report does not presume which.

**Preferred, for group 3 — make the clock-driven test drain only the callbacks it owns.**
Before driving frames, clear any pending rAF queue left by a ramp the test is about to
invalidate, so the assertion measures the pause and not a leftover ramp. The
alternative is to strengthen the generation guard, which is a product change and needs
its own evidence.

**Alternatives:**
- *Skip the playback-dependent tests on firefox* — hides a real accessibility-relevant
  divergence and the repo already argues against widening skips
  (`tests/perf/zz-ci-budgets.spec.js:107` asserts the fps gate must not skip).
- *Give the runner a null audio backend* for firefox — a CI configuration change; it
  would mask the sink error rather than fix the product's reaction to it.

**Files likely to change**:
- `src/scripts/audio.js` — `:757` for group 1; `:707-717` only if group 2 is decided
  to be a product fix
- `tests/e2e/audio-timing.spec.js` — `:72` for group 3
- `.github/workflows/ci.yml` — only if group 2 is decided to be a CI configuration fix

**Tests to add or update**:
- An assertion that `aria-pressed` and `data-audio-state` never disagree, so the two
  representations cannot drift again
- A test that a media `error` event does not permanently disable a track, if group 2 is
  taken as a product fix

## Risks & Considerations

- Group 1 changes accessibility output. Any consumer relying on `aria-pressed` meaning
  "the user turned audio on" would see it change to mean "audio is currently audible".
  That is the correct reading for a toggle button, but it is a semantic shift worth
  stating in the commit.
- Group 2 is unresolved as a *decision*, not just a patch. Treating a sink error as
  transient would also treat a genuinely missing file as transient, so the two must
  stay distinguishable.
- Group 3's preferred fix touches the test only. If the generation guard is genuinely
  broken, a test-only fix hides a product defect — the diagnostic must settle that
  first.
- Do not use retries as a remedy for any of the three. A deterministic failure on
  multiple engines is a signal, not flake.

## Open Questions

- [NEEDS CLARIFICATION: should a media `error` that is an audio-sink failure be treated
  as transient (recoverable) or as a genuine track failure? This is a product decision
  about how much resilience the player promises when the output device disappears
  mid-story.]
- [NEEDS CLARIFICATION: is the `aria-pressed` contract "user preference" or "currently
  audible"? The spec requires the control to reflect the state (FR-014), which implies
  the latter, but the current implementation chose the former.]
- [NEEDS CLARIFICATION: should the e2e suite depend on a real audio device at all? If
  not, the runner should get a null backend and the sink error stops being a variable
  rather than something each assertion has to tolerate.]
- The stale `fadeIn` in group 3 has not been reproduced locally. It needs the same
  treat-and-observe diagnostic that found the range defect, before any fix is chosen.

## Related Reports

- `../media-masters-unreproducible/` — the master-source defect fixed in PR #11
- On the `fix/e2e-load-races` branch (not merged): `e2e-audio-timing-flakes/` and
  `audio-track-latch-on-transient-refusal/`, the first of which records the
  investigation that led to #12. That branch's `Root Cause Hypothesis` is superseded by
  the range finding documented there.
