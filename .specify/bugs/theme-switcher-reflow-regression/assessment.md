# Bug Assessment: `.sr-only` is defined nowhere, so the theme label renders as visible text and breaks reflow and the end-state overlay

- **Slug**: theme-switcher-reflow-regression
- **Created**: 2026-10-01T10:21:22-04:00
- **Source**: pasted text (CI/CD status for `feature/002-theme-switcher`, PR #29 → `dev`) plus the `gate` job logs of runs 36820174616, 36820170503, 36815634698, 36815622031, and dev baseline 36730357221
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

The user supplied a CI status table: the last five runs for `feature/002-theme-switcher`
(both `push` and `pull_request`) all concluded `failure`, with no successful run among
them. The report's own next step was to inspect the logs and artifacts (Playwright or
Lighthouse) to find the cause.

That inspection is what this assessment is. The report is a symptom, not a diagnosis, and
it did not name a failing assertion. The `gate` job fails at the **End-to-end browser
matrix** step; `preflight`, `validate`, `test:unit`, `build:images` and `build` all pass,
and the Lighthouse gate never runs because it is gated behind e2e.

Extracted from run 36820174616 (`gate`, job 110233844909), the matrix reports
**6 failed / 1279 passed / 2 flaky / 3 skipped**:

```
[mobile-webkit]  › tests/e2e/reflow.spec.js:10:3          › reflows controls and descriptions at 320px with 200% text
[mobile-webkit]  › tests/e2e/zz-css-reflow.spec.js:22:3   › zz reflows without clipping or horizontal overflow at 320px with 200% text
[mobile-webkit]  › tests/e2e/zz-end-state-coverage.spec.js:16:3 › zz end overlay never covers the navigation controls at 320x568
[desktop-webkit] › tests/e2e/reflow.spec.js:10:3          › reflows controls and descriptions at 320px with 200% text
[desktop-webkit] › tests/e2e/zz-css-reflow.spec.js:22:3   › zz reflows without clipping or horizontal overflow at 320px with 200% text
[desktop-webkit] › tests/e2e/zz-end-state-coverage.spec.js:16:3 › zz end overlay never covers the navigation controls at 320x568
  2 flaky
    [desktop-chromium] › tests/e2e/zz-end-state-coverage.spec.js:16:3 › … at 320x568
    [desktop-webkit]   › tests/e2e/audio-lifecycle.spec.js:64:1 › teardown invalidates pending starts and prevents later volume writes
```

The earlier runs add two more failures that the latest commit had already addressed:
run 36815634698 (10 failed) also shows `theme-a11y.spec.js:76` on both WebKit projects
and `zz-legacy-a11y.spec.js:35` on `mobile-webkit`. Commit `7124b8a`
("condition forcedColorAdjust assertion on browser engine support") fixed the
`theme-a11y` one, which is why it is absent from the newest run.

**The `dev` baseline is clean for these specs.** Run 36730357221 on `origin/dev`
(`e9ceb7e`) fails 4 tests, all audio/live-region timing, and contains **zero**
occurrences of `reflow` or `end-state` — while `tests/e2e/reflow.spec.js`,
`zz-css-reflow.spec.js` and `zz-end-state-coverage.spec.js` all exist on `dev`
(verified with `git ls-tree origin/dev tests/e2e/`). So families 1 and 2 below are
introduced by this branch, not inherited.

## Symptom

The theme switcher's `<label class="sr-only">` has no CSS rule anywhere in the
repository, so it renders as ordinary visible text inside the control bar. That text
(1) makes `.control-bar` overflow horizontally at 320px under 200% text on WebKit,
and (2) adds a third stacked row to the already two-row control bar at 320px, which
grows the bar to 377px on a 568px-tall viewport and leaves the end-state overlay band
too short to contain its own action button.

Expected: the label is visually hidden (accessible name only), and at the declared
minimum viewport 320×568 the control bar is short enough that `#replay` stays inside
the overlay band and remains clickable.

## Reproduction

Family 1 (WebKit only — not reproducible on this host, see *Environment* below):

1. `git checkout feature/002-theme-switcher`
2. `npx playwright install --with-deps chromium firefox webkit`
3. `npx playwright test tests/e2e/reflow.spec.js tests/e2e/zz-css-reflow.spec.js --project=mobile-webkit`
4. Observe: both specs fail on the `320` viewport with `Expected: false, Received: true`
   on `horizontalOverflow` / `documentOverflow`

