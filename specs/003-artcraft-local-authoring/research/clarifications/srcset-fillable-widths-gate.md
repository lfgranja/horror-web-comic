# Research: srcset Fillable Widths Gate

**Date:** 2026-10-17
**Context:** FR-003 requires the manifest srcset to list only widths the master can actually fill (320–1200w for 1200 px masters). The build silently skips widths above the master's intrinsic width (`scripts/build-images.mjs:236,243`), but no FR-013 gate validates the manifest srcset widths against the master width.
**Question:** Should "manifest srcset lists only fillable widths" be enforced by a build-time gate, or is validation + authoring guidance sufficient?

---

## 1. Direct Answer / Recommendation

**A build-time gate is the correct enforcement point, and it should be a hard gate (build fails) for images that have a natural width.**

The WHATWG HTML Standard makes this a conformance requirement (MUST), not a best practice. The build already has all the information needed to validate (master width, manifest srcset widths), and authors may not run conformance checkers. Authoring guidance alone is insufficient because:

1. The spec requirement is a MUST, not a SHOULD — non-conforming markup is simply invalid HTML.
2. The build is the only place that has both the manifest and the master dimensions at the same time.
3. Conformance checkers like RespImageLint exist but are not widely used and are not in the critical path.

**Recommended enforcement:** Add a validation step in `scripts/validate-manifest.mjs` (or `scripts/build-images.mjs`) that compares each manifest srcset width against the master intrinsic width. If any srcset width exceeds the master width, the build fails with a clear error message naming the offending frame and the invalid width.

---

## 2. Key Findings with Citations

### 2.1 WHATWG HTML Standard — MUST match natural width

> "The specified width in an image candidate string's width descriptor must match the natural width in the resource given by the image candidate string's URL, if it has a natural width."

— [WHATWG HTML Standard, §4.8.4.2.1 Srcset attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)

This is a **conformance requirement** for HTML documents. A srcset with a `w` descriptor that does not match the image's natural width produces non-conforming markup. The spec uses "must" (RFC 2119 MUST), not "should" or "may."

### 2.2 W3C HTML 5.2 — Same requirement

> "The specified width in an image candidate string's width descriptor must match the intrinsic width in the resource given by the image candidate string's URL, if it has an intrinsic width."

