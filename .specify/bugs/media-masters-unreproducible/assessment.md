# Bug Assessment: Published media variants cannot be reproduced from source

- **Slug**: media-masters-unreproducible
- **Created**: 2026-09-27
- **Source**: pasted text (CI gate output on dev @ e7c8941)
- **Verdict**: valid
- **Severity**: high

> **Note on provenance**: this assessment was drafted during `/speckit.bug.assess`
> but could not be written to disk at that time. It was materialised during
> `/speckit.bug.fix`, and the "Delivery Contract Conflict" section below was added
> after the proposed remediation was attempted and failed. The original proposal
> was wrong on a material point; see `fix.md` → *Deviations from Assessment*.

## Report (verbatim or summarized)

`npm run build:images` fails on dev at e7c8941 with:

```
Error: buildImages found no frame or audio master sources: expected image
masters in assets/frames/*.svg|png|jpe?g and audio masters in assets/audio/*.wav.
Refusing to report success while the published variants are unreproducible.
```

The repository ships 120 derived frame candidates and 6 encoded audio files but
no master sources, so none of them can be regenerated.

## Symptom

`npm run build:images` exits 1, blocking CI step 4 of 7. Expected: the media
build reproduces the published variants from committed masters. Actual: the
T207 guard fires because the repository contains no masters, so `build`,
`test:e2e`, `test:perf` and `lhci` are unreachable and nothing on dev can be
verified.

## Reproduction

1. `git checkout dev` (e7c8941)
2. `npm ci`
3. `npm run build:images`
4. Observe the throw; exit code 1

Also reproducible in CI as the `Build media variants` step of the `gate` job.

## Suspected Code Paths

- `scripts/build-images.mjs:226-232` — the T207 guard; throws when
  `files.length === 0 && audioFiles.length === 0`
- `scripts/build-images.mjs:178-180` — non-recursive `readdir` + `entry.isFile()`
  cannot see the `generated/` subdirectory, so no candidate is mistaken for a master
- `scripts/build-images.mjs:211` — audio discovery filters `.wav` only
- `tests/unit/delivery.test.js:28-45` — asserted the build MUST fail here (T207)
- `.github/workflows/ci.yml:48-49` — the failing CI step

## Root Cause Hypothesis

The guard is correct and deliberately installed; the repository state is the
defect. Masters have never existed in this repository.

Confidence: high. Verified exhaustively:

- All 296 commits reachable from every local ref contain **zero** `.svg`/`.wav`/`.png`
  under `assets/`
- No stash, no tags, no dangling objects; 942 reflog entries all resolve to live commits
- All 10 PRs merged, none closed unmerged, so no orphan refs; no releases or release assets
- The published variants were committed directly by `bcdf982` / `f96995a` / `bcd4e6e`
  ("add the AVIF/WebP/JPEG frame rasters") — the pipeline never produced them
- The frames are 1200×800, ~22.8 KB JPEG (≈0.19 bits/pixel), dark blue gradients with
  stddev 24–47: synthetic placeholders, not comic artwork. The original 1920/2560
  candidates (5.6/7.2 KB AVIF) were upscaled, exactly what T217 removed
- All three committed `.aac` files are byte-identical (115,187 B): one clip, repeated

There is no original artwork to recover. The published frames *are* fixtures.

## Delivery Contract Conflict (discovered during remediation)

The proposed fix — commit masters under `assets/frames/` and `assets/audio/` —
**violates a pre-existing delivery invariant.** `build-images.mjs` requires masters
at exactly the paths the delivery pipeline forbids:

| Invariant | Enforced by | Says |
|---|---|---|
| Masters must be discoverable | `scripts/build-images.mjs:178,211` | `assets/frames/*.{svg,png,jpg}`, `assets/audio/*.wav` |
| No unreferenced assets in `assets/` | `tests/unit/media-generation.test.js:194` via `findUnreferencedAssets` | `assert.deepEqual(unreferenced, [])` |
| No uncompressed audio published | `tests/unit/media-generation.test.js:126` | `assert.doesNotMatch(file, /\.wav$/i)` |
| Only delivery codecs/bitrates | `tests/unit/media-generation.test.js:142-145` | aac 96000–128000, opus 48000–64000 |