Family 2 (all engines — **reproduced locally 8/8 runs** on `desktop-chromium`):

1. `git checkout feature/002-theme-switcher` (`7124b8a`)
2. `node scripts/serve-e2e.mjs 8080`
3. `npx playwright test tests/e2e/zz-end-state-coverage.spec.js --project=desktop-chromium`
4. Observe: `zz end overlay never covers the navigation controls at 320x568` fails
   intermittently (5 of 6 runs when run with `--workers=1`); the navigation controls
   themselves are never reported as covered — only `#replay`

Family 3 (WebKit only, **not caused by this branch**):

1. `npx playwright test tests/e2e/audio-lifecycle.spec.js --project=desktop-webkit`
2. Observe: `no volume write may land after teardown`, `Expected: 0.009999999776482582,
   Received: 0.009999356232583523`
3. The same assertion fails on `origin/dev` (run 36730357221) — see *Related Reports*

## Suspected Code Paths

### The single root cause — `index.html:67`, class never defined

- `index.html:66-77` — the `.theme-control` block, added by this branch. Line 67 is
  `<label class="sr-only" for="theme">Atmosfera visual da narrativa</label>`.
- **`.sr-only` is defined in no stylesheet in the repository.** A grep for `sr-only`
  across the whole tree returns 10 hits: `index.html`, `design-systems-lab.html`,
  four files under `specs/002-theme-switcher/`, `tests/e2e/theme-a11y.spec.js` — and
  **zero** matches in any `.css`. `src/styles/base.css` (111 lines), `player.css` and
  `tokens.css` contain no such rule.
- Measured in-browser at 320px, confirming it is visible and not merely unstyled:

  ```
  labelRect: { left: 37.78, right: 193.98, width: 156.20 }
  computed:  { display: "block", position: "static", clip: "auto", overflow: "visible" }
  ```

  156px of live text in a 244px row, at 100% font size. At 200% it is 156px in a 244px
  row again, and it makes the row 129px tall instead of ~45px.
- `tests/e2e/theme-a11y.spec.js:53` — `await expect(label).toHaveClass(/sr-only/)`.
  This asserts the class *name* is present, which it is. It never asserts the label is
  hidden, so a class that does not exist passes. **This assertion is why the defect
  reached `main` of the branch.**

### Family 1 — horizontal overflow at 320px / 200% text (WebKit, 4 failures)

- `src/styles/player.css:274-278` — `.theme-control { display: inline-flex; … }` with
  no `min-width: 0` and no overflow handling. As a grid item of `.utility-controls`
  (`:182-189`, `flex-wrap: wrap`) it carries its full min-content width.
- `src/styles/player.css:280-293` — `.theme-select` sets `min-width: 2.8rem` and
  `padding: 0.4rem 0.6rem`, but **no `max-width`**. Measured min-content widths at
  320px/200%: `#theme` needs **186.4px**, the visible label needs **156.2px** — 342.6px
  of min-content into a **244.4px** row.
- `src/styles/player.css:603-608` — at `max-width: 47.99rem`, `.utility-controls`
  becomes `display: grid; grid-template-columns: minmax(0, 1fr)`. The `minmax(0, 1fr)`
  track is the *one* thing that should absorb the overflow, and it absorbs it on
  Chromium (measured `documentOverflow: false`) but not on WebKit.
- Trace payload from run 36820174616's `desktop-webkit` artifact, extracted from
  `1-trace.trace` — the overflow is real and narrow:

  ```
  { fontSize: "32px", horizontalOverflow: true, outOfBounds: [],
    textClipping: [], controlIssues: [], descriptionClipped: false }
  ```

  and from `zz-css-reflow`, the same run:

  ```
  { fontSize: "32px", documentOverflow: true, controlBarOverflow: true,
    controlBarWrapped: true, outOfViewport: [], tooSmall: [], clipped: [] }
  ```

  `outOfViewport`/`tooSmall`/`clipped` are all empty and `fontSize` is exactly `32px`,
  so the 200% zoom is in effect and no control is mis-sized or clipped. The overflow is
  confined to `.control-bar`'s own scroll width — consistent with a text node that is
  156px wide sitting where nothing reserves space for it.

### Family 2 — end-state overlay swallows `#replay` (all engines, 2 failures + 1 flaky)

