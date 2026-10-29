# Clarification: Coherence of the FR-002 SVG allow-list

**Feature**: `specs/003-artcraft-local-authoring` (FR-002 SVG sanitization gate)
**Created**: 2026-10-17
**Status**: Research-backed clarification. Audits `plan.md:19-20` (allowed elements/attributes) against the W3C SVG 1.1 / SVG 2 element–attribute dependency tables and returns a concrete fix list.

**Question**: The allow-list permits `marker-start` / `marker-mid` / `marker-end` but not the `marker` element. Are those attributes dead? Are there other dead or inconsistent entries (attributes whose owning element is absent; elements whose companion attributes are missing)? What is best practice for a minimal safe SVG subset for authored illustration?

---

## 1. Direct answer / recommendation

**Yes — `marker-start` / `marker-mid` / `marker-end` are dead as specified.** Their only valid non-trivial value is a Functional IRI (`url(#id)`) that must reference a `marker` element (SVG 1.1 §11.6.3; SVG 2 §13.7.2). With `marker` absent from the element allow-list, the only values that can ever survive the gate are `none` and `inherit` — i.e. the attributes can never produce a rendered marker. They are not a *security* hole (a `url(#…)` value is still fragment-validated), but they are misleading, untested surface and a cross-document inconsistency (the sibling `svg-reference-rule.md` §3 already lists `marker-*` among the URL-valued attributes that carry a `url(#…)`, which presupposes a `marker` element exists).

**Fix list (specific, minimal, fail-closed):**

