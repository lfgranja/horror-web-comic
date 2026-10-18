# Quickstart: Adoção Local de Ferramentas ArtCraft para Autoria de Ativos

**Created**: 2026-10-17
**Purpose**: Runnable validation scenarios that prove the feature works end-to-end. Implementation details live in `tasks.md` and the implementation phase.

---

## Prerequisites

- Node.js ≥20, npm ≥10, Python ≥3.10, ffmpeg/ffprobe ≥5 (with `aac` + `libopus`)
- ArtCraft suite installed **locally** (e.g. `vectorcraft`, `photocraft`) — **not** required in CI
- `npm ci` then `npx playwright install --with-deps chromium firefox webkit`
- `npm run preflight` passes (except webkit on Fedora — CI-enforced)

---

## Scenario 1: Author a Frame End-to-End (P1)

**Goal**: Author a frame in vectorcraft, export to `media-src/frames/`, run the pipeline, verify it appears in `assets/` without violating budgets.

### Steps

1. **Author** a frame in vectorcraft at **1200×800 px (3:2)**.
2. **Export** to `media-src/frames/frame-01.svg` (or `.png`).
3. **(Optional) Write sidecar** `media-src/frames/frame-01.json` (see `contracts/sidecar.schema.json`):

   ```json
   {
     "schemaVersion": "1.0",
     "subject": {
       "name": "frame-01.svg",
       "digest": { "sha256": "<64-hex-lowercase SHA-256 of master bytes>" }
     },
     "provenance": {
       "tool": "vectorcraft-cli",
       "toolVersion": "0.12.0",
       "timestamp": "2026-10-17T12:00:00Z",
       "author": "Your Name"
     },
     "review": {
       "reviewer": "Your Name",
       "reviewedAt": "2026-10-17T12:05:00Z",
       "oversight": "human_validated",
       "notes": "Side-by-side: 1200x800 SVG, ~22 KB, detailed illustration replacing synthetic fixture. Palette verified: dark horror tones, consistent with scene.",
       "decision": "approve"
     }
   }
   ```

4. **Run the pipeline**:

   ```bash
   npm run validate
   npm run build:images
   npm run build
   ```

5. **Verify** the frame appears in `assets/`:

   ```bash
   ls assets/frames/generated/ | grep frame-01
   # Expect: frame-01-*.avif, frame-01-*.webp, frame-01-*.jpeg (+ -light-* variants)
   ```

6. **Check budgets**:

   ```bash
   npm run report
   # Expect: no budget violations, no unreferenced assets
   ```

### Expected Outcome

- All 3 commands exit 0.
- Frame variants generated at correct dimensions (≤ 2560 px, no upscaling).
- Per-frame budget ≤ 300 000 B (sum of largest AVIF+WebP+JPEG).
- No external references, no unreferenced assets.

---

## Scenario 2: SVG Sanitization Gate (FR-002)

**Goal**: Verify that an SVG master containing dangerous content is rejected (fail-fast).

### Steps

1. Create `media-src/frames/frame-02.svg` containing a `<script>` element (or `on*` handler, `foreignObject`, external `href`, DOCTYPE, etc.).
2. Run:

   ```bash
   npm run build:images
   ```

### Expected Outcome

- **Build fails** (non-zero exit) with a sanitization error naming the frame.
- No variants generated for frame-02.
- The error message identifies the rejected content type.
- A master exceeding a **DoS cap** (ver `SVG_DOS_CAPS` em `scripts/svg-sanitize.mjs`) is also rejected (fail-fast), naming the frame.

---

## Scenario 3: Sidecar Digest Verification (FR-008/FR-013)

**Goal**: Verify that a sidecar with a mismatched digest is rejected (fail-fast).

### Steps

1. Author `media-src/frames/frame-03.svg` and compute its real SHA-256.
2. Write sidecar `media-src/frames/frame-03.json` with a **wrong** `subject.digest.sha256`.
3. Run:

   ```bash
   npm run build:images
   ```

### Expected Outcome

- **Build fails** with a digest mismatch error.
- Now fix the sidecar with the correct digest and re-run → **build passes**.
- **Orphan sidecar**: create `media-src/frames/frame-99.json` with no matching master → `npm run build:images` **fails** with an `orphan-sidecar` error (bidirectional referential integrity; ver FR-008/FR-013).

---

## Scenario 4: Tier B Delivery-Fidelity Gate (FR-007 / SC-007a — thresholds centralizados em `scripts/delivery-fidelity.mjs`)

**Goal**: Verify that generated variants meet SSIM ≥ 0.95 (standard) / ≥ 0.90 (light).

### Steps

1. Author a valid master and run `npm run build:images`.
2. The Tier B gate runs automatically after `ensureImage()` for each variant.
3. If a standard variant falls below SSIM 0.95, the build **fails** naming the frame.
4. If a light variant falls below SSIM 0.90, the build **warns** (does not fail).