- `src/styles/player.css:603-608` + `:610-614` — at 320px each utility control is a full
  row of the single-column grid. `.theme-control` **adds a third one**.
- `src/scripts/player.js:143-163` (`publishControlBarHeight`) — publishes
  `--control-bar-top`, the bar's viewport-relative top edge, used by the overlay band.
- `src/styles/player.css:383` — `bottom: max(3rem, calc(100dvh - var(--control-bar-top, 100dvh)))`.
  The band is `100dvh - control-bar-top`, so **the taller the bar, the shorter the band**.
  There is no floor that accounts for the card's own minimum height.
- `src/styles/player.css:387-404` — the card is `align-content: start` with
  `max-height: 100%; overflow: auto`, so when the band is shorter than the card the card
  scrolls internally and its button is pushed out of the visible band.

Measured, 8 consecutive runs at 320×568 (`desktop-chromium`, `--workers=1`):

| run | scrollY | bar height | `--control-bar-top` | band height | card `clientHeight` / `scrollHeight` | `#replay` top | hit test at `#replay` centre | verdict |
|-----|---------|-----------|--------------------|-------------|-------------------------------------|--------------|-----------------------------|---------|
| 1 | 453 | 377 | 125px | 125 | 99 / 178 | 147 | `BUTTON#previous-scene` | **fail** |
| 2 | 374 | 377 | 204px | 204 | 178 / 178 | 147 | `BUTTON#replay` | pass |
| 3 | 453 | 377 | 125px | 125 | 99 / 178 | 147 | `BUTTON#previous-scene` | **fail** |
| 4 | 453 | 377 | 125px | 125 | 99 / 178 | 147 | `BUTTON#previous-scene` | **fail** |
| 5 | 453 | 377 | 125px | 125 | 99 / 178 | 147 | `BUTTON#previous-scene` | **fail** |
| 6 | 374 | 377 | 204px | 204 | 178 / 178 | 147 | `BUTTON#replay` | pass |
| 7 | 453 | 377 | 125px | 125 | 99 / 178 | 147 | `BUTTON#previous-scene` | **fail** |
| 8 | 374 | 377 | 204px | 204 | 178 / 178 | 147 | `BUTTON#replay` | pass |

The mechanism is exact. When the page is scrolled so the bar's top edge lands at 125px,
the band is 125px tall but the card needs 178px, so the card scrolls internally and
`#replay` ends up at `top: 147` — **22px below the band's bottom edge**. The card has
`pointer-events: none` (`player.css:388`) and only `#end-overlay .overlay-card button`
re-enables it (`:416-418`), so the button is simply not there any more; the hit test
returns whatever is under that point, which is `BUTTON#previous-scene`.

The pass/fail split tracks `scrollY` exactly: 453 → fail, 374 → pass. The overlay
correctly reserves the band for wherever the bar actually is; it is the bar's *height*
that has grown, and the band cannot grow back.

Bar height attribution, same viewport, each variant measured:

| variant | bar height | `#replay` clickable |
|---------|-----------|---------------------|
| as-is | 377px | 3/6 |
| `.sr-only` defined (label hidden) | 356px | 3/6 |
| `.theme-control` removed entirely | 306px | 8/8 (probe) |

Two independent contributors, and neither alone is sufficient. The visible label is
worth 21px; the third stacked row is worth ~50px. Hiding the label alone does not fix
family 2.

### Family 3 — `audio-lifecycle.spec.js:64` (WebKit, 1 failure) — pre-existing

- `tests/e2e/audio-lifecycle.spec.js:84` — `expect(result.volume, 'no volume write may
  land after teardown').toBe(before)`. CI reports `Expected: 0.009999999776482582,
  Received: 0.009999356232583523` — a float32-vs-float64 rounding difference on an
  otherwise-correct value.
- Reported **flaky** (passed on retry) in run 36820174616 and **failed** on
  `mobile-webkit` in dev run 36730357221.
- Not touched by this branch; `src/scripts/audio.js` has no diff against `dev`.
  Recorded here so the red-run arithmetic reconciles, and deferred to
  `../e2e-audio-timing-flakes/`.

## Root Cause Hypothesis

**One root cause with two distinct failure modes, plus one unrelated pre-existing flake.**

`index.html:67` ships `<label class="sr-only">` for which **no stylesheet in the
repository defines a rule**. The label therefore renders as ordinary visible text,
156px wide, inside `.theme-control`. Every one of this branch's new e2e failures traces
back to that text occupying layout space that nothing reserved.