— [W3C HTML 5.2 Recommendation, §4.7.4.2.1 Srcset attributes](https://www.w3.org/TR/2017/REC-html52-20171214/semantics-embedded-content.html)

The W3C Recommendation (the version most validators implement) has the identical requirement.

### 2.3 Why non-matching w descriptors are a problem — browser source selection

The WHATWG spec defines how browsers select which image to load from a srcset. The algorithm converts `w` descriptors to pixel densities by dividing by the `sizes` source size:

> "For each image source in source set: If the image source has a width descriptor, set the image source's pixel density descriptor to the result of dividing the width descriptor value by the source size."

— [WHATWG HTML Standard, §4.8.4.3.12 Normalizing the source densities](https://html.spec.whatwg.org/multipage/images.html#normalizing-the-source-densities)

If the `w` descriptor is wrong (e.g., says 1200w but the image is only 600px wide), the browser computes an incorrect pixel density and selects the wrong image. This leads to:

- **Oversized images on small screens** — a browser may select a larger image than needed because the density calculation is skewed.
- **Undersized images on large screens** — a browser may select a smaller image than needed.
- **Unexpected upscaling** — the density-corrected natural width may exceed the actual pixel dimensions, causing the browser to render the image larger than its physical resolution (see [WHATWG issue #11428](https://github.com/whatwg/html/issues/11428)).

### 2.4 WHATWG issue #11428 — Real-world impact of mismatched w descriptors

This open issue documents how browsers handle `srcset` with `w` descriptors that don't match natural widths. Key findings:

- **Firefox and Safari** follow the spec strictly and upscale images to the density-corrected intrinsic size, even when `object-fit: none` or `scale-down` is set.
- **Chrome** prevents upscaling in some cases but is "technically not compliant with the current spec."
- The issue confirms that mismatched `w` descriptors lead to **inconsistent, unpredictable rendering** across browsers.

— [whatwg/html#11428: Responsive images with srcset unexpectedly upscale](https://github.com/whatwg/html/issues/11428)

### 2.5 RespImageLint — Conformance checker approach

[RespImageLint](https://github.com/ausi/respimagelint) is a bookmarklet-based linter that checks responsive images against common mistakes and best practices. It validates that `w` descriptors match actual image dimensions. This is a **post-hoc conformance checker**, not a build-time gate. It requires manual invocation and is not in the authoring critical path.

### 2.6 web.dev — Authoring guidance

[web.dev's responsive images guide](https://web.dev/learn/design/responsive-images) provides authoring guidance:

> "If you're using the width descriptor, you must also use the `sizes` attribute to give the browser more information."

web.dev teaches authors to use `srcset` correctly but does not enforce correctness. It assumes authors will follow the guidance — which is exactly the assumption that FR-003's "fillable widths" requirement challenges.

### 2.7 DebugBear — Performance impact

> "An invalid `srcset`/`sizes` combination can result in oversized images being downloaded on small screens (wasting bandwidth) or undersized images on large screens (reducing visual quality)."

> "Broken image selection: Browsers rely on the `sizes` attribute to calculate which `w`-described image best fits the current layout width. If you provide `x` descriptors alongside `sizes`, the browser may ignore the `srcset` entirely or fall back to the `src` attribute, defeating the purpose of responsive images."

— [DebugBear: The Ultimate Guide To Responsive Images On The Web](https://www.debugbear.com/blog/responsive-images)

This confirms that incorrect srcset widths have measurable performance costs (bandwidth waste, quality loss).

### 2.8 Rocket Validator — Validation error message

The W3C HTML validator produces this error for mismatched `w` descriptors:

> "Bad value for attribute 'srcset' on element 'img': Expected width descriptor but found X at Y. When the 'sizes' attribute is present, all image candidate strings must specify a width."

> "When using width descriptors, the value must match the image file's actual intrinsic width in pixels."

— [Rocket Validator](https://rocketvalidator.com/html-validation/bad-value-for-attribute-srcset-on-element-img-expected-width-descriptor-but-found-x-at-y-when-the-sizes-attribute-is-present-all-image-candidate-strings-must-specify-a-width)

This confirms that HTML validators treat this as a validation error, not a warning.

---

## 3. Options with Tradeoffs

### Option A: Build-time hard gate (recommended)

**What:** Add a validation step that compares each manifest srcset width against the master intrinsic width. Build fails if any srcset width exceeds the master width.

**Tradeoffs:**

| Pro | Con |
|-----|-----|
| Enforces a WHATWG MUST requirement | Adds a validation step to the build |
| Catches errors at authoring time, not in production | Requires the build to read master dimensions (already available) |
| Consistent with existing build gates (safe local references, budgets) | May break existing manifests that have invalid srcsets |
| Clear error message names the offending frame and width | |
| No dependency on external conformance checkers | |

**Mitigation for cons:**
- Existing manifests can be fixed once; the gate prevents future regressions.
- The build already reads master dimensions for image generation, so no new I/O is needed.
- The error message can list all offending widths, making fix-up fast.

### Option B: Build-time soft gate (warning only)

**What:** Same validation, but the build only prints a warning and continues.

**Tradeoffs:**

| Pro | Con |
|-----|-----|
| Non-blocking — doesn't break existing workflows | Warnings are easily ignored and accumulate |
| Still surfaces the problem to authors | Doesn't actually enforce conformance |
| Easy to implement | False sense of security |

**Why not recommended:** Warnings don't enforce anything. The build already fails on other MUST violations (unsafe references, budget overruns). A warning here would be inconsistent.

### Option C: Authoring guidance only (no build gate)

**What:** Document the requirement in the authoring guide and rely on authors to follow it.

**Tradeoffs:**

| Pro | Con |
|-----|-----|
| Zero implementation cost | No enforcement — errors reach production |
| Flexible for edge cases | Authors may not read or follow the guidance |
| | Inconsistent with the build's existing role as a conformance gate |
| | The spec requirement is a MUST, not a suggestion |

**Why not recommended:** This is the current state, and it's exactly the gap FR-003 identifies. The build silently skips unfillable widths, which means the generated HTML has fewer candidates than the manifest claims — a silent divergence between intent and output.

### Option D: External conformance checker (RespImageLint-style)

**What:** Recommend or integrate a post-hoc conformance checker like RespImageLint.

**Tradeoffs:**

| Pro | Con |
|-----|-----|
| Validates the final HTML output | Not in the critical path — requires manual or CI invocation |
| Can catch other responsive image mistakes | Doesn't prevent the error at authoring time |
| | Adds a new dependency or workflow step |
| | RespImageLint is a bookmarklet, not a CI-friendly tool |

**Why not recommended:** This complements but does not replace a build-time gate. The build is the natural enforcement point because it has all the context (manifest + masters) and is already the conformance gate for other requirements.

---

## 4. Recommendation

**Implement Option A: a build-time hard gate.**

Specifically:

1. **Where:** Add the validation to `scripts/validate-manifest.mjs` (if it has access to master dimensions) or to `scripts/build-images.mjs` (which already reads master dimensions at lines 236, 243).

2. **What to check:** For each frame in the manifest, compare every `w` descriptor in the srcset against the master's intrinsic width. If any `w` value exceeds the master width, fail the build with an error like:
   ```
   Error: Frame "frame-001" lists srcset width 1600w but master is only 1200px wide.
   Remove 1600w from the srcset or provide a larger master.
   ```

3. **Why a hard gate:** The WHATWG spec uses "must" (MUST). The build already enforces other MUSTs (safe local references, budget limits). A warning would be inconsistent and ineffective.

4. **Edge cases:**
   - **SVG masters:** SVGs may not have an intrinsic width. The spec says "if it has a natural width," so the gate should skip validation for masters without a natural width. The build already handles this distinction (it only skips widths for raster images).
   - **Masters with density metadata:** If a master has EXIF density information, the natural width may differ from the pixel width. The gate should use the same natural-width calculation the build already uses for image generation.

5. **Relationship to FR-013:** This gate IS the FR-013 validation. FR-013 says "manifest srcset lists only fillable widths" — the gate makes this a build-time invariant rather than a silent no-op.

---

## 5. Summary

| Source | Key Point | URL |
|--------|-----------|-----|
| WHATWG HTML Standard | `w` descriptor MUST match natural width | https://html.spec.whatwg.org/multipage/images.html#srcset-attributes |
| W3C HTML 5.2 | Same MUST requirement | https://www.w3.org/TR/2017/REC-html52-20171214/semantics-embedded-content.html |
| WHATWG issue #11428 | Mismatched `w` descriptors cause unpredictable rendering | https://github.com/whatwg/html/issues/11428 |
| RespImageLint | Conformance checker validates `w` descriptors | https://github.com/ausi/respimagelint |
| web.dev | Authoring guidance for `srcset` + `sizes` | https://web.dev/learn/design/responsive-images |
| DebugBear | Invalid srcset causes bandwidth waste and quality loss | https://www.debugbear.com/blog/responsive-images |
| Rocket Validator | W3C validator treats mismatch as validation error | https://rocketvalidator.com/html-validation/bad-value-for-attribute-srcset-on-element-img-expected-width-descriptor-but-found-x-at-y-when-the-sizes-attribute-is-present-all-image-candidate-strings-must-specify-a-width |
