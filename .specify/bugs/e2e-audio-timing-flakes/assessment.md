# Bug Assessment: Four e2e failures on the dev gate — two distinct root causes

- **Slug**: e2e-audio-timing-flakes
- **Created**: 2026-09-27
- **Source**: pasted text (CI `gate` output on `fix/media-masters` @ e546a66, run on `ubuntu-latest`)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

After `build:images` went green, the gate reached the e2e matrix for the first time
in this branch's history: **833 passed, 4 failed**.

```
1  [mobile-webkit]     focus-loss.spec.js:11
2  [mobile-webkit]     pause.spec.js:17
3  [desktop-firefox]   pause.spec.js:17
4  [desktop-firefox]   zz-audio-double-toggle.spec.js:43
```

Neither chromium project fails. `Performance budgets` and `Lighthouse delivery gate`
are skipped because the matrix fails first.

## Symptom

Four e2e assertions fail deterministically on Firefox and WebKit while passing on
both Chromium projects. Expected: the matrix is green on all five projects.
Actual: three failures are tests that depend on real, un-gestured `play()` being
granted; the fourth is a race against a 250 ms timer that a slow engine loses.

## Reproduction

1. `git checkout dev` (012c7a7)
2. `npx playwright install --with-deps chromium firefox webkit`
3. `npx playwright test tests/e2e/pause.spec.js tests/e2e/focus-loss.spec.js tests/e2e/zz-audio-double-toggle.spec.js`
4. Observe: failures on `firefox` and `webkit`; none on `chromium`

Note: the webkit half cannot be reproduced on this Fedora host (see
`AGENTS.md` → *Environment Gotchas*); `firefox` reproduces locally, `webkit` needs CI.

## Suspected Code Paths

### Root cause A — tests depend on un-gestured real autoplay

- `tests/e2e/pause.spec.js:17-55` — never stubs `HTMLMediaElement.prototype.play`,
  and resumes via `page.evaluate(() => ...resume())` at line 28, which is **not** a
  user gesture. Line 52 then asserts `currentTime` advances past the paused position.
- `tests/e2e/zz-audio-double-toggle.spec.js:43-66` — same shape. Drives
  `audio.toggle()` twice in-page at lines 55-57 to guarantee sub-ramp timing, then
  asserts `paused === false` at line 64.
- `tests/e2e/zz-audio-double-toggle.spec.js:92-113` — third test, identical
  structure via synthetic `M` keydown events, asserting `paused === false` at line 111
  exactly as line 64 does. **In scope, not latent** (corrected 2026-09-27): it fails for
  the same reason on the same engines; its absence from the CI failure list is
  unexplained and most likely a run-order artifact.
- `tests/e2e/pause.spec.js:4-15` — the *passing* test in the same file, which **does**
  stub `play()` at lines 5-7. The stub/no-stub split inside one file is the tell.
- `tests/e2e/zz-audio-double-toggle.spec.js:68-90` — also passing, because it asserts
  only `dataset.fadeDirection` and `isElementPlaying()`, which are pure JS state and
  need no real playback.
- `tests/e2e/audio-activity.spec.js:78-85` — the repo's own statement of the rule
  these tests break (quoted below).
- `src/scripts/audio.js:262-285` (`requestPlay`), `:636-658` (`fadeOut`) — the
  production code under test. **Not at fault**: the T198 fix at
  `src/scripts/audio.js:216` is correct and its dedicated assertions pass.

### Root cause B — race against a 250 ms auto-start window

- `tests/e2e/focus-loss.spec.js:18` — `page.waitForFunction(() => globalThis.__cinematicPlayer?.autoStartTimer > 0)`
  polls for a transient state that exists for only 250 ms after construction.
- `tests/e2e/focus-loss.spec.js:12` — `page.goto(..., { waitUntil: 'commit' })`
  returns as soon as the response commits, so the poll can start arbitrarily late.
- `tests/e2e/focus-loss.spec.js:13-17` — the author's own comment already concedes the
  window is narrow and WebKit is slow, and documents a partial workaround
  (`autoStartTimer > 0` instead of `status === 'idle'`). The workaround narrows the
  race without closing it.

## Root Cause Hypothesis

**These are test-harness defects, not product defects. Two independent causes.**

