# Bug Verification: Low-quality master frames (childish appearance)

- **Slug**: frames-low-quality
- **Tested**: 2026-10-19
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

All technical gates pass (sanitizer, sidecar digests, build, tests, budgets) and
the four masters now use layered gradients, varied stroke weights, texture and
atmosphere instead of flat rectangles. However, the original symptom is
aesthetic ("looks like a child drawing") and cannot be judged by automated
checks; a human visual review is still required to confirm the new artwork
meets the Alan Moore / Eddie Campbell target. Result downgraded from
"verified" to "partial" per the guardrail.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Sanitizer (post-fix) | `node -e sanitizeSvg` on frame-01..04.svg | pass | All 4 PASS |
| Sidecar digest match | python sha256 vs sidecar | pass | All 4 match, `review.decision: approve` |
| New / updated tests | `npm run test:unit` | pass | 155/155 pass, 0 fail |
| Regression suite | `npm run build` | pass | exit 0, maxFrame 150 997, total 1 548 730 |
| Build images | `npm run build:images` | pass | 4 frame source(s) processed |
| Visual aesthetic review | Manual inspection of SVGs | not-run | Subjective; requires human judgment |
| Lint / type-check | n/a (no linter configured) | skipped | No lint script in package.json |

## Output Excerpts

```
frame-01 PASS
frame-02 PASS
frame-03 PASS
frame-04 PASS

# tests 155
# pass 155
# fail 0

build complete: 13797 compressed script bytes, 3852 compressed style bytes,
raw assets: initial=187355, maxFrame=150997, total=1548730
```

## Residual Risks

- Aesthetic quality is not machine-verifiable; a human must confirm the new
  artwork reads as professional horror-comic art rather than "childish".
- The SVG sanitizer allow-list constrains texture detail; richer illustration
  may require raster masters (PNG/JPG) which would change the pipeline.
- `photocraft-cli`/`designcraft-cli`/`effectcraft-cli`/`figcraft-cli`/
  `soundcraft-cli` are GUI-first and were not exercised; only `vectorcraft-cli`
  contributed to the authoring.

## Recommendation

Hold for human visual review: the technical fix is sound (all gates pass, digests
verified, no regressions), but the original symptom is aesthetic and must be
confirmed by a human before closing the bug. If the review finds the artwork
still insufficient, reopen with `/speckit.bug.assess` and consider raster masters.
