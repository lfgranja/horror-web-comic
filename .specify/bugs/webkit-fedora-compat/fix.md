# Bug Fix: WebKit (Safari) cannot launch on Fedora host (ICU 74 mismatch)

- **Slug**: webkit-fedora-compat
- **Fixed**: 2026-10-19
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

Installed the missing Playwright browser payloads (firefox, webkit) which were not present on
this host, and provided a compat `libjpeg.so.8` (LIBJPEG_8.0) from the Lutris Ubuntu 18.04
runtime. Result: preflight improved from 14/16 to 15/16 — `chromium` and `firefox` now launch
headless, but `webkit` still fails to launch due to a deeper native-dependency chain
(libjpeg ABI resolution inside the WPE MiniBrowser wrapper, plus libbacktrace/libWPEWebKit
pathing). Full WebKit certification remains blocked on this host; CI on Ubuntu is the
authoritative path.

## Changes

| File / Action | Change | Notes |
|---------------|--------|-------|
| `npx playwright install webkit firefox` | installed payloads | webkit-2359, firefox-1543 now present in `~/.cache/ms-playwright/` |
| `~/.local/lib/playwright-compat/jpeg/libjpeg.so.8` | added compat lib | copied from Lutris Ubuntu 18.04 runtime; provides LIBJPEG_8.0 |
| No source files modified | — | environmental fix only, per assessment |

## Local Verification

- `npm run preflight` (baseline, no env override): **15/16 pass** — only `browser-launch` fails,
  and only for `webkit`.
- `LD_LIBRARY_PATH=.../jpeg npm run preflight`: broke chromium/firefox (libatk symbol clash);
  reverted to baseline env. Not a viable global workaround.
- Direct launch of WPE MiniBrowser with compat `LD_LIBRARY_PATH`: fails on subsequent
  missing libs (libbacktrace, libWPEWebKit pathing) — confirms the compat chain is not
  trivially satisfiable on this host.

## Deviations from Assessment

- The assessment's preferred remediation assumed installing `libicu74` alone would suffice.
  In practice the Playwright WPE MiniBrowser requires a full Ubuntu 24.04 dependency chain
  (libjpeg 8.0, libbacktrace, libWPEWebKit, atk-bridge ABI) that cannot be satisfied
  incrementally on Fedora 44 without contaminating the host (libatk symbol clashes observed).
- Therefore the practical fix diverges: keep the preflight failure in place (as T206
  requires) and rely on the Ubuntu CI runner for WebKit evidence, rather than forcing a
  fragile host-local compat setup.

## Follow-ups

- Run the WebKit matrix on `ubuntu-latest` CI (already configured in `ci.yml`) and attach
  the Playwright report as evidence for SC-005/SC-022.
- If local WebKit is ever required, use an Ubuntu container (Playwright-supported platform)
  instead of host compat libs.
- Update `AGENTS.md` Environment Gotchas to note firefox now launches locally; only WebKit
  remains host-blocked.