The accessibility contract in `specs/002-theme-switcher/contracts/theme-ui-contract.md:15`
and FR-004 both assume `sr-only` means visually hidden. It does not, so the shipped UI
shows the literal string "Atmosfera visual da narrativa" next to the theme picker — a
visible defect on its own, before any test is considered.

From there the two modes split. **Family 1**: the visible text plus `#theme`'s 186px
min-content exceed the 244px `.utility-controls` track at 320px under 200% text;
Chromium shrinks the `<select>` to fit, WebKit does not, so the overflow surfaces only
on WebKit. **Family 2**: the label is a flex child of `.theme-control`, which is a full
row of the single-column grid, so the text makes that row 129px instead of ~45px; with
the third row added the bar is 377px on a 568px viewport, and
`bottom: max(3rem, 100dvh - var(--control-bar-top))` gives the end-overlay band no floor
below the card's own height, so the card scrolls internally and pushes `#replay` out of
the band.

**Confidence: high** for the missing rule and for it being a real, visible defect —
verified by exhaustive grep and by direct computed-style measurement. **Confidence:
medium** that it is the *sole* driver of family 1's WebKit-only overflow, because
WebKit cannot be launched on this host to confirm the shrink behaviour directly.
**Confidence: high** for family 2's mechanism — reproduced 8/8 with the geometry
tabulated above, and the pass/fail split tracks `scrollY` exactly.

## Proposed Remediation

**Preferred — define `.sr-only` in `src/styles/base.css`.** The visually-hidden clip
pattern (`position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
overflow: hidden; clip-path: inset(50%); white-space: nowrap`) belongs next to the
existing `[hidden]` rule at `base.css:51-53` and the form-control sizing at `:30-35`.
This is the actual bug: it restores the documented contract (FR-004), removes the
visible string from the shipped UI, and removes 21px of bar height. It is required
regardless of which of families 1 and 2 still need work.

**Preferred — stop the control bar growing a third stacked row at 320px.** A control
bar occupying 377px of a 568px viewport is a UX defect independent of any test: the
narrative is displaced by controls. The cheapest structural fix is to place
`.theme-control` in the same grid row as `.select-control` (both are short single-value
pickers) rather than giving each its own row, which returns the bar to ~306px. This is
preferred over patching the overlay, because it fixes the cause rather than teaching the
overlay to cope with a bar that is too tall.

**Also required — give the end-overlay band a floor.** `player.css:383` should not be
able to produce a band shorter than the card's intrinsic height. Either clamp the band
with the card's measured height, or — given `pointer-events: none` already lets clicks
through to the controls — keep the card's action pinned inside the visible band
regardless of scroll. Without this, family 2 can recur the next time the bar gains any
height, and the regression test below would be guarding a coincidence rather than a
rule.

**Alternatives:**
- *Hide the label with `aria-hidden` + `display: none`* — rejected. The label is the
  accessible name for `#theme`; removing it from the tree breaks the contract in
  `theme-ui-contract.md` while the `aria-label` happens to duplicate it today.
- *Shorten the label text* — rejected. It papers over a missing CSS rule and the string
  is spec-mandated.
- *Widen the minimum supported viewport, or relax the reflow specs for 320px* —
  rejected. 320px is the declared minimum (`AGENTS.md`, `docs/delivery.md`), SC-017
  exists precisely to hold it, and the repo already forbids widening skips
  (`tests/perf/zz-ci-budgets.spec.js:107`).
- *Fix family 2 only by scrolling the page to the top when the overlay shows* — this is
  what the uncommitted working-tree edit to `player.js` attempts. See *Risks*.

**Files likely to change**:
- `src/styles/base.css` — add the `.sr-only` rule (`:51-53` vicinity)
- `src/styles/player.css` — `.theme-control` placement at `:274-278` and/or the
  `.utility-controls` grid at `:603-608`; the band floor at `:383`
- `src/scripts/player.js` — only if the band floor is implemented in JS rather than CSS
  (`publishControlBarHeight`, `:143-163`)
- `tests/e2e/theme-a11y.spec.js` — tighten `:53`
- `index.html` — no change expected

**Tests to add or update**:
- `theme-a11y.spec.js`: the `sr-only` label must be visually hidden — bounding box
  ≤ 1×1px and `visibility`/`clip-path` consistent with hidden. Asserting the class name
  alone is what let this through; the assertion must be about rendered geometry.
