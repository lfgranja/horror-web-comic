# Bug Verification: Eight recovered assertions fail, and all eight are defects in the tests

- **Slug**: deferred-behavior-coverage
- **Tested**: 2026-09-29T16:20:00-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The four contract and payload defects no longer reproduce — verified across three consecutive runs —
and nothing regressed: 130/130 unit, 19/19 on the existing specs that use the rewritten helper, and
both new regression specs pass. But the fix report makes one claim I could not reproduce, and two of
the eight remain undecided for the same reason the fix said they would. The verdict is `partial`
because the fix is `partial`, and specifically because a load-bearing claim in it is not borne out.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx playwright test tests/e2e/zz-legacy-{pause,playback,speed-volume,end-state}.spec.js --project=desktop-chromium --workers=1` | **partial** | 13 passed / 4 failed. The 4 contract defects are gone; the 2 audio and 2 timing ones remain, as the fix predicted. |
| Contract fixes, repeated | same, `-g` on the 4 fixed tests × 3 | **pass** | 4 passed in every run. One transient failure in a 4th run, not reproducible. |
| New / updated tests | `zz-navigacao-pausa.spec.js`, `zz-resume-final-frame.spec.js` | **pass** | 2/2. |
| New / updated unit | `npm run test:unit` | **pass** | 130/130, including the new schema-stamp test. |
| Regression suite | `npx playwright test tests/e2e/{navigation,resume,playback,end-state,speed-volume,audio,pause,zz-timing-dwell}.spec.js --workers=1` | **pass** | 19/19. The helper was rewritten; these are its heaviest consumers. |
| Dwell measurement, verified independently | ad-hoc probe of `measureDwellMs` against `EFFECTIVE_DURATION_MS` | **partial** | f-002: 2519 ms vs 2500 (0.8%) — confirms the fix. **f-001: 1254 ms vs 1000 (25.4%) — does not.** |
| Audio latency, root-caused | `zz-legacy-pause.spec.js:94` with and without the `play()` stub | **fail (unfixable locally)** | Fails either way: 216 ms vs a 150 ms budget. The instrument, not the stub, is the problem — see Residual Risks. |
| Lint / type-check | — | **not-run** | No `lint`, `typecheck` or `tsc` script exists in `package.json`; the project is plain ES modules with no type-check step. |

## Output Excerpts

Reproduction after the fix — the four contract defects are gone:

```
13 passed
  4 failed
    zz-legacy-pause.spec.js:62 › pause stops scene audio; resume continues without restarting frame
    zz-legacy-pause.spec.js:94 › mute stops audio within 100ms
    zz-legacy-playback.spec.js:36 › default/story rhythm frame dwell is within ±10% of effective duration
    zz-legacy-speed-volume.spec.js:37 › speed 2x persists and halves dwell with 250ms floor
```

Independent dwell measurement, against the fix report's own numbers:

```
DWELL f-001: medido=1254 autorado=1000 desvio=25.4%     <-- fix claimed 1256 -> 1000
DWELL f-002: medido=2519 autorado=2500 desvio= 0.8%     <-- fix claimed 2203 -> 2534 (1.4%)
```

The audio latency test, re-run without the stub the fix added:

```
Error: expect(received).toBeLessThanOrEqual(expected)
Expected: <= 150
Received:    216
```

Regression sample on the rewritten helper — 19/19:

```
[19/19] zz-timing-dwell.spec.js:47 › dwell floor of 250 ms applies whenever duration divided by speed is smaller
19 passed (1.0m)
```

## Residual Risks

- **The fix's first-frame correction does not work as documented.** The report states f-001 went from
  1256 ms to the authored 1000 ms. I measure 1254 ms — the same number, so the `__playingAt` guard
  changed nothing. The likely reason: `marks[0]` for f-001 lands at ~264 ms and the player's 250 ms
  auto-start (`player.js:86`) has already fired by then, so `Math.max(marks[0].at, __playingAt)`
  picks the later of two nearly identical values. Whatever the ~250 ms is, it is *not* the
  auto-start timer, and the cause is unidentified. `zz-legacy-playback.spec.js:36` therefore still
  fails for a reason nobody has characterised.
- **The audio tests cannot be decided on this machine, and now for a known reason that is not the
  one the fix recorded.** `AGENTS.md` attributes audio problems to a missing output device, and the
  fix assumed a sink would settle it. A sink *is* configured here
  (`alsa_output.pci-0000_05_00.6.analog-stereo`), and the test still fails at 216 ms against a
  150 ms budget. The real obstacle is the instrument: `mute stops audio within 100ms` measures
  `Date.now()` from the test process across a `locator.click()` round trip and an `expect.poll`,
  whose granularity starts around 100 ms. **It cannot resolve the 100 ms budget FR-006 sets**, and
  that is a measurement defect of the same class as the dwell one — not evidence that the product
  violates FR-006. Note `audio.js:6` has `STOP_DURATION = 90`, consistent with the requirement.
- **Two timing assertions remain undecided, as the assessment instructed.** Baseline them on CI
  before any number changes. Both now measure from the correct origin for non-first frames, so a CI
  miss would be a real signal.
- **The restored specs are uncommitted.** This verification ran against the working tree. A PR would
  contain 2 tests that fail by design until the sink and CI questions are settled.
- **`__playingAt` is dead weight in its current form.** It is wired into the observer and the
  measurement, and it changes no result. That is a cost paid for an unproven theory.

## Recommendation

Hold — the applied half holds and nothing regressed, but the fix is `partial` and should not be
merged as-is. Three things are needed before this can close: the first-frame dwell anomaly needs a
characterisation rather than a claimed fix (it may be a real pacing defect, since the authored
1000 ms is not being honoured somewhere); the audio measurement needs rebuilding in-page the way
dwell was, because no sink on any machine can make the current instrument resolve 100 ms; and the
two timing budgets need the CI baseline the assessment already asked for. `zz-legacy-pause.spec.js:62`
and `:94` should be rewritten before being trusted, not retried.