1. **Resolve the marker pair as a unit — never one without the other.**
   - **Recommended (Option A): drop `marker-start`, `marker-mid`, `marker-end`** from the attribute allow-list, keeping the vocabulary minimal. Authors draw arrowheads/polymarkers as explicit `path` geometry (which the allow-list already fully supports).
   - **Alternative (Option B): add the `marker` element *and* all six of its companion attributes** — `markerWidth`, `markerHeight`, `markerUnits`, `refX`, `refY`, `orient` (`viewBox` and `preserveAspectRatio` are already allowed). Adding the element without the companions produces a marker that cannot be positioned, sized or oriented, which is a second dead-end.
   - **Decision rule (matches the plan's own note, `plan.md:22`):** finalize against a real vectorcraft export — `grep -c '<marker' export.svg`. If the exporter never emits `<marker>`, take Option A. If it does, take Option B. Today the repo contains no `<marker>` usage (masters are JPEG fixtures), so there is no evidence to justify keeping the three attributes.
2. **Add the missing companion attributes for elements that *are* allowed** (none is DTD-required — each has a spec default, so the element renders, but the author loses control):
   - gradients: `spreadMethod`; `radialGradient` also `fx`, `fy` (and `fr` if targeting SVG 2);
   - `pattern`: `patternContentUnits`;
   - `clipPath`: `clipPathUnits`;
   - `mask`: `maskUnits`, `maskContentUnits`;
   - `text`/`tspan`: `dx`, `dy` (optionally `rotate`, `textLength`, `lengthAdjust`, `word-spacing`, `text-decoration`);
   - globally (text): `xml:space`; optionally `xml:lang`;
   - `svg` (SVG 1.1 optional): `version`.
3. **Reclassify `class`**: it is spec-valid but **inert** here — with the `<style>` element and `style` attribute rejected (FR-002) and no external stylesheet available to a standalone image rasterized by librsvg, `class` has no styling path. Keep it (harmless, some exporters emit it) or drop it for strict minimalism; either is safe. Document the choice.
4. **State the gate's posture explicitly**: it is a **name-based** allow-list, not an `(element, attribute)`-pair matrix. It therefore permits spec-nonsensical combinations (e.g. `d` on a `rect`, `cx` on a `path`). That is acceptable and simpler, but it should be a documented decision, with per-element validity delegated to librsvg and caught visually by the Tier B SSIM/PSNR gate.
5. **Keep the deliberate exclusions** (`filter`/`fe*`, `image`, `a`, `textPath`, `switch`, `style`, animation, `foreignObject`) and document them as design decisions, not omissions. The one item worth an explicit note is `use`, which is the primary external-reference surface (see §4).

---

## 2. What the primary sources say

### 2.1 `marker-*` is defined *by* the `marker` element — the dependency is normative

- **SVG 1.1 §11.6.3 "Marker properties"** ([painting.html#MarkerEndProperty](https://www.w3.org/TR/SVG11/painting.html#MarkerEndProperty)): `marker-start`, `marker-mid`, `marker-end` have value `none | <funciri> | inherit`, apply to `'path'`, `'line'`, `'polyline'` and `'polygon'`, and the `<funciri>` is "a Functional IRI reference to the **`marker` element**". The normative consequence: "If the IRI reference is not valid (e.g., it points to an object that is undefined **or the object is not a `marker` element**), then the marker(s) shall not be drawn." With no `marker` in the allow-list, every non-`none` value is invalid by construction.
- **SVG 1.1 §11.6.2 "The `marker` element"** ([painting.html#MarkerElement](https://www.w3.org/TR/SVG11/painting.html#MarkerElement)) defines the element and its own attribute set: `markerUnits`, `refX`, `refY`, `markerWidth`, `markerHeight`, `orient` (plus `viewBox`, `preserveAspectRatio`, core and presentation attributes). These six are the companions a marker needs to be useful.
- **SVG 1.1 Appendix M.1 "Attribute Index"** ([attindex.html](https://www.w3.org/TR/SVG11/attindex.html)) is the authoritative element↔attribute matrix: `markerHeight`, `markerUnits`, `markerWidth`, `orient`, `refX`, `refY` list **`marker` as their only element**; `viewBox` and `preserveAspectRatio` also list `marker` alongside `svg`/`symbol`/`pattern`/`view`/`image`/`feImage`. **SVG 1.1 Appendix M.2** ([attindex.html#PresentationAttributes](https://www.w3.org/TR/SVG11/attindex.html#PresentationAttributes)) lists `marker-end`, `marker-mid`, `marker-start` as presentation attributes.
- **SVG 2 §13.7 "Markers"** ([painting.html#MarkerElement](https://www.w3.org/TR/SVG2/painting.html#MarkerElement)) keeps the same model: §13.7.1 defines `marker` with presentation attributes `viewBox`, `preserveAspectRatio`, `refX`, `refY`, `markerUnits`, `markerWidth`, `markerHeight`, `orient`; §13.7.2 defines the `marker-start`/`marker-mid`/`marker-end` properties with value `none | <url>` applying to **shapes**. **SVG 2 Appendix G.1** ([attindex.html](https://www.w3.org/TR/SVG2/attindex.html)) again lists `markerHeight`/`markerUnits`/`markerWidth`/`orient`/`refX`/`refY` on `marker` only (SVG 2 additionally adds `refX`/`refY` to `symbol`).
- **SVG 2 Appendix H "Property Index"** ([propidx.html](https://www.w3.org/TR/SVG2/propidx.html)): `marker` (shorthand, initial "see individual properties") and `marker-start`/`marker-mid`/`marker-end` (`none | <url>`) apply to **shapes**. Note the plan allows the three longhands but not the `marker` shorthand — a cosmetic gap only, since the longhands cover the same ground.

### 2.2 The same index resolves every other attribute to an allowed owner (no other dead entry)

Cross-referencing each allowed attribute against SVG 1.1 Appendix M.1/M.2 and SVG 2 Appendix G.1/G.2:

| Allowed attribute(s) | Owner element(s) per the index | Status |
|---|---|---|
| `id`, `class` | all elements (incl. all allowed ones) | alive (`class` inert — §3.2) |
| `d` | `path` | alive |
| `x`, `y` | `rect`, `use`, `svg`, `pattern`, `mask`, `text`, `tspan` | alive |
| `x1`,`y1`,`x2`,`y2` | `line`, `linearGradient` | alive |
| `cx`,`cy`,`r` | `circle`, `ellipse`, `radialGradient` | alive |
| `rx`,`ry` | `rect`, `ellipse` | alive |
| `width`,`height` | `svg`, `rect`, `use`, `pattern`, `mask` | alive |
| `points` | `polyline`, `polygon` | alive |
| `transform` | graphics/container elements (SVG 2 adds `svg`) | alive |
| `transform-origin` | SVG 2 presentation attribute for the CSS Transforms property | alive (SVG 2 only) |
| `fill`,`fill-opacity`,`fill-rule`,`stroke`,`stroke-width`,`stroke-opacity`,`stroke-linecap`,`stroke-linejoin`,`stroke-dasharray`,`stroke-dashoffset`,`stroke-miterlimit` | shapes + text content elements | alive |
| `opacity` | all | alive |
| `viewBox`,`preserveAspectRatio` | `svg`, `symbol`, `pattern` (+`marker` if added) | alive |
| `xmlns`,`xmlns:xlink` | XML namespace declarations | alive (needed) |
| `font-family`,`font-size`,`font-weight`,`font-style`,`text-anchor`,`dominant-baseline`,`letter-spacing` | `text`, `tspan` | alive |
| `gradientUnits`,`gradientTransform` | `linearGradient`, `radialGradient` | alive |
| `offset`,`stop-color`,`stop-opacity` | `stop` | alive |
| `clip-path` (attr) | references a `clipPath` element (present) | alive |
| `mask` (attr) | references a `mask` element (present) | alive |
| `patternUnits`,`patternTransform` | `pattern` | alive |
| `href`,`xlink:href` | `use`, `linearGradient`, `radialGradient`, `pattern` (SVG 1.1 `xlink:href`; SVG 2 `href`) | alive (fragment-only) |
| **`marker-start`,`marker-mid`,`marker-end`** | `path`/`line`/`polyline`/`polygon` → **`marker`** | **DEAD** |

So `marker-*` is the **only** dead-attribute case in the list. Every other allowed attribute resolves to at least one allowed owner.

### 2.3 Missing companion attributes (element allowed, controlling attribute absent)

None of these attributes is *required* (each has a spec default), so no allowed element is unusable — but each is a real authoring limitation that a tool export may trip over:

| Allowed element | Missing attribute | Effect / spec default | Source anchor |
|---|---|---|---|
| `linearGradient`, `radialGradient` | `spreadMethod` | `pad` only; no `reflect`/`repeat` | [pservers.html#LinearGradientElementSpreadMethodAttribute](https://www.w3.org/TR/SVG11/pservers.html#LinearGradientElementSpreadMethodAttribute) |
| `radialGradient` | `fx`, `fy` (SVG 2: `fr`) | focal point forced to (`cx`,`cy`); no off-centre highlight | [pservers.html#RadialGradientElementFXAttribute](https://www.w3.org/TR/SVG11/pservers.html#RadialGradientElementFXAttribute) |
| `pattern` | `patternContentUnits` | contents unit system fixed to `userSpaceOnUse` | [pservers.html#PatternElementPatternContentUnitsAttribute](https://www.w3.org/TR/SVG11/pservers.html#PatternElementPatternContentUnitsAttribute) |
| `clipPath` | `clipPathUnits` | fixed to `userSpaceOnUse`; `objectBoundingBox` exports rejected | [masking.html#ClipPathElementClipPathUnitsAttribute](https://www.w3.org/TR/SVG11/masking.html#ClipPathElementClipPathUnitsAttribute) |
| `mask` | `maskUnits`, `maskContentUnits` | fixed to `objectBoundingBox` / `userSpaceOnUse` | [masking.html#MaskElementMaskUnitsAttribute](https://www.w3.org/TR/SVG11/masking.html#MaskElementMaskUnitsAttribute) |
| `text`, `tspan` | `dx`, `dy` | no per-glyph/per-span offset placement or manual kerning | [text.html#TextElementDXAttribute](https://www.w3.org/TR/SVG11/text.html#TextElementDXAttribute) |
| `text`/all | `xml:space` | whitespace collapse cannot be controlled (`preserve`) | [struct.html#XMLSpaceAttribute](https://www.w3.org/TR/SVG11/struct.html#XMLSpaceAttribute) |
| `svg` | `version` (optional) | SVG 1.1 recommends it; SVG 2 dropped it | [struct.html#SVGElementVersionAttribute](https://www.w3.org/TR/SVG11/struct.html#SVGElementVersionAttribute) |

Also absent, and worth a conscious decision: `clip-rule` (winding rule for `clipPath` contents — [masking.html#ClipRuleProperty](https://www.w3.org/TR/SVG11/masking.html#ClipRuleProperty)), `color` (needed to make `currentColor` in `fill`/`stroke` useful), `vector-effect` (SVG 2, `non-scaling-stroke`), and `paint-order` (SVG 2).

### 2.4 `class` is inert under the gate's own rules

SVG 1.1 Appendix M.1 lists `class` on every allowed element ([styling.html#ClassAttribute](https://www.w3.org/TR/SVG11/styling.html#ClassAttribute)), so allowing it is spec-legal. But FR-002 rejects the `<style>` element and the `style` attribute, and an SVG master rasterized by sharp/librsvg is a standalone image with no external stylesheet — so no CSS rule can ever select the class. `class` therefore has no rendering effect. It carries no URL or script value, so it is harmless; the point is only that it should not be counted as a functional capability.

---

## 3. Best practice for a minimal safe SVG subset for authored illustration

### 3.1 The W3C's own reduced profiles set the floor

- **SVG Tiny 1.2** (W3C Rec, [elementTable.html](https://www.w3.org/TR/SVGTiny12/elementTable.html)) is the standards body's canonical *minimal* SVG: structure (`svg`, `g`, `defs`, `title`, `desc`), shapes, `text`/`tspan`, `linearGradient`/`radialGradient`/`stop`, `use`, and core attributes (`id`, `class`, `xml:space`, `xml:lang`, `xml:base`, `xml:id`, `transform`). It omits `pattern`, `mask`, `clipPath`, `marker`, `symbol`, `filter`, `textPath`. The plan's list is a superset of Tiny 1.2 minus animation/media — a reasonable "illustration" tier.
- **SVG 1.1 Basic/Tiny profiles** ([intro.html#Profiles](https://www.w3.org/TR/SVG11/intro.html#Profiles)) are the desktop/mobile reduced profiles in the same spirit.

### 3.2 The de-facto sanitizer list is the industry floor

- **DOMPurify's default SVG allow-list** ([src/tags.ts](https://github.com/cure53/DOMPurify/blob/main/src/tags.ts)) — `svg, a, altglyph*, circle, clippath, defs, desc, ellipse, filter, font, g, glyph, glyphref, hkern, image, line, lineargradient, marker, mask, metadata, mpath, path, pattern, polygon, polyline, radialgradient, rect, stop, style, switch, symbol, text, textpath, title, tref, tspan, view, vkern` — includes `marker`, `clippath`, `mask`, `pattern`, `symbol`, `filter`, `textpath`, `style`. Its companion attribute list ([src/attrs.ts](https://github.com/cure53/DOMPurify/blob/main/src/attrs.ts)) is broader than the plan's. Two useful signals: (a) DOMPurify keeps `marker` as a first-class element, so a list that keeps `marker-*` is expected to keep `marker`; (b) **DOMPurify places `use` in its `svgDisallowed` list** — the one element in the plan's list that the leading sanitizer excludes by default.
- **OWASP** guidance already cited by the sibling document — prefer allow-lists over deny-lists ([SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)) — is consistent with a name-based allow-list, provided the reference rule is enforced on every URL-valued attribute.

### 3.3 The standards' security model constrains what a "safe subset" may reference

- **W3C SVG Security wiki, §1.1 "SVG as image"** ([w3.org/wiki/SVG_Security](https://www.w3.org/wiki/SVG_Security#SVG_as_image)): an SVG fetched as an image "is not allowed to fetch any resources" (scripts, stylesheets or images); §1.2 extends this to resources referenced via `url()`.
- **SVG 2 §16.1.7.2 "Fetching the document"** ([linking.html#processingURL-fetch](https://www.w3.org/TR/SVG2/linking.html#processingURL-fetch)): in **secure static mode**, "external file references are disallowed". The gate's fragment-only rule is the build-time enforcement of exactly this.

### 3.4 Recommended tiers for this project

**Core (keep):** `svg, g, defs, title, desc, path, rect, circle, ellipse, line, polyline, polygon, text, tspan, use, symbol, linearGradient, radialGradient, stop, pattern, clipPath, mask` + the geometry/paint/transform/unit attributes already listed.

**Add if the exporter needs it:** `marker` (+ `markerWidth`, `markerHeight`, `markerUnits`, `refX`, `refY`, `orient`) **or** nothing (drop `marker-*`); `spreadMethod`, `patternContentUnits`, `clipPathUnits`, `maskUnits`, `maskContentUnits`, `fx`, `fy`, `dx`, `dy`, `xml:space`; optionally `vector-effect`, `paint-order`, `clip-rule`, `color`, `version`.

**Keep excluded, and document why:** `script`, `on*` handlers, `foreignObject`, `style` element and `style` attribute, `a`, `image`, `filter`/`fe*`, SMIL animation (`animate`, `set`, `animateMotion`, `animateTransform`, `discard`), `textPath`, `switch`, `view`, `metadata`, `cursor`, and any external/`data:` reference. The most consequential single exclusion to justify is `filter` — excluding it removes blur/drop-shadow/texture effects and also removes the `feImage` external-reference surface and a large DoS class; authored illustration can substitute gradients/patterns/`mask` for most of it.

---

## 4. Design choices, tradeoffs, and the recommended option

### 4.1 The `marker` decision

| | Option A — drop `marker-*` | Option B — add `marker` + 6 companions |
|---|---|---|
| Vocabulary size | smaller (removes 3 dead entries) | larger (adds 1 container element + 6 attributes) |
| Capability | arrowheads drawn as explicit `path`s | native `marker-start/mid/end` arrowheads/polymarkers |
| Security surface | unchanged | `marker`'s content model is broad (shapes, gradients, patterns, `use`, `text`, `clipPath`, `mask`); markers/patterns are a historical librsvg recursion DoS class (see the sibling DoS-cap research), so the existing caps must cover marker nesting too |
| Test surface | no dead branch | one more element + reference path to exercise |
| Coherence with the rest | fully consistent | must also add `viewBox`/`preserveAspectRatio` usage on `marker` and update `svg-reference-rule.md` |

**Recommended: Option A today**, because the allow-list is explicitly the *minimal* vectorcraft vocabulary, the repo has no `<marker>` evidence, and the failing state (dead attributes) is what we are fixing. Switch to Option B only if a real export emits `<marker>` — and then add the element **and** all six companions together.

### 4.2 The `use` element (a related, higher-stakes posture question)

The plan allows `use` + `symbol` + `href` (fragment-only). `use` is the element through which an SVG can pull in an external document (`<use href="other.svg#id">`) — the exact SSRF/XXE vector the gate exists to close. The plan closes it correctly via the fragment-only rule (`svg-reference-rule.md`), and DOMPurify takes the more conservative route of disallowing `use` entirely. Keeping `use` is defensible **only because** the fragment-only rule is enforced on it; this makes that rule load-bearing for the whole element list and worth an explicit test vector. No change required — but the coupling should be documented so a future relaxation of the reference rule cannot silently re-open the `use` vector.

### 4.3 Name-based vs. pair-based allow-listing

| | Name-based (current plan) | `(element, attribute)` pair matrix |
|---|---|---|
| Simplicity | high — one set of element names, one set of attribute names | high complexity — a table per element |
| Precision | allows spec-nonsensical pairs (ignored by renderers) | rejects them at the gate |
| Failure mode | a mis-authored attribute is ignored → caught by Tier B SSIM/PSNR | fails fast with a precise message |
| Maintenance | one list to update | must track the W3C attribute index |

**Recommended: keep name-based**, but record the decision and rely on librsvg (per-element validity) + Tier B (visual fidelity) as the backstops. A pair matrix would add a large, spec-tracking maintenance burden for a vocabulary that is, by construction, tiny and exporter-driven.

---

## 5. Open questions (for planning)

1. **Marker evidence.** Does the vectorcraft export emit `<marker>`? This single fact selects Option A vs. Option B. It should be captured as a one-line note in `plan.md:22` when the export is inspected.
2. **SVG 1.1 vs. SVG 2 target.** `transform-origin`, `fr`, `refX`/`refY` on `symbol`, `vector-effect`, `paint-order`, `href` (vs. `xlink:href`) are SVG 2 features. The allow-list mixes both generations. Decide which spec generation the gate targets (librsvg supports much of SVG 2) and state it, since it determines whether `fr`/`vector-effect`/`paint-order` belong.
3. **`class` — keep or drop?** Harmless but inert under the gate's own `<style>` rejection. Either is safe; pick one and document it so the vocabulary is not "accidentally" larger than its capability.
4. **`filter` exclusion is a product decision.** It removes blur/drop-shadow/texture. If the authored horror frames need soft shadows, the alternatives are gradient/`mask` tricks (no new elements) or adding a curated `filter` subset (large security/DoS cost). This is a Tier A art-direction call, not a security one.
5. **`xml:space` for text.** If any frame's `text` relies on significant whitespace, `xml:space="preserve"` must be allowed; otherwise `dx`/`dy`-positioned `tspan`s may render with collapsed spaces.

---

## Sources

**Standards (W3C):**
- SVG 1.1 (2nd ed.), Appendix M.1 "Attribute Index" — element↔attribute matrix. <https://www.w3.org/TR/SVG11/attindex.html>
- SVG 1.1, Appendix M.2 "Presentation attributes" — <https://www.w3.org/TR/SVG11/attindex.html#PresentationAttributes>
- SVG 1.1, §11.6.2 "The `marker` element" — <https://www.w3.org/TR/SVG11/painting.html#MarkerElement>
- SVG 1.1, §11.6.3 "Marker properties" (`marker-start`/`-mid`/`-end`; value `none | <funciri> | inherit`; invalid target ⇒ not drawn) — <https://www.w3.org/TR/SVG11/painting.html#MarkerEndProperty>
- SVG 1.1, §13.2 gradients / `spreadMethod`, `fx`, `fy` — <https://www.w3.org/TR/SVG11/pservers.html#LinearGradientElementSpreadMethodAttribute>, <https://www.w3.org/TR/SVG11/pservers.html#RadialGradientElementFXAttribute>
- SVG 1.1, §13.3 `pattern` / `patternContentUnits` — <https://www.w3.org/TR/SVG11/pservers.html#PatternElementPatternContentUnitsAttribute>
- SVG 1.1, §14.3 `clipPath` / `clipPathUnits` — <https://www.w3.org/TR/SVG11/masking.html#ClipPathElementClipPathUnitsAttribute>
- SVG 1.1, §14.4 `mask` / `maskUnits`, `maskContentUnits` — <https://www.w3.org/TR/SVG11/masking.html#MaskElementMaskUnitsAttribute>
- SVG 1.1, §10 text `dx`/`dy` — <https://www.w3.org/TR/SVG11/text.html#TextElementDXAttribute>
- SVG 1.1, §5.4 `xml:space` (core) — <https://www.w3.org/TR/SVG11/struct.html#XMLSpaceAttribute>
- SVG 1.1, §5.1.2 `version` on `svg` — <https://www.w3.org/TR/SVG11/struct.html#SVGElementVersionAttribute>
- SVG 1.1, §2.3/§2.4 "Profiles" (Basic/Tiny) — <https://www.w3.org/TR/SVG11/intro.html#Profiles>
- SVG 1.1, `class` attribute — <https://www.w3.org/TR/SVG11/styling.html#ClassAttribute>
- SVG 2, Appendix G.1 "Attribute Index" — <https://www.w3.org/TR/SVG2/attindex.html>
- SVG 2, Appendix G.2 "Presentation attributes" (incl. `transform-origin`, `vector-effect`, `marker-*`) — <https://www.w3.org/TR/SVG2/attindex.html#PresentationAttributes>
- SVG 2, Appendix H "Property Index" (`marker`, `marker-start`/`-mid`/`-end`) — <https://www.w3.org/TR/SVG2/propidx.html>
- SVG 2, §13.7.1 "The `marker` element" — <https://www.w3.org/TR/SVG2/painting.html#MarkerElement>
- SVG 2, §16.1.7.2 "Fetching the document" (secure static mode disallows external file references) — <https://www.w3.org/TR/SVG2/linking.html#processingURL-fetch>
- SVG Tiny 1.2, Appendix K "Element Table" (the W3C's minimal SVG profile) — <https://www.w3.org/TR/SVGTiny12/elementTable.html>
- W3C Wiki, "SVG Security", §1.1 "SVG as image" — <https://www.w3.org/wiki/SVG_Security#SVG_as_image>

**Sanitizer / security practice:**
- DOMPurify default SVG tag allow-list (includes `marker`; `use` in `svgDisallowed`) — <https://github.com/cure53/DOMPurify/blob/main/src/tags.ts>
- DOMPurify default SVG attribute allow-list — <https://github.com/cure53/DOMPurify/blob/main/src/attrs.ts>
- OWASP SSRF Prevention Cheat Sheet (prefer allow-lists) — <https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html>

**Project sources:**
- `specs/003-artcraft-local-authoring/plan.md:17-22` — the allow-list under review; `plan.md:22` note deferring finalization to a real vectorcraft export.
- `specs/003-artcraft-local-authoring/research/clarifications/svg-reference-rule.md` §3 — the fragment-only reference rule, which already lists `marker-*` among URL-valued attributes (presupposes a `marker` element).
- `specs/003-artcraft-local-authoring/spec.md` — FR-002 (hybrid posture: reject-list floor + fail-closed allow-list; `<style>`/`style` rejected; DoS caps).
- `specs/003-artcraft-local-authoring/checklists/security-svg-sanitization.md` — CHK021–CHK024, CHK031 (allow-list posture).
- Repo state: no `scripts/svg-sanitize.mjs` yet; no `<marker>` usage in `media-src/` (masters are JPEG fixtures).
