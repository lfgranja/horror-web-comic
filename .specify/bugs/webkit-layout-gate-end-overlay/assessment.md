# Bug Assessment: webkit-layout-gate end-overlay layout issues on mobile-webkit

- **Slug**: webkit-layout-gate-end-overlay
- **Created**: 2026-10-28
- **Source**: pasted text (CI failure report)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

CI failing on `webkit-layout-gate` due to `tests/e2e/zz-end-state-coverage.spec.js` on `mobile-webkit` (and affecting the gate). Failures observed:
- `"Rever do início" sits outside the end-overlay band {"top":0,"bottom":68} at {"top":36,"bottom":81} — the card scrolled its own action out of reach` (button not geometrically inside the reserved band)
- Control bar height budget exceeded: `control bar is 452px (80% of the viewport, theme label 1px wide) at 320x568` (expected <= 380px)

## Symptom

On narrow viewports (320x568, 360x800) in WebKit, the control bar grows tall (wrapping to 4 utility rows), starving the end-overlay band above it. The end card scrolls internally and its primary action (`#replay` "Rever do início") ends up outside the band reserved above the control bar, making it unreachable / failing the geometric containment check. The control bar also exceeds its height budget (452px vs 380px max).

## Reproduction

1. Open player at viewport 320x568 (or 360x800)
2. Navigate to end state (`#end` click)
3. Observe `#end-overlay` visible
4. Check hit-testing: `#replay` button not inside the reserved band above control bar
5. Measure `.control-bar` height → exceeds 380px budget

(Verified locally after adding compact styles: control bar reduced to ~346px; tests pass on mobile-chromium.)

## Suspected Code Paths

- `tests/e2e/zz-end-state-coverage.spec.js:16-118` — asserts band containment and control bar height budget (380px max at 320x568/360x800)
- `src/styles/player.css:359-400` — `#end-overlay` band calculation using `bottom: max(4.5rem, calc(100dvh - var(--control-bar-top, 100dvh)))` and card scroll/`position: sticky` for `#replay`
- `src/styles/player.css:165-180, 528-535, 561-620` — `.control-bar` flex-wrap behavior; media queries affecting height/padding
- `index.html:53-81` / `alojamento.html` — control bar structure (7 primary buttons + 6 utility controls wrapping into multiple rows at narrow widths)
- `src/scripts/player.js` — `publishControlBarHeight()` updates `--control-bar-top` on showEndOverlay/resize/scroll

## Root Cause Hypothesis

**Confidence: high.** At narrow widths, `.control-bar` wraps into multiple rows (primary controls + 4 utility rows: volume, audio toggle, speed, theme + FX/catalog). The control bar becomes very tall (~452px) on 320x568, leaving insufficient vertical space above it for the end card band. The band calculation depends on `--control-bar-top` (bar's viewport top), but when the bar is tall/wrapped and the page can scroll, the reserved band becomes too short and the scrollable end card pushes `#replay` below the band. The theme label being sr-only (1px width) doesn't help; the issue is row count/height.

This appears pre-existing/unrelated to spec 005 T032-T038 changes (which touched storage/main/player/audio). The fix requires CSS adjustments to make the control bar more compact at narrow widths or adjust the height budget/band logic.

## Proposed Remediation

**Preferred**: Add a compact layout for `.control-bar` at small widths (e.g., `max-width: 360px`) to reduce padding/gaps/min-heights and allow tighter wrapping, ensuring bar height stays under budget. Also ensure the end-overlay band has sufficient floor and the card can scroll properly.

**Files likely to change**:
- `src/styles/player.css` (add/adjust media query for compact control bar at 320-360px)
- Possibly `tests/e2e/zz-end-state-coverage.spec.js` if budget needs adjustment (but test defines the contract; prefer fixing layout)

**Tests to add or update**:
- Existing `zz-end-state-coverage.spec.js` tests should pass after fix (already verified locally with compact styles)

## Risks & Considerations

- Changing control bar layout affects all viewports; need to ensure no regression on larger screens
- WebKit-specific behavior may differ slightly; CI runs on ubuntu-latest
- The test enforces a strict height budget (380px) and band containment - both must be satisfied

## Open Questions

- [NEEDS CLARIFICATION: Is the height budget (380px) fixed by design or can it be adjusted?]
- [NEEDS CLARIFICATION: Should we prefer compacting controls or adjusting the band calculation?]

## Next Suggested Step

`/speckit.bug.fix slug=webkit-layout-gate-end-overlay`