**A — engine-dependent autoplay policy.** Playwright permits un-gestured `play()` on
Chromium but not on Firefox or WebKit. When `play()` rejects, the element never
advances `currentTime` and stays `paused`, so the resume assertions fail. The repo
already knows this and has a convention for it — `tests/e2e/audio-activity.spec.js:78`:

> "These two drive playback deterministically instead of relying on real autoplay.
> **Headless engines differ on whether an un-gestured play() is granted, and a test
> that sometimes passes because the browser allowed audio is not a test.**"

Ten spec files stub `HTMLMediaElement.prototype.play` to comply. The three failing or
latent tests do not. Confidence: **high** — the pattern holds within single files
(`pause.spec.js:4` passes, `:17` fails; `zz-audio-double-toggle.spec.js:68` passes,
`:43` fails), and chromium never appears in the failure list.

**B — a lost race, not a defect.** `focus-loss.spec.js:18` needs to observe
`autoStartTimer > 0`, true only inside a 250 ms window opened in the constructor. If
page init to first poll exceeds 250 ms, the timer has already fired, the predicate is
never true, and `waitForFunction` burns its full 30 s timeout. WebKit loses this race
on a loaded CI runner; it failed on `mobile-webkit` in the final run and on **both**
webkit projects in an earlier run, which is the signature of flakiness rather than a
deterministic fault. Confidence: **high** for the mechanism, **medium** for how often
it fires.

## Proposed Remediation

**For A — unlock with a real gesture, do not stub.** A naive `play()` stub will not
work for these tests: they assert that `currentTime` *advances*, which a stubbed
`play()` cannot produce. The correct fix is to supply a genuine user gesture so the
engine grants autoplay, keeping the real-playback assertions intact.

- `pause.spec.js:17` — replace the `page.evaluate(resume)` at line 28 with a real
  click on `#play-toggle` (or a `M` keypress). The gesture permits autoplay in every
  engine and the test still measures real pause/resume timing.
- `zz-audio-double-toggle.spec.js:43` and `:92` — perform one real gesture (click
  `#play-toggle`, or press `M`) to unlock the elements *before* the in-page
  sub-ramp toggles. The 30 ms in-page calls must stay: the comment at lines 49-50 is
  right that Playwright cannot click faster than `STOP_DURATION`.

**Alternatives:**
- *`test.skip(browserName === 'firefox' || 'webkit')`* — one line each, but drops real
  playback coverage on 2 of 5 projects. `zz-autoplay-real.spec.js` shows the repo
  deliberately preserves real-engine coverage, so this trades away something they
  chose to keep.
- *`context.grantPermissions(['autoplay'])`* — Chromium-only; would not help the two
  engines that actually fail.

**For B — record the transient state instead of racing it.** Replace the poll with an
observer installed via `page.addInitScript` (which runs before page scripts): record
the maximum `autoStartTimer` ever seen, then assert on the recorded maximum. The
assertion "the timer was armed" survives regardless of how slow the engine is, and the
test keeps proving what it means to prove.

**Files likely to change:**
- `tests/e2e/pause.spec.js`
- `tests/e2e/zz-audio-double-toggle.spec.js`
- `tests/e2e/focus-loss.spec.js`

**Tests to add or update:**
- Extend the recorder in `focus-loss.spec.js` to also assert the clearing
  (`autoStartTimer === 0` afterwards), which is what the test already intends at line 29
- ~~Audit `tests/e2e/resume.spec.js`, which reads real audio state without stubbing
  `play()` and is latent for the same reason as root cause A~~
  **Dropped — false positive (corrected 2026-09-27).** `resume.spec.js:7` persists
  `hwc.audio = 'off'`, so `play()` is never attempted, and the file contains zero reads
  of `currentTime` / `.paused` / `.volume`. Its assertions are `data-status` and
  `data-frame-id`, which are player state, not media state. Not exposed to this failure.
- No production change to `src/scripts/audio.js` is warranted **in this round**
  (corrected 2026-09-27). See *Reassessment* below: there IS a product defect there, but
  the decision recorded in `spec.md` → *Session 2026-09-27* scopes this fix to the tests
  and tracks the defect separately.

## Risks & Considerations

- **This is not a product regression.** The player, audio manager and autoplay
  handling behave correctly; these are assertions that cannot be satisfied on two
  engines. Do not "fix" `src/scripts/audio.js` in response to this gate.
- Moving to a real gesture makes the tests depend on click-to-play timing, which is
  slightly more machinery than a stub. Each gesture change needs re-running across
  all five projects, not just the two that were failing.
