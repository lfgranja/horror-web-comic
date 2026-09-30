# Bug Verification: Four e2e failures on the dev gate

- **Slug**: e2e-audio-timing-flakes
- **Tested**: 2026-09-30
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The race condition on the 250 ms auto-start window was verified as fixed via in-page observer sampling (`focus-loss.spec.js` 3/3 passed). The HTTP Range support on the E2E static server was verified via unit tests (`serve-e2e.test.js` 3/3 passed). However, full matrix E2E execution remains partial locally due to host-specific audio device constraints and missing WebKit system dependencies, which are formally handled and certified in the CI pipeline with PulseAudio null sink.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| E2E Range Server Unit Tests | `node --test tests/unit/serve-e2e.test.js` | pass | 3/3 tests pass (206 Range, cache hit, containment check) |
| Auto-Start Observer E2E Test | `npx playwright test tests/e2e/focus-loss.spec.js --project=desktop-chromium --workers=1` | pass | 3/3 tests pass including in-page auto-start observer verification |
| Regression Unit Test Suite | `npm run test:unit` | pass | 133/133 tests pass |
| Manifest Integrity Check | `npm run validate` | pass | `story.json` is valid |
| Full 5-Browser E2E Matrix | `npx playwright test` | skipped | WebKit cannot launch on Fedora host (lacks `libicu74`); Firefox requires PulseAudio null sink. Matrix is enforced in CI. |

## Output Excerpts

### `node --test tests/unit/serve-e2e.test.js`
```text
✔ the e2e server permits a cache hit, which the warm-frame budget depends on (5096.371061ms)
✔ the e2e server answers a Range request with 206, which media seeking depends on (3655.73935ms)
✔ the e2e server will not serve a path outside the repository (3674.818753ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
```

### `npx playwright test tests/e2e/focus-loss.spec.js --project=desktop-chromium --workers=1`
```text
Running 3 tests using 1 worker
✔ startup focus loss clears auto-start, pauses audio, saves progress, and requires overlay resume (11.0s)
✔ focus loss during pending navigation cancels the queued move and requires overlay resume (11.4s)
✔ playing focus loss clears all playback timers and permits only explicit overlay resume (9.5s)
3 passed (53.8s)
```

## Residual Risks

- **Audio sink requirement for Firefox**: Firefox fails media playback when run without an audio output device (`OnMediaSinkAudioError`). This is addressed in CI via PulseAudio `module-null-sink`.
- **WebKit engine availability**: Playwright WebKit cannot launch on Fedora hosts due to ICU library version mismatch (`libicu.so.74` required vs host `libicu-77`), and is validated exclusively on Ubuntu/macOS CI runners.
- **Permanent media failure latch**: The latch behavior in `AudioManager.handleMediaFailure` is tracked as a separate item in `.specify/bugs/audio-track-latch-on-transient-refusal/`.

## Recommendation

Hold as **partial**. The test harness races (in-page auto-start observer and Range-capable E2E server) are verified and working as expected. Full cross-engine verification for WebKit and Firefox audio sink should continue to be certified via GitHub Actions CI.
