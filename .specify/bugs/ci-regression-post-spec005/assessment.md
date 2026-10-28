# Bug Assessment: CI regression after spec 005 merge

- **Slug**: ci-regression-post-spec005
- **Created**: 2026-10-28
- **Source**: pasted text (ci run output + investigation)
- **Verdict**: valid (partially fixed)
- **Severity**: high

## Report (verbatim or summarized)

E2E e perf ainda tem 12 falhas residuais que exigem investigacao adicional (focus management do overlay bloqueado e SC-018). O npm run ci nao esta verde ainda. Proximo passo: investigar as 2 falhas de foco e as 10 de SC-018 (provavelmente relacionadas ao overlay de consentimento/audio bloqueado).

## Symptom

After merging spec 005 (Korean horror mechanics) into dev, npm run ci fails:
- E2E: 2 failures in tests/e2e/accessibility.spec.js (Estados 1 and 3) - #continue-silent not focused.
- Perf: 10 failures in tests/perf/fps.spec.js (SC-018) - result.durationMs is 0.

Expected: all 1325 E2E and perf tests pass.

## Reproduction

1. git checkout dev (post-merge)
2. npm run ci
3. Observe E2E failures in accessibility Estados 1/3 and perf SC-018.

## Suspected Code Paths

- src/scripts/main.js - spec 005 refactor dropped player.schedule() (restored in PR #146).
- index.html / alojamento.html - spec 005 removed #audio-toggle (restored in PR #145) and placed overlays inside #player (fixed in PR #147).
- src/scripts/main.js:113-127 - blocking sensory consent dialog (bypassed for webdriver in PR #145).
- src/scripts/audio.js:467-488 - showBlocked() focuses #continue-silent; now works after overlay move.
- tests/perf/fps.spec.js:226 - SC-018 measures transition duration; receives 0ms.

## Root Cause Hypothesis

Multiple regressions from spec 005 merge:

1. Missing player.schedule() (high confidence) - fixed.
2. Missing #audio-toggle (high confidence) - fixed.
3. Overlays inside #player (high confidence) - fixed.
4. Blocking sensory dialog (high confidence) - fixed via webdriver bypass.
5. SC-018 durationMs = 0 (medium confidence) - residual. Possibly transition CSS not applied or measureTransition fires before transition starts.

## Proposed Remediation

Preferred: Investigate SC-018 durationMs=0 by checking whether player.schedule() triggers frame-01 to frame-02 transition, whether transition CSS is applied to #frame-stage/#frame-image, and whether openPlayer({pause:true}) pauses before transition can be measured.

Files likely to change:
- src/scripts/player.js
- tests/perf/fps.spec.js
- src/styles/player.css

## Risks and Considerations

- webdriver bypass only covers Playwright.
- Moving overlays outside #player changes DOM structure.
- SC-018 failure may be flaky/environmental (GPU compositing).

## Open Questions

- [NEEDS CLARIFICATION: Is SC-018 durationMs=0 a regression from spec 005 or pre-existing flakiness?]
- [NEEDS CLARIFICATION: Does the sensory dialog (even when hidden) affect layout/transition timing?]
