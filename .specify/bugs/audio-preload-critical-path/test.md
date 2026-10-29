# Bug Verification: 347 KB of unplayable audio is no longer fetched on the critical path

- **Slug**: audio-preload-critical-path
- **Tested**: 2026-09-30
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The assessment's reproduction was re-run independently and no longer reproduces: a
blocked session transfers 115,484 B of audio instead of the 346,452 B measured in the
assessment, and the two off-screen tracks are gone entirely. A single-variable
counterfactual — hand the source back at construction instead of at first play, without
touching a line of shipped code — puts the load straight back to 346,452 B, which
confirms the cause rather than merely the improvement. A granted session transfers
346,452 B, identical to before, so the majority path is untouched. No regressions: 210/210
across the audio suite on all three engines this host can launch, 235 passed / 0 failed on
the full e2e suite, 133/133 unit, build and perf gates green.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction, post-fix (assessment steps 1-3) | `node /tmp/opencode/audiorepro/repro.mjs` (Chromium + Firefox) | pass | Blocked session = 115,484 B; assessment measured 346,452 B. `scene-02.aac` and `frame-03.aac` absent |
| Reproduction, counterfactual (pre-fix trigger restored at runtime) | same harness, `eagerBlocked` init script | pass | 346,452 B on both engines — the assessment's exact number, with one variable changed |
| `preload` vs `encodedBodySize` (assessment step 3) | same harness, element state read at the autoplay verdict | pass | All three elements report `preload: 'auto'`, only the armed one transfers bytes — `preload` never gated the fetch |
| No regression for a granted session | same harness, `granted` init script | pass | 346,452 B on both engines, all three tracks armed — same as pre-fix |
| New tests from the fix | `npx playwright test tests/e2e/zz-audio-deferred-bytes.spec.js … -workers=1` (3 projects) | pass | 12/12 |
| Tests updated by the fix | same run, `degradation-production` + `zz-degraded-coverage` | pass | 81/81 for the three specs together |
| Audio regression suite | 15 audio specs × mobile-chromium, desktop-chromium, desktop-firefox, `--workers=1` | pass | 210 passed, 0 failed |
| Full e2e regression | `npx playwright test tests/e2e --project=desktop-chromium --workers=1` | pass | 235 passed, 1 skipped, 0 failed |
| Unit tests | `npm run test:unit` | pass | 133 passed, 0 failed |
| Manifest validation | `npm run validate` | pass | `manifest valid: src/data/story.json` |
| Production build + budgets | `npm run build` | pass | 13,279 compressed script bytes, 3,192 style, `initial=187355 maxFrame=160252 total=1515886`; all budgets held |
| Perf gates | `npx playwright test tests/perf` (3 projects, `--workers=1`) | pass | 31 passed, 5 skipped; SC-018 `app frames 0` on all three engines |
| Environment gate | `npm run preflight` | fail (pre-existing) | 14/15. Only `browser-launch`/WebKit fails — `libicudata.so.74`, the ICU mismatch `AGENTS.md` documents for this host. Fails identically without the fix |
| Lint / type-check | — | not-run | No lint or typecheck script exists in `package.json`; this is vanilla ESM with no build-time type gate. `preflight` is the environment gate instead |
| WebKit projects, macOS `test:perf:webkit` | — | not-run | WebKit cannot launch on this Fedora host (ICU). Must be covered in CI |

### Reproduction harness

The harness lives outside the repo (`/tmp/opencode/audiorepro/repro.mjs`, ephemeral) and
touches no source file. It serves the repo with the project's own
`node scripts/serve-e2e.mjs 8080` — the same Range-capable server Playwright's `webServer`
uses — and for each engine loads `/?story=src%2Fdata%2Fstory.json` cold, forces the
blocked-autoplay path exactly as `tests/e2e/autoplay.spec.js:6` does, then reads
`performance.getEntriesByType('resource')` filtered on `/assets/audio/` plus the live
element state. It measures at the autoplay verdict and again 3.5 s later, after pausing
the reader so auto-advance cannot move the measurement to another scene.

The counterfactual needs care and is worth recording, because the obvious approach fails
silently. A `MutationObserver` on the document for the `data-track-source` attribute
reproduces nothing: these `<audio>` elements are created with `new Audio()` and never
appended, so the observer never fires and the run reports the fixed behaviour while
looking like a legitimate control. What works is replacing the global constructor:

```js
const NativeAudio = window.Audio;
window.Audio = function Audio() {
  const el = new NativeAudio();
  const proxied = new Proxy(el.dataset, {
    set(target, prop, value) {
      target[prop] = value;
      if (prop === 'trackSource' && !el.src) el.src = value;   // the pre-fix trigger
      return true;
    }
  });
  Object.defineProperty(el, 'dataset', { configurable: true, get: () => proxied });
  return el;
};
```