### Expected Outcome

- Normal masters pass silently.
- Deliberately corrupted masters trigger the appropriate fail/warn behavior.
- Achieved SSIM/PSNR is reported per frame when byte budget forces quality down.

---

## Scenario 5: Commit Trailer & Tier A Review Enforcement (FR-007/FR-008)

**Goal**: Verify that commits touching `media-src/` require trailers and review block.

### Steps

1. Author a master, write sidecar with `review` block (`decision: approve`).
2. Commit with trailers:

   ```bash
   git add media-src/frames/frame-01.svg media-src/frames/frame-01.json
   git commit -m "feat(frames): author frame-01 with vectorcraft

   Authored-With: vectorcraft-cli 0.12.0
   Reviewed-By: Your Name"
   ```

3. Push and verify CI passes (the new `fetch-depth: 0` step validates trailers + review).
4. Try committing **without** trailers → CI step **fails** (fail-closed).

### Expected Outcome

- Commit with complete trailers + review → CI passes.
- Commit missing any of `Authored-With`, `Reviewed-By`, or `review` block → CI fails.

---

## Scenario 6: Full CI Without ArtCraft Installed (FR-004/SC-005)

**Goal**: Verify that `npm run ci` passes without the ArtCraft suite installed.

### Steps

1. Ensure ArtCraft binaries are **not** on PATH (or use a clean environment).
2. Run:

   ```bash
   npm run ci
   ```

### Expected Outcome

- All gates pass (preflight, validate, test:unit, build:images, build, test:e2e, test:perf).
- No ArtCraft binary is invoked or required.
- Exit 0.

---

## Scenario 7: All 4 Frames Authored (SC-001)

**Goal**: Verify the end state — all 4 frames authored, no synthetic fixtures remain.

### Steps

1. Author all 4 frames (frame-01…frame-04) at 1200×800 px.
2. Run:

   ```bash
   npm run validate && npm run build:images && npm run build
   ```

3. Verify no synthetic fixtures remain:

   ```bash
   ls media-src/frames/
   # Expect: frame-01.svg, frame-02.svg, frame-03.svg, frame-04.svg (+ sidecars .json)
   ```

4. Run full CI:

   ```bash
   npm run ci
   ```

### Expected Outcome

- Build exits 0.
- All 4 frames are authored masters.
- Full CI passes without regression.
- Palette/tonal-range documented in each master's Tier A review notes.

---

## Scenario 8: Budget Preservation (SC-002)

**Verify**: Per-frame budget ≤ 300 000 B and total assets ≤ 30 000 000 B.

```bash
npm run report
# Check: no budget violations
```

---

## Scenario 9: Promotional Art Outside Pipeline (FR-008)

**Goal**: Verify that promotional art in `marketing/` is not picked up by the build.

### Steps

1. Export a designcraft promotional image to `marketing/promo-01.png`.
2. Run:

   ```bash
   npm run build:images
   npm run build
   ```

### Expected Outcome

- `marketing/promo-01.png` is **not** processed by `build:images`.
- It does **not** appear in `assets/` or `dist/`.
- It is **not** counted in `budget.json`.
- No manifest reference is created.

---

## Scenario 10: Atomic Write Recovery (FR-013)

**Goal**: Verify that an interrupted build never leaves partial output.

### Steps

1. Start `npm run build:images`.
2. Interrupt it mid-run (Ctrl+C).
3. Re-run:

   ```bash
   npm run build:images
   ```

### Expected Outcome

- Re-run completes successfully.
- No partial/corrupted variants in `assets/`.
- The `ensureImage` "failed validation and must not be overwritten" throw remains as a safety net (not the expected recovery path).

---

## Scenario 11: High-DPR Coverage (FR-009)

**Goal**: Verify delivery quality on high-DPR (≥2×) desktops, where the browser upscales the largest delivered width (1200w).

### Steps

1. Author all 4 frames and run the pipeline.
2. Open the comic in a browser emulated at `deviceScaleFactor: 2` (Playwright).
3. Inspect the `srcset` candidates selected for the current viewport.

### Expected Outcome

- The manifest srcset lists only fillable widths (320–1200w for 1200 px masters); no dead entries.
- At DPR≥2 the browser selects/upscales the 1200w candidate; the rendered frame is legible and no broken-image state occurs.
- The DPR>1 check is part of the test matrix (added coverage).

---

## Reference

- Data model: [`data-model.md`](./data-model.md)
- Sidecar schema: [`contracts/sidecar.schema.json`](./contracts/sidecar.schema.json)
- Research decisions: [`research.md`](./research.md)
- Feature spec: [`spec.md`](./spec.md)
