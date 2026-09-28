# Bug Assessment: A non-permission play() refusal permanently disables the audio track

- **Slug**: audio-track-latch-on-transient-refusal
- **Created**: 2026-09-27
- **Source**: internal analysis during `/speckit.bug.assess slug=e2e-audio-timing-flakes` + the P2 diagnostic
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

Not observed failing in CI. Found by code inspection while diagnosing a different bug,
and then confirmed as *not* the cause of that bug: the P2 diagnostic recorded
`failedTracks: []` on the failing run, so the latch was never entered there. It is
reported because the code path is unambiguous and the repository's own research
document specifies the opposite behaviour.

## Symptom

If `element.play()` ever rejects for a reason other than a permission refusal — an
interruption, a cancellation, a codec the engine declines at that moment — the audio
track is silenced for the rest of the browser session. The narrative continues and the
audio control still reads "on", so from the visitor's seat the story simply has no
sound, indistinguishable from an autoplay block. A reload is the only recovery.

Expected: a refusal that is not a permission refusal leaves the track reactivated by
a new attempt or by a qualified gesture.

## Reproduction

Not directly reproducible without a way to force a non-permission refusal. Code path:

1. `src/scripts/audio.js:326-330` — `playCurrentScene` awaits `requestPlay`
2. `:364-377` — `handlePlayFailure` checks **only** `error?.name === 'NotAllowedError'`
3. `:371` — every other name falls through to `this.failed.add(key)`
4. `failed` is then consulted at `:208`, `:315`, `:342`, `:431`, `:574`, `:580`, each of
   which returns early or skips the element's gain
5. There is **no `failed.delete` and no `failed.clear` anywhere in the codebase** — only
   `failed.add` at `:371` and `:709`

So one non-permission refusal is a one-way latch for the session. A later `resume()`,
scene change, or gesture cannot clear it, because every path checks `failed.has` first.

[NEEDS CLARIFICATION: a deterministic way to force a non-permission refusal in a test
has not been identified. A stub that rejects with `AbortError` would exercise
`handlePlayFailure` but would bypass the real engine's decision, so it would prove the
latch is reachable, not that a real browser reaches it.]

## Suspected Code Paths

- `src/scripts/audio.js:364-377` — `handlePlayFailure`; the only `error.name` comparison
  in the codebase
- `src/scripts/audio.js:371` — `this.failed.add(key)`, the permanent latch
- `src/scripts/audio.js:208`, `:315`, `:342`, `:431`, `:574`, `:580` — the six
  `failed.has` guards that make the latch unrecoverable
- `src/scripts/audio.js:709` — the second `failed.add`
- `specs/001-cinematic-player/research-autoplay-detection.md:44-55, :160-163` — the
  repository's own taxonomy, which says a refusal that is not a permission refusal
  should be "retry or ignore"
- `specs/001-cinematic-player/spec.md` → FR-016 *Classificação de recusa (2026-09-27)* —
  the normative requirement this bug violates

## Root Cause Hypothesis

`handlePlayFailure` classifies refusals into exactly two buckets — permission refusal
(`markBlocked`) and everything else (permanent failure) — because FR-016 only ever
specified the first. The implementation notes in
`research-autoplay-detection.md:160-163` already prescribed a third bucket
("retry or ignore") for transient names such as an interruption, and that bucket was
never implemented.

Confidence: **high** for the code path (it is short and fully quoted above);
**medium** for real-world reachability, since the P2 diagnostic did not observe the
latch being entered.

## Proposed Remediation

**Preferred — three-way classification, per the decision recorded in the spec.** In
`handlePlayFailure`, distinguish a permission refusal (existing `markBlocked` branch),
a genuine load failure (existing `failed.add`, which FR-032 governs), and a transient
refusal, which must neither show the overlay nor latch. For the transient case, clear
any existing latch for that track and let the next attempt or gesture retry — matching
`research-autoplay-detection.md:160-163`.

The safety property that makes this acceptable: a track that is merely *paused* is
already reactivated by `start()` on every resume, so removing the latch does not leave
a paused element stranded — that is the path the T198 fix addressed and it is covered
by `zz-audio-double-toggle.spec.js`.

**Alternatives:**
- *Make the latch recoverable rather than removing it* — clear `failed` on the next
  `playCurrentScene` for that track. Smaller diff, but keeps the wrong default: a
  transient refusal still costs one silent playback attempt.
- *Classify by consulting `element.error`* instead of the promise's error name. More
  precise, but adds a second source of truth for the same decision.

**Files likely to change:**
- `src/scripts/audio.js` (`handlePlayFailure`, and the `failed` guard sites if a
  separate "transient" set is introduced alongside `failed`)
- `tests/e2e/audio.spec.js` — already stubs `play()` to reject with
  `NotSupportedError` (`audio.spec.js:37`), so it is the natural home for a
  transient-refusal regression test

**Tests to add or update:**
- A rejection with a non-permission, non-load name must not add the track to `failed`,
  and must not surface the blocked overlay
- The same rejection followed by a resume must restart the track — i.e. the latch is
  proven recoverable, which no current test asserts
- Keep the existing assertion that a load failure (FR-032) still stays silent and
  functional, so the three buckets stay distinguishable

## Risks & Considerations

- Loosening the latch means a genuinely broken file could be retried repeatedly instead
  of being latched once. FR-032 must therefore keep its own bucket, and the load-failure
  test must keep asserting the silent-but-functional behaviour.
- `failed` is read in six places. Introducing a second set risks the two disagreeing;
  a single classification enum may be safer than two collections.
- A retry loop on a track that can never play could spin. Any retry must stay
  gesture- or attempt-driven, never timer-driven.
- This is invisible in CI today, so there is no regression signal to protect. The new
  tests are the only guard.

## Open Questions

- [NEEDS CLARIFICATION: can a real browser be made to produce a non-permission
  refusal deterministically, or must the regression test stub it? A stub proves the
  classification, not the reachability.]
- Is the six-site `failed.has` fan-out a sign the latch should be replaced by per-track
  state on the element itself, rather than a set on the manager? That is a larger
  refactor and is out of scope here.
- Does the same three-way classification need to apply to the frame track, or only to
  the scene track? `playFrame` (`:352-356`) calls the same `handlePlayFailure`, so
  presumably both.