These are mutually exclusive. Committing masters where the guard can see them puts
them in the publishable tree, where the build refuses to ship anything the manifest
does not reference. This contradiction predates the merge and is **not** a
consequence of any of the merged PRs.

Notably, `media-generation.test.js:176-186` shows the original design intent: a
frame master `assets/frames/frame.svg` was expected to be *manifest-referenced* so
it would itself be publishable. That path was never taken.

## Proposed Remediation

**Preferred — separate the source tree from the publishable tree.** Move masters
out of `assets/` entirely (`media-src/frames/`, `media-src/audio/`) and point
`build-images.mjs` at that tree while continuing to write all derived output into
`assets/frames/generated/` and `assets/audio/`. This satisfies both invariants:
masters are discoverable, and everything under `assets/` stays
manifest-referenced and delivery-compliant. `findUnreferencedAssets` and
`copyPublishableFiles` both scan only `assets/`, and `PUBLISHABLE_ROOTS` is
`['src', 'assets']`, so no exclusion carve-out is needed and `media-src/` never
ships. Requires updating the T207 guard message and `docs/delivery.md`.

> **RESOLVED 2026-09-27** — implemented exactly as described here. `build:images` and
> `build` pass, all 119 unit tests pass, and both invariants hold. See `./fix.md`.

**Alternatives:**
- *Exclude masters from the delivery scan* — add a masters allowlist to
  `findUnreferencedAssets` and to the placeholder test. Smallest diff, but weakens
  the "only publishable assets" invariant with an exception, and risks masters
  shipping if the exclusion is wrong.
- *Revert to declaring provenance* — the media is externally authored and the build
  should stop claiming otherwise. Requires a schema contract change
  (`additionalProperties: false`) plus `story-loader.js`, `validate-manifest.mjs`,
  `compatibility-report.mjs` and tests. Largest, but keeps the signal honest and
  discards no artwork.

**Files likely to change** (preferred path):
- `media-src/frames/frame-0{1..4}.jpg` (moved from `assets/frames/`)
- `media-src/audio/{scene-01,scene-02,frame-03}.wav` (moved from `assets/audio/`)
- `scripts/build-images.mjs` — `sourceDirectory` / `audioDirectory` inputs
- `scripts/build-images.mjs:220-231` — T207 guard message
- `docs/delivery.md` — documented media layout
- `tests/unit/delivery.test.js:28-45` — invert to expect success, keep the
  no-masters case on a fixture tree

**Tests to add or update:**
- Assert the master build discovers a non-zero count of sources (already drafted
  in `fix.md`), so deleting a master fails loudly
- Keep the no-masters failure case covered against a fixture tree
- Add a test that masters are absent from the publishable tree, so the two
  invariants cannot silently start fighting again

## Risks & Considerations

- WAV masters add ~2.4 MB to the repository; well inside the 30 MB
  `totalAssetsBytes` budget
- Regenerating from promoted masters produces byte-different AVIF/WebP output:
  126 files churned in the attempted fix
- Audio masters must be produced by decoding the committed `.aac` back to PCM — a
  genuine second lossy generation
- Relocating masters is a visible layout change referenced by the spec and
  `docs/delivery.md`; any hardcoded `assets/frames/*.svg` path in the docs or
  schema needs review
- The frames are synthetic fixtures. Any green build after this fix certifies that
  the pipeline reproduces its own test fixtures, not that the delivery media is
  reproducible. That limitation should be stated in `docs/delivery.md`.

## Open Questions

- [NEEDS CLARIFICATION: is relocating the source tree out of `assets/` acceptable,
  or is the publishable tree contract the one that should move? This is a design
  decision, not a bug fix.]
- [NEEDS CLARIFICATION: the 3 e2e failures (`pause`, `focus-loss`, `audio-timing`)
  remain masked by this break. Separate assessment wanted once the media build is
  green?]
- Was the manifest ever intended to reference frame masters directly, as
  `media-generation.test.js:176-186` implies? If so, the current
  "everything in assets/ is publishable" model may be the thing that is wrong.