- `focus-loss.spec.js:32` clicks `#play-toggle` with `{ force: true }` and expects the
  player to stay `paused` behind the resume overlay. Adding an earlier real click in
  this file must not accidentally dismiss that overlay and invalidate the test's
  premise.
- The webkit half of the verification can only run on CI. Local confirmation covers
  chromium and firefox only (3 of 5 projects).
- While this is red, `test:perf` and `lhci` never run, so a red matrix is also
  suppressing two further gates — which is what creates pressure to bypass review.

## Reassessment (2026-09-27, after external research + codebase analysis)

The original root cause A above is **downgraded from "high" to "unconfirmed"**. Two
independent lines of evidence contradict it, and the code shows three distinct paths to
the same frozen `currentTime` that cannot be told apart by reading code.

**Contradicting evidence:**
- Playwright passes `--mute-audio` by default in Chromium, and muted autoplay is
  *permitted*. The Chromium "pass" may therefore be an artifact of the same mechanism
  that let the T199 defect ship (`tasks.md:622`: `volume = 0` made Chromium treat the
  element as muted, so `play()` resolved instead of rejecting).
- A Playwright core maintainer states every `page.evaluate` is marked as a user gesture
  in the browser, which would mean `pause.spec.js:28`/`:51` are *not* un-gestured and
  autoplay would be granted in all engines.
- Playwright issue #33868 reports Playwright's Firefox as *more* permissive than stock
  Firefox. Ours fails, which is the opposite direction.

**The three paths, all ending in a paused element with nothing scheduled to restart it:**

| Path | Mechanism | Code |
|---|---|---|
| (a) permission refusal | `NotAllowedError` → `markBlocked()` → `stopAll(0)` → `awaitingUnlock = true` → `start()` refused; only a real gesture recovers | `audio.js:364-387`, `:514` |
| (b) transient refusal latch | any non-`NotAllowedError` refusal → `failed.add(key)`, and **`failed` has no `delete`/`clear` anywhere** — one-way for the session | `audio.js:371`, `:709` |
| (c) undefined duration | `scene.duration` is `NaN` before metadata; `Math.min(0.04, Math.max(0, NaN))` propagates `NaN`, so `before` is `NaN` and `x > NaN` is always false at line 52 | `pause.spec.js:33` |

Path (b) is a **product defect**: `research-autoplay-detection.md:160-163` states that
`AbortError` and unknown names should be "retry or ignore", while `audio.js:371` treats
them as permanent silent failure. The spec was silent on this; it is now specified in
`spec.md` → *Session 2026-09-27* and in FR-016's classification note.

**Decisions recorded in the spec** (`spec.md` → `### Session 2026-09-27`):
1. This fix is scoped to the tests; the path (b) defect is tracked separately.
2. Run one diagnostic pass first, recording the real refusal reason plus element state
   at the moment of failure, to identify which path is live. `zz-autoplay-real.spec.js:24-40`
   already contains a reusable recorder of exactly this shape.
3. A refusal that is not a permission refusal must not be classified as a block and must
   not permanently disable the track (now normative in FR-016 and in Edge Cases).
4. The 250 ms auto-start literal stays; the test records the observed maximum instead of
   racing the window.

**Also settled by evidence:** do **not** `test.skip` the affected engines and do **not**
stub `play()`. A resolve-stub would make `zz-audio-double-toggle.spec.js:43` *fail* at
line 64 (`paused === false` can never hold for a stubbed, permanently-paused element), and
T199's original defect was structurally invisible to resolve-stubs. Real-playback coverage
is 5 of 132 tests (3.8%); the correct fix is a trusted gesture, not less coverage.

## Open Questions

- [NEEDS CLARIFICATION: should the three autoplay-dependent tests keep asserting real
  playback, or is the intent that playback state be driven deterministically like the
  other ten specs? The two goals conflict for a test that must observe `currentTime`
  advancing, and the owner should pick.]
- [NEEDS CLARIFICATION: `zz-audio-double-toggle.spec.js:92` has the same defect shape
  as `:43` but did not fail in this run. Confirm whether it is intermittent before
  deciding it needs the same change.]
- Is the 250 ms auto-start window itself too narrow to test reliably? If the product
  intent is that auto-start fires quickly, the test may be asserting on a state the
  design does not actually guarantee to be observable.
