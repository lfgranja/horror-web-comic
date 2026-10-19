# Bug Assessment: WebKit (Safari) cannot launch on Fedora host (ICU 74 mismatch)

- **Slug**: webkit-fedora-compat
- **Created**: 2026-10-19
- **Source**: pasted text / AGENTS.md + ROADMAP.md (host environment) + preflight output
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

`npm run preflight` fails 2 of 16 checks on this host:

```
[FAIL] playwright-browsers  no Playwright browser executable was found for firefox, webkit
[FAIL] browser-launch       no launch probe was recorded for firefox, webkit
```

Root cause documented in `AGENTS.md` (Environment Gotchas) and `specs/001-cinematic-player/tasks.md`
(T170/T206): Playwright's pinned WebKit build links against `libicu.so.74`, while Fedora 44
ships ICU 77; `npx playwright install-deps` is Debian/Ubuntu-only and cannot close the gap.
Consequence: `mobile-webkit` and `desktop-webkit` projects are unrunnable locally, SC-022
("100% dos navegadores da matriz passam") has no local evidence, and the two browser projects
are skipped in local runs. CI on `ubuntu-latest` installs WebKit via `--with-deps` and passes.

## Symptom

WebKit-based Playwright projects (`mobile-webkit`, `desktop-webkit`) cannot start on this Fedora
host because the pinned WebKit binary requires `libicu.so.74` (ICU 74 ABI) which is absent; the
host ships ICU 77. The expected behavior is that all 5 browser projects launch headless and pass
the matrix locally, matching CI.

## Reproduction

1. Run `npm run preflight` on this Fedora host.
2. Observe `playwright-browsers` and `browser-launch` FAIL for `firefox`/`webkit`.
3. Attempt `npx playwright install --with-deps chromium firefox webkit` — does not resolve
   (Debian/Ubuntu-only installer + ICU 77 vs 74 ABI mismatch).
4. `npx playwright test --project=mobile-webkit` cannot start.

Marked unknowns: whether `firefox` is also genuinely broken or only WebKit — preflight reports
both; AGENTS.md mentions only WebKit/ICU. [NEEDS CLARIFICATION: confirm Firefox failure cause.]

## Suspected Code Paths

- `scripts/preflight.mjs:17` — `browsers: ['chromium', 'firefox', 'webkit']` declares the matrix.
- `scripts/preflight.mjs:180-211` — `browserLaunchEntry()` fails when probes are missing/broken.
- `playwright.config.js:48-54` — declares `mobile-webkit` and `desktop-webkit` projects.
- `.github/workflows/ci.yml:26-27` — CI installs WebKit with `--with-deps` (Ubuntu).
- `AGENTS.md` (Environment Gotchas) — documents the host limitation.

## Root Cause Hypothesis

The root cause is environmental, not a code defect: the pinned Playwright WebKit payload is
built against ICU 74 ABI, and Fedora 44 provides ICU 77 with no compat package installed by
default. Confidence: high. A secondary possibility is that Firefox also lacks system libs on
this host (preflight reports it), which would make the fix broader than ICU alone.

## Proposed Remediation

**Preferred**: Install a compat `libicu74` on the host so the pinned WebKit binary resolves its
ICU 74 dependency, following the documented workaround:

- Fedora: `sudo dnf install libicu74` if available in repos; otherwise extract `libicu74`
  from the Ubuntu 24.04 `.deb` into `~/.local/lib/playwright-compat/icu/` and export
  `LD_LIBRARY_PATH` (per CybLow/playwright-fedora).
- Then re-run `npm run preflight` and confirm both checks PASS.

This keeps the pinned Playwright version unchanged (no drift) and requires no code change.

**Alternatives**:
- Run WebKit tests inside an Ubuntu container (Playwright's supported platform) — heavier,
  but isolates the host difference. Trade-off: adds container orchestration to local dev.
- Provision a remote Ubuntu runner (already used by CI) — no local fix; accept local
  WebKit gap. Trade-off: keeps the preflight failure in place (by design, so an uncertifiable
  matrix fails loudly).

**Files likely to change**:
- None in source (environmental). Optionally `AGENTS.md` to record the compat install steps
  and a `scripts/` helper to set `LD_LIBRARY_PATH`.
- `.specify/bugs/webkit-fedora-compat/fix.md` and `test.md` to record evidence.

**Tests to add or update**:
- Re-run `npm run preflight` (must show 16/16 pass).
- Run `npx playwright test --project=mobile-webkit --project=desktop-webkit` and record results.
- Run full `npm run ci` locally.

## Risks & Considerations

- Installing a foreign-ABI compat library can cause subtle runtime issues if `LD_LIBRARY_PATH`
  leaks into other tools; scope it to the Playwright invocation.
- Fedora package availability for `libicu74` varies by release; the `.deb` extraction fallback
  is more reliable but manual.
- If Firefox is also genuinely broken, the fix must cover both (broader system-deps install).
- Do not weaken the preflight `browser-launch` check — it must keep failing loudly until the
  matrix is truly certifiable (per T206).

## Open Questions

- [NEEDS CLARIFICATION: is Firefox also failing on this host, or only WebKit?]
- [NEEDS CLARIFICATION: is `libicu74` available in the enabled Fedora 44 repos, or is the
  `.deb` extraction required?]
