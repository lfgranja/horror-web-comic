# Bug Assessment: webkit-layout-gate end-overlay intercepts navigation controls (run 41390164478)

- **Slug**: webkit-layout-gate-end-overlay-intercept-41390164478
- **Created**: 2026-11-02
- **Source**: https://github.com/lfgranja/horror-web-comic/actions/runs/41390164478/job/125099577894 (pasted failure)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

webkit-layout-gate failed. Tests report: end overlay intercepts navigation controls home, previous-scene, previous-frame. Failures on mobile-webkit and desktop-webkit at 320x568.

## Symptom

At end state on narrow WebKit viewports, the end overlay is intercepting clicks intended for navigation controls (home, previous-scene, previous-frame). The test expects covered array to be empty.

## Reproduction

1. Run `tests/e2e/zz-end-state-coverage.spec.js` on mobile-webkit/desktop-webkit at 320x568
2. Navigate to end state
3. Overlay incorrectly covers/blocks nav controls

## Suspected Code Paths

- `tests/e2e/zz-end-state-coverage.spec.js` — checks overlay doesn't intercept nav controls
- `src/styles/player.css` — end overlay positioning/pointer events/coverage
- `src/scripts/player.js` — showEndOverlay/focusOverlay
- `index.html`, `alojamento.html` — end overlay and control bar structure

## Root Cause Hypothesis

**Confidence: high.** End overlay is too large/tall or has incorrect pointer-events/positioning causing it to intercept clicks on nav controls underneath in WebKit. Our recent changes added more buttons/links to end overlay and adjusted styling; may have increased overlay coverage.

## Proposed Remediation

**Preferred**: Ensure end overlay only covers the band above control bar and has pointer-events properly managed; nav controls must remain clickable. Tighten end overlay bottom calculation and ensure it doesn't extend over control bar area.

**Files likely to change**:
- `src/styles/player.css`

**Tests to add or update**:
- Existing test should pass

## Risks & Considerations

- WebKit-specific behavior
- Must not regress other browsers

## Open Questions

- [NEEDS CLARIFICATION: Exact coverage area from trace]

## Next Suggested Step

`/speckit.bug.fix slug=webkit-layout-gate-end-overlay-intercept-41390164478`
