# Clarification: srcset candidates wider than the master — what happens to the 1920/2560 rungs?

**Feature**: `specs/003-artcraft-local-authoring`
**Question**: The output contract's srcset width ladder is 320/640/960/1200/1920/2560, but the authored master is 1200×800 px and the build refuses upscaling (`withoutEnlargement`). What happens to the 1920/2560 rungs? Is it harmful to keep them in the contract? What is best practice?

**Status**: answered (research-backed). Recommendation: **keep the ladder constant and the T217 guard; never let unreachable rungs reach the manifest srcset.** The manifest must list only candidates the build actually emits.

---

## 0. What is actually in the repo

Two different "contracts" are easy to conflate, and the question turns on the difference:

| Contract | Where | Value today |
|:---|:---|:---|
| **Generator ladder** (`STANDARD_WIDTHS`) | `scripts/build-images.mjs:14` | `[320, 640, 960, 1200, 1920, 2560]` |
| **Manifest srcset** (what the browser sees) | `src/data/story.json` (e.g. line 34) | `320w, 640w, 960w, 1200w` — **no 1920/2560 entries** |

The build already reconciles the two: `buildImages()` walks the ladder but skips any rung above the master's intrinsic width (`scripts/build-images.mjs:232-241`):

```js
for (const width of STANDARD_WIDTHS) {
  // T217: only emit candidates the master can genuinely fill. A width above
  // the master would either be upscaled or written under a name that lies
  // about its geometry.
  if (width > intrinsicWidth) continue;
```

So for a 1200 px master, `frame-XX-1920.{avif,webp,jpg}` and `frame-XX-2560.*` are **never generated**, and the manifest (hand-authored) lists only the rungs that exist. The question is whether that state is correct, and whether the unreachable rungs are harmful where they remain.

---

## 1. Direct answer

**What happens to the 1920/2560 rungs:** nothing is generated for them, and that is the correct outcome. With `withoutEnlargement: true` (`scripts/build-images.mjs:89`), sharp asked to resize a 1200 px master to 1920 px emits a **1200 px-wide file named `-1920.avif`** — a file whose name and `1920w` descriptor would lie about its geometry. The HTML Standard makes that a conformance violation (§2.1 below), and the repo's own gates reject it: `ensureImage` treats `metadata.width !== width` as invalid (`build-images.mjs:106`), and `validateImageAsset` throws `invalid-image-geometry` when a file's width disagrees with its srcset descriptor (`scripts/build.mjs:292`). The T217 guard prevents the situation upstream by not emitting the rung at all.

**Is it harmful to keep them in the contract?** It depends which contract:

- **In the generator ladder (`STANDARD_WIDTHS`): not harmful, but dead.** The `width > intrinsicWidth` guard makes unreachable rungs no-ops. The ladder is a shared constant (FR-003 freezes the output contract), and a future master up to the FR-002 ceiling of 2560 px could still use the top rungs. Under FR-012, however, masters >1200 px are rejected, so 1920/2560 are unreachable *by construction* for this project's lifetime. Keeping them is harmless; removing them would be a contract change that FR-003 forbids.
- **In the manifest srcset: harmful — a dead entry is a broken-image trap.** If `story.json` listed `…-1920.avif 1920w` while the build skips that file, two things happen: (a) the build fails fast — `imageReferences` (`scripts/build.mjs:358-370`) collects every srcset candidate and `validateImageAsset` throws on the missing file; and (b) if it ever shipped, the browser selects **one** candidate and fetches it — a 404 puts the image request in the **broken** state and fires `error`, with **no fallback to the other candidates** (§2.3). Any device whose computed source size lands in the 1920/2560 range (e.g. DPR ≥ 2 on a ≥960 px-wide viewport at `sizes="100vw"`) would show alt text instead of the 1200w image.

**Best practice:** the srcset is a promise about what exists. Declare only candidates you have; generate only candidates you can fill; make the descriptor describe the actual file. The repo's current shape (ladder keeps the rungs, guard skips them, manifest lists only emitted rungs) is exactly that pattern.

---

## 2. What the primary sources say

### 2.1 The width descriptor is a claim about the file's natural width — and the spec makes it a MUST

