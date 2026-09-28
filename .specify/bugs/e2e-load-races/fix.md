# Bug Fix: aria-pressed reported the preference instead of the effective state

- **Slug**: e2e-load-races
- **Fixed**: 2026-09-28
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

`aria-pressed` on `#audio-toggle` was derived from the stored preference (`this.enabled`)
rather than from the effective state, so a blocked session advertised the control as
pressed while the blocked overlay was up and the control was `aria-disabled`. It is now
derived from `state()`, the same value that already backs `data-state` and the status
text, so the two representations of the control can no longer drift.

Only group 1 of the three in the assessment is addressed. Groups 2 and 3 are deliberately
unchanged — see *Deviations*.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/scripts/audio.js` | modified | `emit()` derives `aria-pressed` from `state()` instead of `this.enabled` |
| `tests/e2e/autoplay.spec.js` | modified | asserts `aria-pressed="false"` while blocked, plus a new coherence test |

## Diff Highlights

```js
// before — the preference
toggle.setAttribute('aria-pressed', String(this.enabled));

// after — the effective state, same source as data-state and the status text
toggle.setAttribute('aria-pressed', String(state === 'on' || state === 'paused'));
```

`state === 'on' || state === 'paused'` is exactly `enabled && !blocked` given `state()`'s
definition, so the only behaviour that changes is the blocked case. `off`, `paused` and
`on` are all reported as before.

## Tests Added or Updated

- `tests/e2e/autoplay.spec.js::handles autoplay refusal with silent continuation and
  gesture unlock` — now asserts `aria-pressed="false"` while the blocked overlay is up.
  It previously asserted only `aria-disabled="true"`, which is why the drift went unnoticed.
- `tests/e2e/autoplay.spec.js::aria-pressed and data-audio-state never disagree` — new.
  Drives blocked → off → on → paused and asserts at each step that `aria-pressed` equals
  `String(state === 'on' || state === 'paused')`, so the two representations cannot drift
  again on any engine.

## Local Verification

- `node --check tests/e2e/autoplay.spec.js` → pass
- `npx playwright test tests/e2e/autoplay.spec.js --project=desktop-chromium --project=desktop-firefox`
  → **10 passed**, including the new coherence test on both engines
- `npm run test:unit` → **119/119**
- No unit test asserts `aria-pressed`, so there was nothing to update there

The webkit half of the matrix cannot run on this host (`AGENTS.md` → *Environment
Gotchas*); CI is the check for that. `zz-autoplay-real.spec.js:82` is the test this is
meant to fix and it only fails where autoplay is genuinely blocked.

## Deviations from Assessment

**Group 2 (`pause.spec.js:17`, `zz-audio-double-toggle:36` on firefox) — no product
change, by decision.** The sink failure stays latched through `handleMediaFailure`, which
keeps a missing file and an audio-sink failure as distinct `MediaError` codes. The
correction is that this distinction is currently only available on the element: the app
neither logs nor surfaces `element.error.code`, so from the outside the two are
indistinguishable. Recording that as a gap rather than fixing it here.

**Group 3 (`audio-timing.spec.js:72`) — not addressed.** The assessment rated its root
cause **low confidence**: the arithmetic fits a stale `fadeIn` being driven by the test's
manual rAF drain, but the generation guard that should prevent it has not been traced on
the failing engine. It needs the same treat-and-observe diagnostic that found the
media-range defect before any fix is chosen. Fixing it blind would risk hiding a real
product defect.

**Rejected the assessment's framing of group 2 as a product decision.** The user
confirmed the latch is correct behaviour, so the open question about sink-vs-transient
is settled and the remaining question is narrower: whether the suite should depend on a
real audio device at all.

## Follow-ups

- **Decide whether the e2e suite requires a real audio device.** Group 2 is the largest
  remaining block and may be a CI configuration question rather than a code one. The
  alternative — treat a sink failure as transient — was explicitly rejected, because it
  would merge it with the missing-file case.
- **Surface `element.error.code`** somewhere, so a missing file and a dead output device
  are distinguishable without a debugger. This is what makes the "keep it latched"
  decision workable.
- Group 3 needs its own diagnostic.
- Do not reach for retries on any of these. A deterministic multi-engine failure is a
  signal.
