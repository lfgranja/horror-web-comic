# Bug Fix: Published media variants cannot be reproduced from source

- **Slug**: media-masters-unreproducible
- **Fixed**: 2026-09-27
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Masters now live in a dedicated source tree (`media-src/`) instead of the publishable
tree, so `npm run build:images` discovers them and `assets/` stays purely
publishable. This satisfies both the T207 guard and the pre-existing delivery
contract, which were mutually exclusive while masters sat in `assets/`. All 119 unit
tests pass and every budget in `budget.json` is satisfied.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `media-src/frames/frame-01.jpg` … `frame-04.jpg` | added | 1200×800, promoted from the existing base candidates (22.8–27.7 KB each) |
| `media-src/audio/scene-01.wav`, `scene-02.wav`, `frame-03.wav` | added | 770,126 B each, decoded from the committed `.aac` via ffmpeg (48 kHz mono PCM s16le, 8.02 s) |
| `scripts/build-images.mjs` | modified | decoupled the read root (`media-src/`) from the write root (`assets/`); `mkdir -p` on the source dirs so a missing tree no longer throws ENOENT; T207 message repointed |
| `tests/unit/delivery.test.js` | modified | 2 fixture trees + 1 comment repointed to `media-src/`; the no-masters assertion regex now expects `media-src/` |
| `tests/unit/media-generation.test.js` | modified | mislabeled-AVIF fixture source repointed to `media-src/frames/frame.svg` |
| `docs/delivery.md` | modified | T207 paths; documents the two-tree contract and the synthetic-fixture caveat |
| `AGENTS.md` | modified | "Add a frame" now targets `media-src/frames/`; `media-src/` added to File Layout |
| `assets/**` (126 files) | modified | regenerated from the masters — byte-level churn, as predicted |

## Diff Highlights

`generatedDirectory` was previously *derived* from `sourceDirectory`, which is what
made the split non-obvious:

```js
// before — one path served as both input and output
const sourceDirectory   = path.join(root, 'assets/frames');
const generatedDirectory = path.join(sourceDirectory, 'generated');
const audioDirectory    = path.join(root, 'assets/audio');   // read AND write

// after — read root and write root are independent
const frameSourceDirectory  = path.join(root, 'media-src/frames');
const generatedDirectory    = path.join(root, 'assets/frames/generated');
const audioSourceDirectory  = path.join(root, 'media-src/audio');
const audioPublishDirectory = path.join(root, 'assets/audio');
```

## Tests Added or Updated

- `tests/unit/delivery.test.js::media build discovers the committed masters` —
  asserts the *counts* the build reports, so deleting a master fails here instead of
  silently producing a smaller tree
- `tests/unit/delivery.test.js::media build fails loudly when it has no master
  sources` — the T207 signal, now exercised against a fixture tree, since the
  repository itself legitimately succeeds
- No new test files; 3 existing fixtures repointed

## Local Verification

- `npm run build:images` → **PASS**, exit 0,
  `processed 4 frame source(s) and 3 audio source(s)`. A second run produced **zero
  further churn** (still exactly 126 modified files), confirming the pipeline is
  deterministic
- `npm run build` → **PASS**, `13171 compressed script bytes, 3192 compressed style
  bytes, raw assets: initial=187355, maxFrame=160252, total=1515886` — every budget
  satisfied
- `npm run test:unit` → **PASS**, `119 tests, 119 pass, 0 fail`
- `npm run preflight` → **FAIL, 1 of 15**: `browser-launch` cannot start webkit
  locally (`libicudata.so.74` missing). Pre-existing environment gap, unrelated to
  this change; fix is `sudo npx playwright install-deps`. The other 14 checks pass
- Invariant checks: no `.wav` under `assets/`; no `.svg`/`.wav` masters under
  `assets/`; `findUnreferencedAssets()` returns `[]`; `media-src/` absent from
  `dist/` (1.8 MB)

Not run: `npm run test:e2e` / `test:perf`, blocked by the webkit launch failure
above. The 3 previously-masked e2e failures therefore remain unverified.

## Deviations from Assessment

Two, both forced by evidence.

**1. The assessment's preferred remediation was wrong.** It proposed committing
masters under `assets/frames/` and `assets/audio/`. That breaks two pre-existing
tests, because the T207 guard requires masters exactly where the delivery contract
forbids them:

- `media-generation.test.js:194` asserts `findUnreferencedAssets(...)` returns `[]`
- `media-generation.test.js:126` asserts no `.wav` exists under `assets/audio/`

The two requirements are mutually exclusive. Resolved by the *corrected* proposal:
move masters to `media-src/` and leave `assets/` publishable-only. No carve-out was
needed because `findUnreferencedAssets` and `copyPublishableFiles` both scan only
`assets/`, and `PUBLISHABLE_ROOTS` is `['src', 'assets']`.

**2. `tests/unit/delivery.test.js` needed one more edit than scoped.** The plan listed
the fixture `mkdir` calls and the comment. The no-masters test also asserted the
error message names `assets/frames|assets/audio`; repointing the guard to
`media-src/` made that regex stale and it failed until updated. Caught by the test
itself, which is the behaviour the T207 assertion exists to provide.

Scope note: `specs/001-cinematic-player/tasks.md` (T001, T010) still records that
`assets/frames/` and `assets/audio/` were created. Left untouched by decision — they
are checked-off historical records, and the new layout is documented in
`docs/delivery.md` and `AGENTS.md` instead.

## Follow-ups

- **Commit and open a PR.** Nothing is committed. The `dev-pr-only` ruleset requires
  1 approving review and the sole collaborator is the PR author, so a PR would need
  another `--admin` bypass — the thing worth not repeating silently.
- **Fix the local webkit gap** (`sudo npx playwright install-deps`) so the e2e and
  perf halves of the gate can run, then confirm the 3 previously-masked failures
  (`pause`, `focus-loss`, `audio-timing`) are the only ones left.
- **Pre-existing:** `npm run preflight` must pass before committing per repo
  convention. It currently does not, on the browser-launch check alone.
- The shipped frames are synthetic 1200×800 fixtures promoted to master status, and
  the three audio masters are byte-identical (one clip repeated). A green media
  build certifies the pipeline reproduces its own fixtures, not that real artwork is
  reproducible. Recorded in `docs/delivery.md`; revisit if real artwork is ever
  commissioned.
- Media masters total 2.4 MB in-repo (1.1 MB frames + 2.3 MB WAV). Well inside the
  30 MB `totalAssetsBytes` budget, and they do not ship, but they are worth a
  `.gitattributes` or LFS decision if the artwork grows.