- `zz-end-state-coverage.spec.js`: assert `#replay` lies **inside** the overlay band's
  rect, not merely that `elementsFromPoint` returns it. The current hit test passes in
  the state where the button is out of band on any engine that happens to keep the
  button painted.
- A control-bar height ceiling at 320×568 (e.g. `< 320px`) so a fourth utility row
  cannot silently re-break the band.
- Family 1's WebKit coverage already exists and needs no new test — it is what caught
  this. Confirm it goes green on WebKit after the fix.

## Risks & Considerations

- **The working tree does not build.** `src/scripts/player.js:379` has an uncommitted
  syntax error (`SyntaxError: Unexpected token '.'`, reproducible with
  `node --check`), and `npm run build` fails on it. `git diff` shows a half-finished
  `showEndOverlay` rewrite left orphan statements after the method's closing brace, with
  duplicated `scrollTo`/`publishControlBarHeight` logic. **This is not the CI cause** —
  CI ran committed code, and `git show HEAD:src/scripts/player.js` parses clean — but
  nothing builds locally until it is reverted or finished. It should be reverted first:
  committed code already reproduces all three families.
- **The uncommitted edit is aimed at family 2 and is likely to make things worse.** It
  adds `globalThis.scrollTo(0, 0)` in `showEndOverlay` and drops the scroll-restore
  guard for the last frame in `moveTo` (`player.js:334`). Scrolling to top on overlay
  show would move the bar, not shrink it — it papers over the band arithmetic by
  changing scroll position, and it changes FR-015 scroll-stability behaviour for every
  frame change. Do not carry it forward as the family 2 fix.
- Defining `.sr-only` globally affects any future element using the class. There are
  currently two (the theme label and one in `design-systems-lab.html:457`, which is a
  standalone exploration page and is not part of the build).
- Changing `.theme-control`'s grid placement shifts the control bar's geometry, which is
  an input to `--control-bar-top` and therefore to the overlay band. Budget assertions
  in `tests/perf/zz-ci-budgets.spec.js` and the CLS budget in `budget.json` should be
  re-run, not assumed unaffected.
- Family 3 is **not** to be fixed here. Its float32/float64 comparison is a real test
  precision issue but belongs to `../e2e-audio-timing-flakes/`; widening its tolerance
  inside this fix would hide an unrelated signal.
- Do not treat any of these as flake. Family 2 failed 5/8 runs deterministically on a
  fixed viewport, and family 1 failed on every WebKit retry (3/3) across 4 runs.

## Environment

WebKit cannot be launched on this host — the pinned build links `LIBJPEG_8.0` against
Fedora 44's `libjpeg.so.62`, matching the documented limitation in `AGENTS.md`
(*Environment Gotchas*). Family 1 therefore cannot be reproduced locally and needs a CI
or macOS run to confirm. Family 2 reproduces on `desktop-chromium` and
`desktop-firefox`. Local e2e bar per `AGENTS.md`: the 14 non-browser preflight checks
plus `--project=mobile-chromium --project=desktop-chromium --project=desktop-firefox`.

## Open Questions

- [NEEDS CLARIFICATION: should family 2 be fixed by shrinking the control bar, by
  flooring the overlay band, or both? The assessment recommends both — the bar height is
  a UX problem in its own right, and the missing floor is a latent recurrence — but the
  band floor alone would leave 377px of controls on a 568px screen.]
- [NEEDS CLARIFICATION: is the ~50px third row the intended mobile design for the theme
  picker, or an artefact of `.utility-controls` being a single-column grid at
  ≤47.99rem? If intended, the overlay band must be reworked instead.]
- Family 1's WebKit-specific mechanism (select min-content shrink behaviour) is inferred
  from the trace payload plus the Chromium measurement, not observed in WebKit. A CI run
  of the current `reflow.spec.js` on `mobile-webkit` with the `.sr-only` fix applied
  would settle it in one step.
- Family 3's float precision question belongs to `../e2e-audio-timing-flakes/` and is
  deliberately not investigated here.

## Related Reports

- `../e2e-audio-timing-flakes/` — owns family 3 and the dev-baseline audio failures
- `../deferred-behavior-coverage/` — also concerns recovered-but-red e2e assertions;
  check it before adding another recovery note to the same specs