- **WHATWG HTML Standard, §4.8.4.2.1 "Srcset attributes"** (the normative syntax section): "The specified width in an image candidate string's width descriptor **must match the natural width** in the resource given by the image candidate string's URL, if it has a natural width." ([html.spec.whatwg.org/multipage/images.html#srcset-attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)). A `1920w` descriptor on a 1200 px-wide file is therefore **non-conforming markup**, independent of any build tooling.
- **MDN, `<img>` `srcset` reference**: "A width descriptor (a positive integer directly followed by `w`). It *must* match the intrinsic width of the referenced image." ([developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#srcset](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#srcset)). MDN's responsive-images guide is blunter about what the number means: the `w` descriptor is "the image's **intrinsic width in pixels** … its real size, which can be found by inspecting the image file" ([MDN, "Responsive images", §Resolution switching: Different sizes](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images#resolution_switching_different_sizes)).

### 2.2 How the browser chooses — and what happens when the need exceeds every candidate

- **Selection is single-shot and UA-defined.** The spec's "select an image source" algorithm ends with: "In an **implementation-defined** manner, choose one image source from sourceSet." ([§4.8.4.3.7](https://html.spec.whatwg.org/multipage/images.html#selecting-an-image-source)). The choice is driven by density normalization: a `w` descriptor is converted to a pixel density of `descriptor ÷ source size`, where source size comes from `sizes` ([§4.8.4.3.12 "Normalizing the source densities"](https://html.spec.whatwg.org/multipage/images.html#normalizing-the-source-densities)). So at DPR 2 on a 1200 px viewport with `sizes="100vw"`, the source size is 2400 and the candidates normalize to 0.133x/0.267x/0.4x/0.5x — none reaches 1x.
- **When no candidate meets the need, the browser uses the best available and scales it.** MDN describes the de facto behavior: "If there isn't an exact match for the display size, the browser will choose the first image that is bigger than the chosen slot size and scale it down to fit" ([MDN guide, §Resolution switching](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images#resolution_switching_different_sizes)). The complement — when *no* candidate is bigger — is that the largest candidate is chosen and rendered larger than its intrinsic size. That is the intended trade: a slightly soft image, not a broken one. (The spec itself leaves the exact choice to the UA; MDN documents what browsers do.)
- **Re-selection happens on environment change, not on failure.** The UA may re-run selection "when the user changes the viewport's size (e.g. by resizing the window or changing the page zoom)" ([§4.8.4.3.13](https://html.spec.whatwg.org/multipage/images.html#reacting-to-environment-changes)) — e.g. a phone rotating from DPR 2 to a zoomed DPR 3 re-picks a candidate. But a candidate that *failed to load* is not retried against its siblings.

### 2.3 A dead srcset entry is a broken image, not a fallback trigger

- **WHATWG HTML Standard, §4.8.4.3.5 "Updating the image data"**: when the fetched resource is not a usable image (which includes a 404 — no data obtained), "the user agent must set image request's state to **broken**, abort the image request … and then … fire an event named `error` at element" ([§4.8.4.3.5, "Otherwise" branch](https://html.spec.whatwg.org/multipage/images.html#updating-the-image-data)). The algorithm fetches **exactly one** URL — the selected source — and contains no step that removes the failed candidate and re-selects. The `src` attribute participates in selection only as a `1x`/default candidate at selection time ([§4.8.4.3.8, step 4](https://html.spec.whatwg.org/multipage/images.html#creating-a-source-set-from-attributes)); it is not a post-failure fallback.
- **MDN, `<img>` "Image loading errors"**: "Alt text is also displayed on the page if the image can't be loaded for some reason: for example, network errors, content blocking, or link rot." ([developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#image_loading_errors](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#image_loading_errors)). So the user-visible result of a dead srcset entry is the alt text — for this comic, a frame that disappears into its description.

### 2.4 Why the rungs cannot be produced anyway — the upscaling harm

- **sharp, `resize` options**: `withoutEnlargement` — "Do not scale up if the width or height are already less than the target dimensions … **This may result in output dimensions smaller than the target dimensions**." (Default `false`; the repo passes it explicitly at `build-images.mjs:89`.) ([sharp.pixelplumbing.com/api-resize#withoutenlargement](https://sharp.pixelplumbing.com/api-resize#withoutenlargement)). Consequence: the only ways to emit a `-1920.*` file from a 1200 px master are (a) drop `withoutEnlargement` and ship detail-free upscaled pixels, or (b) keep it and ship a 1200 px file under a 1920 name — the "name that lies about its geometry" the T217 comment rejects.
- **web.dev, "Responsive images"**: "When scaled larger than their original size, raster images become **blurry** because the browser needs to guess how to fill in the missing pixels." ([web.dev/articles/responsive-images](https://web.dev/articles/responsive-images), §Choose the right format). MDN's guide makes the same point: "a small raster image starts to look grainy when displayed larger than its original size" ([MDN guide, §Why responsive images?](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images#why_responsive_images)). Upscaling buys no detail — it only costs bytes (and, here, frame budget: `budgetReferencesForFrame` sums the largest candidate per format into the 300 KB frame value, `scripts/build.mjs: budgetReferencesForFrame L500`).

---

## 3. Recommendation

**Keep the current shape. Do not add 1920/2560 to the manifest srcset; do not remove them from the ladder; do not remove the guard.**

1. **Keep the T217 guard** (`build-images.mjs:232-241`). It is the build-time enforcement of the spec's MUST (§2.1): it guarantees every emitted candidate's filename, descriptor, and actual geometry agree, so `validateImageAsset`'s `invalid-image-geometry` check (`build.mjs:292`) and `ensureImage`'s width check (`build-images.mjs:106`) stay green as a backstop rather than as the primary defense.
2. **Keep `STANDARD_WIDTHS` unchanged** (FR-003: output contract frozen). The ladder is a shared constant; the guard makes unreachable rungs no-ops. Optionally extend the existing T217 comment to note that 1920/2560 are unreachable under FR-012's 1200 px authoring target — documentation, not code change.
3. **Keep the manifest srcset listing only emitted rungs** (320–1200w, as `story.json` does today). The invariant "every srcset entry exists and matches its descriptor" is already enforced by `validate-manifest`/`build` via `imageReferences` + `validateImageAsset`; the manifest is hand-authored, so the invariant is enforced by validation, not by construction. If the manifest is ever generated, derive the srcset from the files the build actually emitted.
4. **Do not "fix" the DPR≥2 desktop case by emitting 1920/2560.** The alternatives are all worse: upscaled pixels (no detail, real bytes, budget pressure), mis-named files (spec violation, geometry-gate failure), or a dead entry (broken image, §2.3). The browser rendering the 1200w candidate at 2x on a DPR-2 display is the spec's intended degradation path — the same trade web.dev and MDN describe (§2.4).

### Rationale

- **The spec makes the descriptor a conformance claim** (§2.1). A pipeline that emits candidates it cannot fill produces non-conforming markup by construction; the guard converts that into a no-op instead.
- **The failure mode of a dead entry is the worst available outcome** (§2.3): not a softer image but *no image* (alt text), for exactly the high-DPR devices srcset exists to serve — and the spec provides no sibling-retry, so nothing recovers it at runtime.
- **The byte budget independently forbids the top rungs** (§2.4, and spec batch 5: detailed art is ~952 KB at 1200 px vs ~4.3 MB at 2560 px against a 300 KB/frame value). Even if a 2560 px master were allowed, the rungs would be unaffordable; at the 1200 px authoring target they are simply moot.
- **The repo's existing gates already encode this.** `validateImageAsset` (descriptor↔file geometry), `ensureImage` (output width == requested width), and `findUnreferencedAssets === []` (no stray outputs) are the three invariants that make "skip, don't emit" safe: nothing unreachable can reach `assets/`, and nothing in `assets/` can be unreferenced.

---

## 4. Open questions

1. **Is browser-side 2x upscaling of the 1200w candidate acceptable for this art?** On DPR ≥ 2 viewports ≥ 960 px wide at `sizes="100vw"`, the browser renders the 1200 px candidate at 2x (§2.2). web.dev/MDN call this blurry/grainy (§2.4). The horror aesthetic (dark, high-grain) may tolerate it better than most, but that is a product judgement, not a spec question — and the alternative (a ≥2400 px master) is excluded by FR-012 and the byte budget. Needs a Tier A human look at a DPR-2 render of the four authored frames.
2. **Should `STANDARD_WIDTHS` be trimmed to the reachable ladder now that FR-012 caps masters at 1200 px?** Trimming would make the constant honest, but it is an output-contract change (FR-003) and the guard already makes the extra rungs inert. Recommend keeping and documenting; revisit only if the authoring target itself is revisited.
3. **Does the test matrix exercise DPR > 1?** The 5-project Playwright matrix covers browser engines; it is unknown whether any project sets `deviceScaleFactor > 1`. If not, the upscaled-rendering path (the direct consequence of skipping 1920/2560) is untested — worth a line in the e2e or perf suite.
4. **Manifest srcset: validated or generated?** Today the srcset is hand-written and checked against emitted files. If a future change lets the manifest drift from the build (e.g. a new frame added to `story.json` before `build:images` runs), the failure is still fail-fast (`validateImageAsset` throws on the missing file) — but generating the srcset from the emitted file list would make the invariant structural. Out of scope for this feature; noting it as a planning option.

---

## Sources

**Primary (external)**
- WHATWG. *HTML Living Standard*, §4.8.4.2.1 "Srcset attributes" — "The specified width in an image candidate string's width descriptor must match the natural width in the resource…" <https://html.spec.whatwg.org/multipage/images.html#srcset-attributes>
- WHATWG. *HTML Living Standard*, §4.8.4.3.5 "Updating the image data" — broken state + `error` event on unusable resource; single-URL fetch, no sibling retry. <https://html.spec.whatwg.org/multipage/images.html#updating-the-image-data>
- WHATWG. *HTML Living Standard*, §4.8.4.3.7 "Selecting an image source" — "In an implementation-defined manner, choose one image source from sourceSet." <https://html.spec.whatwg.org/multipage/images.html#selecting-an-image-source>
- WHATWG. *HTML Living Standard*, §4.8.4.3.8 "Creating a source set from attributes", step 4 — `src` participates in selection only as a default/1x candidate. <https://html.spec.whatwg.org/multipage/images.html#creating-a-source-set-from-attributes>
- WHATWG. *HTML Living Standard*, §4.8.4.3.12 "Normalizing the source densities" — `w` descriptor → density = descriptor ÷ source size. <https://html.spec.whatwg.org/multipage/images.html#normalizing-the-source-densities>
- WHATWG. *HTML Living Standard*, §4.8.4.3.13 "Reacting to environment changes" — re-selection on viewport/zoom change. <https://html.spec.whatwg.org/multipage/images.html#reacting-to-environment-changes>
- WHATWG. *HTML Living Standard*, §4.8.4.1.1 "Adaptive images" (non-normative) — "The user agent will calculate the effective pixel density of each image from the specified `w` descriptors and the specified rendered size in the `sizes` attribute." <https://html.spec.whatwg.org/multipage/images.html#adaptive-images>
- MDN. *`<img>` element reference*, `srcset` section — "It *must* match the intrinsic width of the referenced image." <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#srcset>
- MDN. *`<img>` element reference*, "Image loading errors" — alt text shown when the image can't be loaded. <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#image_loading_errors>
- MDN. *Responsive images* (guide), §"Resolution switching: Different sizes" — `w` = "the image's intrinsic width in pixels … its real size"; "the browser will choose the first image that is bigger than the chosen slot size and scale it down to fit." <https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images#resolution_switching_different_sizes>
- MDN. *Responsive images* (guide), §"Why responsive images?" — "a small raster image starts to look grainy when displayed larger than its original size." <https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images#why_responsive_images>
- web.dev (Pete LePage). *Responsive images* — "When scaled larger than their original size, raster images become blurry because the browser needs to guess how to fill in the missing pixels." <https://web.dev/articles/responsive-images>
- sharp. *Resizing images → `withoutEnlargement`* — "Do not scale up if the width or height are already less than the target dimensions … may result in output dimensions smaller than the target dimensions." <https://sharp.pixelplumbing.com/api-resize#withoutenlargement>

**Primary (repo)**
- `scripts/build-images.mjs` — `STANDARD_WIDTHS` (14), `LIGHT_WIDTHS` (15), `sourceWidth()` (68-72), `encodeImage` with `withoutEnlargement: true` (89), `ensureImage` width check (106), T217 guard `if (width > intrinsicWidth) continue` (232-241).
- `scripts/build.mjs` — `validateImageAsset` descriptor↔file geometry check (292), `imageReferences` srcset candidate collection (358-370), `budgetReferencesForFrame` largest-candidate-per-format (L500).
- `src/data/story.json` — per-frame srcsets list 320/640/960/1200w only (e.g. lines 34-36).
- `specs/003-artcraft-local-authoring/spec.md` — FR-002 (≤2560 px pipeline ceiling), FR-003 (output contract unchanged), FR-012 (1200×800 authoring target, `invalid-master-geometry` rejection), clarification batch 5 (canvas rationale: "a width above the master would either be upscaled or written under a name that lies about its geometry").
