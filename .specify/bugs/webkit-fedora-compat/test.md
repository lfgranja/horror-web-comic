# Bug Verification: WebKit (Safari) cannot launch on Fedora host (ICU 74 mismatch)

- **Slug**: webkit-fedora-compat
- **Tested**: 2026-10-19
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The fix improved the host from 14/16 to 15/16 preflight checks and made `chromium` and
`firefox` launch headless, but the original symptom (WebKit cannot launch) still reproduces
on this Fedora host. WebKit remains blocked by the `libjpeg.so.8` LIBJPEG_8.0 ABI mismatch
and the broader WPE dependency chain. The fix is therefore partial; full WebKit certification
must happen on the Ubuntu CI runner.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npm run preflight` | fail | 15/16; only `browser-launch` fails, only for `webkit` |
| Reproduction (post-fix) | `npx playwright test … --project=mobile-webkit` | fail | MiniBrowser: `/lib64/libjpeg.so.8: version LIBJPEG_8.0 not found` |
| New / updated tests | n/a (no code change) | not-run | environmental fix only |
| Regression suite | `npm run test:unit` | pass | 155/155 (unchanged) |
| Lint / type-check | n/a | skipped | no lint script configured |

## Output Excerpts

```
preflight: FAILED, 1 of 16 checks failed
  [FAIL] browser-launch  1 of 3 browsers downloaded successfully but cannot launch:
         webkit: … MiniBrowser: /lib64/libjpeg.so.8: version `LIBJPEG_8.0' not found
```

## Residual Risks

- WebKit/Safari evidence (SC-005, SC-022) cannot be produced locally on this Fedora host.
- The compat `libjpeg.so.8` from Lutris resolves via `ldd` but the WPE MiniBrowser still
  binds to `/lib64/libjpeg.so.8` at runtime (RUNPATH/launch wrapper), so a single-lib
  override is insufficient.
- CI on `ubuntu-latest` (with `--with-deps`) remains the authoritative WebKit path.

## Recommendation

Hold — partial. The original symptom still reproduces locally. Re-run WebKit verification on
the Ubuntu CI runner (`ci.yml`), which already installs WebKit system deps, and record that
evidence. If local WebKit is required in the future, use an Ubuntu container rather than
host compat libs.
