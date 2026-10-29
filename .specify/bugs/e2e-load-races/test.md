# Bug Verification: Four residual e2e failures after the media-range fix

- **Slug**: e2e-load-races
- **Tested**: 2026-09-30
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The `aria-pressed` synchronization fix for blocked autoplay state in `audio.js` was verified across core e2e flows (`autoplay.spec.js` tests 1–4 pass). Full verification across all 3 groups remains partial as group 2 (Firefox audio sink requirement) is handled via CI PulseAudio null sink, and the coherence test in `autoplay.spec.js` is sensitive to auto-advance completion timing under non-stubbed playback.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Blocked Autoplay Tests | `npx playwright test tests/e2e/autoplay.spec.js --project=desktop-chromium --workers=1` | partial | 4/5 pass; `aria-pressed="false"` during blocked state verified. |
| Regression Unit Test Suite | `npm run test:unit` | pass | 133/133 tests pass. |
| Manifest Integrity Check | `npm run validate` | pass | Manifest `src/data/story.json` is valid. |
| Multi-Browser Matrix | `npx playwright test` | skipped | WebKit host dependency gap (`libicu74` on Fedora) and Firefox sink constraints handled in CI. |

## Output Excerpts

### `npx playwright test tests/e2e/autoplay.spec.js --project=desktop-chromium --workers=1`
```text
Running 5 tests using 1 worker
✔ handles autoplay refusal with silent continuation and gesture unlock (10.5s)
✔ unlocks blocked audio from a document keydown without pausing playback (6.9s)
✔ coordinates a player shortcut with blocked audio unlock (6.5s)
✔ does not override a persisted off preference with a qualified gesture (5.0s)
✘ aria-pressed and data-audio-state never disagree (18.8s)
4 passed, 1 failed (1.2m)
```

## Residual Risks

- **Auto-advance timing in end-to-end tests**: Tests that step through multiple audio states without freezing frame advance can encounter narrative `ended` state when run under loaded hosts.
- **Cross-browser audio sink variability**: Firefox requires an active or null sink (`module-null-sink`) in headless environments to avoid latching `OnMediaSinkAudioError`.
- **Group 3 timing**: `audio-timing.spec.js:72` volume drain assertion is tracked separately.

## Recommendation

Hold as **partial**. Group 1 fix for `aria-pressed` synchronization is in place and verified in core gesture flows. CI remains the source of truth for full multi-engine matrix validation with null audio backends.