That restores construction-time arming — `new Audio(source)` behaviour — while the shipped
code runs unmodified, changing exactly one variable.

## Output Excerpts

```
== chromium / blocked
   at autoplay verdict : total= 115484 bytes= {"scene-01.aac":115484}
   elements (at verdict): [{"key":"scene-0","preload":"auto","armed":true},
                           {"key":"scene-1","preload":"auto","armed":false},
                           {"key":"frame-frame-03","preload":"auto","armed":false}]
   overlay= true state= blocked

== chromium / eagerBlocked          (source handed over at construction instead)
   at autoplay verdict : total= 346452 bytes= {"scene-01.aac":115484,"scene-02.aac":115484,"frame-03.aac":115484}
   elements (at verdict): all three "armed":true
   overlay= true state= blocked

== chromium / granted              (unchanged from pre-fix)
   at autoplay verdict : total= 346452 bytes= {"scene-01.aac":115484,"scene-02.aac":115484,"frame-03.aac":115484}
   overlay= false state= on

== firefox / blocked        total= 115484
== firefox / eagerBlocked  total= 346452
== firefox / granted        total= 346452
```

```
210 passed (9.1m)     # 15 audio specs × mobile-chromium, desktop-chromium, desktop-firefox
235 passed / 1 skipped / 0 failed   # npx playwright test tests/e2e --project=desktop-chromium
# tests 133 / # pass 133 / # fail 0   # npm run test:unit
build complete: 13279 compressed script bytes, 3192 compressed style bytes,
                raw assets: initial=187355, maxFrame=160252, total=1515886
31 passed, 5 skipped  # tests/perf — SC-018 app frames 0 on all three engines
preflight: FAILED, 1 of 15 checks failed   # browser-launch/webkit only, pre-existing
```

## Residual Risks

- **WebKit is entirely unverified.** This host cannot launch the pinned WebKit build
  (`libicudata.so.74`, ICU 74 vs Fedora 44's ICU 77), so `mobile-webkit` and
  `desktop-webkit` never ran. This is the sharpest gap: the assessment's open question #2
  was specifically about WebKit, and while the fix makes the `preload` question moot (no
  source at construction, so no fetch for `preload` to fail to gate), WebKit's *unlock*
  path is exactly the T199 per-element probe that `unlockPrecreatedElements()` depends on
  — now arming a source at unlock time instead of finding one already there. CI must
  confirm the overlay still appears and the tap-to-start still works on both WebKit
  projects.
- **First-play latency on unlock is still unmeasured.** Assigning the source at unlock
  defers buffering to the moment it is needed. This host has a working PipeWire sink
  (`alsa_output.pci-0000_05_00.6.analog-stereo`), so a media element is not silently
  failing, but nothing in an automated run can hear whether the first track starts late.
  Needs a human on a real device.
- **The LCP benefit is still unquantified.** Assessment open question #1 is untouched: the
  blocked cold load carries 230,968 B less, but how much of that was LCP transfer time
  under a 1.44 Mbit/s profile was never isolated, and the `lighthouse-lcp-over-budget`
  headroom has not been re-measured. The `lighthouse-lcp-element-audit` and
  `lcp-render-delay` slugs in flight may already cover the neighbouring ground.
- **The blocked path still fetches 115,484 B by design**, not zero — the boot `play()`
  probe needs a real track or it rejects `NotSupportedError` and the track is latched as
  broken. Removing that last track needs serialised layer start or a synthetic probe
  element; both are recorded as follow-ups in `fix.md`, neither was attempted.
- **Parallel-load flakiness in the e2e suite is unresolved** and is not this fix's doing.
  At default worker counts 9-13 timing specs fail; the same runs at `--workers=1` are
  green, and the failures are identical with the fix reverted. One of them,
  `zz-legacy-pause.spec.js:94 "mute stops audio within 100ms"` (312 ms against a 150 ms
  budget), failed in the fix phase both with and without the change and passed in this
  phase. Tracked separately as `e2e-audio-timing-flakes`; it will keep making CI noisy and
  should be fixed before the matrix is trusted as a gate.
- One transient failure appeared during this verification and was chased down rather than
  assumed away: `degradation-production.spec.js` failed 3× on desktop-firefox in a
  3-project run, passed 27/27 when re-run alone, and passed 81/81 when the identical
  3-project command was re-run. One of the three was a CLS assertion with no audio
  involvement. Environment flake, not a regression.

## Recommendation

Close the bug — verified end to end, on two engines, with a counterfactual that isolates
the cause. The one thing this verification could not do is run WebKit, and that engine
owns the riskiest remaining path (the per-element autoplay unlock), so let the `mobile-webkit`
and `desktop-webkit` CI jobs plus the macOS `test:perf:webkit` job be the gate on merging
rather than this local run. The first-play-latency check on a real device should ride
along with that merge; everything else in the assessment's reproduction is now settled by
measurement.
