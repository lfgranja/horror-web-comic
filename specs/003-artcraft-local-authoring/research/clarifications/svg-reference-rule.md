# Clarification: SVG `href` / `xlink:href` Reference-Validation Rule

**Feature**: `specs/003-artcraft-local-authoring` (FR-002 SVG sanitization gate)
**Created**: 2026-10-17
**Status**: Research-backed clarification (resolves the CHK031 open question — "Is the `isSafeLocalReference` rule explicitly distinguished from the SVG href/xlink:href rejection rule?")

---

## 1. Direct Answer

**No — the generic `isSafeLocalReference` rule must NOT be applied to SVG attributes. SVG needs its own, separate reference-validation rule.**

The two rules validate different things and are near-exact complements of each other:

| | Manifest rule (`isSafeLocalReference`) | SVG rule (recommended) |
|---|---|---|
| Validates | A **filesystem path** in a JSON manifest | An **IRI/URL reference** in an SVG attribute |
| `#` (fragment) | **Rejected** (`story-loader.js:42`, `build.mjs:139`) | **Required** — the fragment *is* the reference |
| `?` (query) | Rejected | Rejected |
| Relative path (`foo.png`) | Allowed | **Rejected** (external file reference) |
| Absolute / protocol-relative / scheme | Rejected | Rejected |
| `data:` | Rejected (scheme) | Rejected (per FR-002) |

Applying the manifest rule to SVG would reject `url(#gradient)`, `href="#id"`, `clip-path="url(#c)"` — i.e. **every internal paint-server, gradient, clip-path, mask, marker, filter, and `<use>` reference** — which FR-002 explicitly forbids ("Internal `url(#…`) refs must remain allowed", spec.md batch-2 clarification). The SVG 1.1 spec defines these fragment-only references as **local IRI references**, a first-class, required mechanism — not an edge case (SVG 1.1 §17.1.3, [source](#sources)).

**Recommended SVG rule (fail-closed):** a URL-valued SVG attribute (`href`, `xlink:href`, and the IRI inside `url(...)` in presentation attributes) is valid **iff its value is a fragment-only (same-document) reference** — i.e. it starts with `#` and contains no scheme, no authority, no path, and no query. Everything else — absolute URLs, protocol-relative (`//host`), relative paths, `data:`, `javascript:`, values with `?` — is rejected with a fail-fast throw.

---

## 2. Practices and Recommendations from Primary Sources

### 2.1 The SVG standards define fragment-only references as the internal mechanism

- **SVG 1.1 §17.1.3 "Syntactic forms: IRI and FuncIRI"** ([W3C SVG 1.1, linking.html#IRIforms](https://www.w3.org/TR/SVG11/linking.html#IRIforms)): "SVG supports two types of IRI references: **local IRI references**, where the IRI reference does not contain an `<absoluteIRI>` or `<relativeIRI>` and thus only contains a fragment identifier (i.e., `#<elementID>` …), and **non-local IRI references**…" The section's own example is `<rect fill="url(#MyGradient)"/>` — the canonical paint-server reference.
- **SVG 1.1 §17.1.4 "Processing of IRI references"** ([linking.html#processingIRI](https://www.w3.org/TR/SVG11/linking.html#processingIRI)): the valid-targets list shows that most URL-valued properties/elements **may only reference local elements** — `clip-path` must reference a `clipPath`, `filter` a `filter`, `marker-*` a `marker`, `mask` a `mask`, gradients/patterns their own kinds, `textPath` a `path`. Only `a`, `feImage`, `image`, and `use` "can reference any local or non-local resource". So for the majority of attributes the gate will ever see, fragment-only is not just allowed — it is the *only* spec-legal form.
- **SVG 1.1 §17.1.5** ([linking.html#xlinkRefAttrs](https://www.w3.org/TR/SVG11/linking.html#xlinkRefAttrs)): `xlink:href` "must be an Internationalized Resource Identifier" — an IRI reference, of which fragment-only is a legal form.
- **SVG 2 §16.1.2 "Definitions"** ([linking.html#definitions](https://www.w3.org/TR/SVG2/linking.html#definitions)) gives the exact vocabulary for the recommended rule: a **same-document URL reference** is one "where the non-fragment part of the URL refers to the current document"; an **external file reference** "refers to a resource that is not part of the current document"; a **data URL** is "neither an external file reference nor a same-document URL reference".
- **SVG 2 §16.1.5** ([linking.html#linkRefAttrs](https://www.w3.org/TR/SVG2/linking.html#linkRefAttrs)): `href` must be a URL, and — critically — "it is impractical for any application to check that a value is a URL reference… this specification… imposes no such conformance testing requirement". **An invalid URL does not make an SVG document non-conforming.** The build-time gate is therefore a *security policy* layered on top of the format, not a spec-conformance check — which is exactly the fail-closed posture FR-002 mandates.
- **SVG 2 §16.1.6** ([linking.html#XLinkRefAttrs](https://www.w3.org/TR/SVG2/linking.html#XLinkRefAttrs)): `xlink:href` is deprecated but still recognized ("elements with an `href` attribute also recognize an `href` attribute in the XLink namespace"); when both are present the non-namespaced one wins. **Both attributes must be validated** — a conforming renderer ignores `xlink:href` when `href` exists, but the gate must not rely on renderer behavior.

### 2.2 The standards' own security model: external references are the disallowed case

- **SVG 2 §16.1.7.1** ([linking.html#processingURL-absolute](https://www.w3.org/TR/SVG2/linking.html#processingURL-absolute)): a URL is split into fragment and non-fragment parts; "If all parts other than the target fragment are equal [to the document base URL], this is a same-document URL reference… Otherwise, the URL references a separate document" and is fetched. Also: "a fragment-only URL in a style property must be treated as a same-document URL reference".
- **SVG 2 §16.1.7.2 "Fetching the document"** ([linking.html#processingURL-fetch](https://www.w3.org/TR/SVG2/linking.html#processingURL-fetch)): "If the document containing the reference is being processed in **secure static mode** or **secure animated mode**, **external file references are disallowed**. Unless the reference is a data URL, the user agent must treat the reference as if there was a network error." And: "If the URL reference is from the href attribute on SVG animation elements, **only same-document URL references are allowed**." This is the standards-body warrant for the recommended rule: in the secure/image processing mode that corresponds to this project's delivery model (masters rasterized to AVIF/WebP/JPEG, never published as SVG), the only legal references are same-document ones.
- **W3C SVG Security wiki, §1.1 "SVG as image"** ([w3.org/wiki/SVG_Security](https://www.w3.org/wiki/SVG_Security#SVG_as_image)): "If an SVG file is fetched as image, then certain requirements apply to this document: **The SVG document is not allowed to fetch any resources.** This also applies to scripts, stylesheets or images." §1.2 adds that SVG resources referenced via `url()` (gradients, filters, clip paths…) "have the same restrictions as SVG images".

### 2.3 Industry sanitizers: allow fragment-only, strip everything else

- **DOMPurify** (the sanitizer named in FR-002's reject-list) validates URI attributes with a scheme-allowlist regex, **not** a "no `#`" rule. `IS_ALLOWED_URI` ([src/regexp.ts](https://github.com/cure53/DOMPurify/blob/main/src/regexp.ts)) is `/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i` — the `[^a-z]` alternative passes any value not starting with a letter, so **`#fragment` and relative references pass**, while `javascript:`, `vbscript:`, etc. fail. In `_isValidAttribute` ([src/purify.ts](https://github.com/cure53/DOMPurify/blob/main/src/purify.ts)), `href`/`xlink:href`/`src` values are tested against this regex (after whitespace stripping); `data:` URIs survive only on `DATA_URI_TAGS` (which includes the SVG `image` element). The README states the default allows "only (protocol-)relative URLs, http, https, ftp, ftps, tel, mailto, callto, sms, cid, xmpp and matrix".
- **DOMPurify's SVG profile** ([src/attrs.ts](https://github.com/cure53/DOMPurify/blob/main/src/attrs.ts)) allows `href` (in the `svg` list) and `xlink:href` (in the `xml` list, added when `USE_PROFILES.svg` is on) — i.e. the sanitizer deliberately keeps these attributes on SVG elements and validates their *values*, rather than rejecting the attributes or fragment values outright.
- **DOMPurify maintainers' recommended pattern for SVG `use`/`xlink:href`** — GitHub issue [#574](https://github.com/cure53/DOMPurify/issues/574) ("Improve the handling of SVG `<use>` element") and issue [#233](https://github.com/cure53/DOMPurify/issues/233): the maintainers' suggested hook is verbatim:
  ```js
  const href = node.getAttribute('xlink:href') || node.getAttribute('href');
  if (href && !href.startsWith('#')) { /* remove the attribute */ }
  ```
  i.e. **allow iff the value starts with `#`; strip everything else**. This is exactly the rule recommended below, endorsed by the maintainers of the industry-standard sanitizer.

### 2.4 Production rasterizers: same-document references are resolved internally; file references are validated per-element

- **librsvg** (the rasterizer under sharp) documents its URL policy in [docs.rs/librsvg](https://docs.rs/librsvg/latest/rsvg/) §"Security and locations of referenced files": it "can load references to external data only in some situations", and its ordered rules include: (2) "URLs with queries ('?') or fragment identifiers ('#') are not allowed" **for file loading**; (6) "non-`file` schemes are not allowed. For example, librsvg will not load `http` resources, to keep malicious SVG data from 'phoning home'"; (7) `file://` with a hostname is rejected; (8) relative URLs must resolve to the base file's directory or a subdirectory (canonicalized, `..` and symlinks resolved). Note the scope: these rules govern **loading external files** — same-document fragment references (`fill="url(#g)"`, `<use href="#foo">`) never reach the file loader at all.
- **Federico Mena-Quintero (librsvg maintainer), "Refactoring allowed URLs in librsvg"** ([viruta.org](https://viruta.org/refactoring-allowed-urls-in-librsvg.html)): the code models references as an enum — `PlainUri(String)` vs `WithFragment(Fragment)` — because "some elements… require full files (`<image xlink:href="foo.png">` — no fragments allowed)" while "others, that reference particular elements in secondary SVGs, require a fragment ID (`<use xlink:href="icons.svg#app_name">`)". A production rasterizer **distinguishes reference kinds per context; it never treats "contains #" as universally invalid.**

### 2.5 OWASP: allowlist over deny-list; don't accept complete URLs

- **OWASP SSRF Prevention Cheat Sheet** ([cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)): "Do not accept complete URLs from the user… **Match the host against an allowlist, and build the request yourself**"; "**Treat parser disagreement as a rejection**" (parsers can read different hosts from the same bytes — relevant here because the gate's regex and librsvg's URL parser must agree); and the summary rule: "**Deny-lists are bypass-prone. Prefer allow-lists.**" The recommended SVG rule is an allowlist over reference *forms* (fragment-only), not a deny-list of bad schemes — consistent with this guidance and with the project's existing `isSafeLocalReference` posture (which is itself an allowlist over path forms).

---

## 3. Recommendation

**Implement a dedicated SVG reference-validation rule inside the FR-002 sanitization gate, separate from `isSafeLocalReference`.** Concretely, for every URL-valued attribute on every element that survives the allow-list:

1. **Validate both `href` and `xlink:href`** wherever present (SVG 2 §16.1.6: both are recognized; validating both is fail-closed and cheap).
2. **Extract the IRI from `url(...)` functional notation** where it appears in presentation attributes (`fill`, `stroke`, `clip-path`, `filter`, `mask`, `marker-*`, `cursor`, …) — SVG 1.1 §17.1.3 defines FuncIRI as the disambiguated form. (The `style` attribute and `<style>` element are rejected entirely per FR-002, so `url()` in CSS is already covered.)
3. **Allow iff the value is fragment-only**: `value.startsWith('#')` — equivalently, the non-fragment part is empty, matching SVG 2's "same-document URL reference" (§16.1.2). Additionally reject values containing whitespace, control characters, or `?` (a fragment-only reference never needs a query; SVG 2 §16.1.7.1 splits on the fragment).
4. **Reject everything else** with a fail-fast throw naming the element/attribute: absolute URLs (`http:`, `https:`, `file:`, any `scheme:`), protocol-relative (`//host/...`), relative paths (`foo.png`, `./foo`, `../foo`), and `data:` (already mandated by FR-002 for all URL-valued attributes).
5. **Do not require the fragment to resolve to an existing ID.** SVG 1.1 §17.1.4 treats an invalid local reference as a rendering error, but it is not a security issue — an unresolved same-document reference causes no fetch and no file access (librsvg/DOMPurify simply drop or ignore it). ID-existence checking is a correctness concern for the Tier B fidelity gate, not for the security gate. (Planning may revisit this if vectorcraft emits forward references.)

**Rationale:**

- **It is the only rule consistent with the SVG standards.** Fragment-only references are the spec's "local IRI references" (SVG 1.1 §17.1.3), the only form most URL-valued attributes may take (§17.1.4), and the only form permitted in secure static mode (SVG 2 §16.1.7.2) — the mode corresponding to this project's image-asset delivery model.
- **It satisfies FR-002's dual mandate in one rule:** internal `url(#…)` remains allowed; external, absolute, protocol-relative, and `data:` references are rejected.
- **It matches industry practice.** DOMPurify's maintainers recommend exactly this `startsWith('#')` pattern for SVG `use`/`xlink:href` (issues #574, #233); DOMPurify's default URI regex permits fragment-only values; librsvg resolves same-document references internally and validates only file references.
- **It protects the build host, which is the gate's stated purpose** (research.md §1: "the gate also protects the build host (SSRF via external refs, XXE/DoS via libxml2)"). A relative-path or protocol-relative `href` on `<image>`/`<use>`/`<feImage>` would make librsvg attempt a file/network load during `sharp` rasterization; the fragment-only rule makes that structurally impossible.
- **It is an allowlist, not a deny-list** (OWASP SSRF guidance), and it is the exact complement of the manifest rule — which is precisely what checklist CHK031 asks to have documented: the two rules are "explicitly distinguished… (different validation, different scope)".

**Error-code suggestion:** `unsafe-svg-reference` (parallel to the existing `unsafe-reference` code in `build.mjs:153`), thrown with the element tag, attribute name, and offending value (value truncated) for actionable fail-fast diagnostics.

---

## 4. Open Questions (for planning)

1. **Fragment syntax validation.** Should the gate validate the fragment as an XML Name (no spaces/control chars beyond XML 1.0 rules), or merely require `^#`? Recommendation: `^#` plus rejection of whitespace/control characters is sufficient and fail-closed; full XML-Name validation is a correctness nicety, not a security requirement.
2. **Empty value.** `href=""` (empty string) — reject (it is a same-document reference to the document root, which is meaningless for the elements in the allow-list and fails the `^#` test anyway).
3. **Elements that legitimately take document references.** If the allow-list ever includes `<image>`, `<feImage>`, or `<a>`, note that SVG 1.1 §17.1.4 permits them to reference non-local resources — but FR-002's posture (and the W3C image-context restrictions) says reject anyway. The fragment-only rule is correct regardless; just document that `<image>`/`<feImage>` masters will be rejected if they reference any file, and prefer inlining such content at authoring time.
4. **Parser-agreement.** OWASP's "treat parser disagreement as a rejection" applies if the gate's regex and librsvg's URL parser could read the same bytes differently. The `^#` rule is parser-independent (no scheme/authority parsing), so there is no disagreement surface — but if the rule is ever relaxed (e.g. to allow same-directory relative references), a real URL parser must be used and both parsers must agree.
5. **Interaction with `xml:base`.** Already rejected by FR-002 — good, because `xml:base` could otherwise rewrite relative references (SVG 2 §16.1.7.1). Keep that rejection; it is load-bearing for the fragment-only rule's guarantees.

---

## Sources

**Standards (W3C / IETF):**
- W3C SVG 1.1 (Second Edition), §17.1.3 "Syntactic forms: IRI and FuncIRI" — https://www.w3.org/TR/SVG11/linking.html#IRIforms
- W3C SVG 1.1, §17.1.4 "Processing of IRI references" — https://www.w3.org/TR/SVG11/linking.html#processingIRI
- W3C SVG 1.1, §17.1.5 "IRI reference attributes" — https://www.w3.org/TR/SVG11/linking.html#xlinkRefAttrs
- W3C SVG 2 (Draft), §16.1.2 "Definitions" — https://www.w3.org/TR/SVG2/linking.html#definitions
- W3C SVG 2, §16.1.5 "URL reference attributes" — https://www.w3.org/TR/SVG2/linking.html#linkRefAttrs
- W3C SVG 2, §16.1.6 "Deprecated XLink URL reference attributes" — https://www.w3.org/TR/SVG2/linking.html#XLinkRefAttrs
- W3C SVG 2, §16.1.7.1 "Generating the absolute URL" — https://www.w3.org/TR/SVG2/linking.html#processingURL-absolute
- W3C SVG 2, §16.1.7.2 "Fetching the document" — https://www.w3.org/TR/SVG2/linking.html#processingURL-fetch
- W3C Wiki, "SVG Security", §1.1 "SVG as image" — https://www.w3.org/wiki/SVG_Security#SVG_as_image

**OWASP:**
- OWASP SSRF Prevention Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

**Sanitizer / rasterizer sources:**
- DOMPurify, `src/regexp.ts` (`IS_ALLOWED_URI`) — https://github.com/cure53/DOMPurify/blob/main/src/regexp.ts
- DOMPurify, `src/purify.ts` (`_isValidAttribute` URI checks) — https://github.com/cure53/DOMPurify/blob/main/src/purify.ts
- DOMPurify, `src/attrs.ts` (svg attribute list incl. `href`; xml list incl. `xlink:href`) — https://github.com/cure53/DOMPurify/blob/main/src/attrs.ts
- DOMPurify README (default allowed URI schemes) — https://github.com/cure53/DOMPurify#control-permitted-attribute-values
- DOMPurify issue #574 (maintainer hook: allow `href` iff `startsWith('#')`) — https://github.com/cure53/DOMPurify/issues/574
- DOMPurify issue #233 (same pattern for `xlink:href` on `<use>`) — https://github.com/cure53/DOMPurify/issues/233
- librsvg crate documentation, "Security and locations of referenced files" — https://docs.rs/librsvg/latest/rsvg/
- Federico Mena-Quintero, "Refactoring allowed URLs in librsvg" (`Href` enum: `PlainUri` vs `WithFragment`) — https://viruta.org/refactoring-allowed-urls-in-librsvg.html

**Project sources:**
- `src/scripts/story-loader.js:39-53` — `isSafeLocalReference` (rejects `#`, `?`, schemes, absolute paths)
- `scripts/build.mjs:134-150` — build-side `isSafeLocalReference` (same posture)
- `specs/003-artcraft-local-authoring/spec.md` — FR-002 batch-2 clarification ("Internal `url(#…`) refs must remain allowed")
- `specs/003-artcraft-local-authoring/checklists/security-svg-sanitization.md` — CHK031 (this document resolves it)
- `specs/003-artcraft-local-authoring/research.md` §1 — gate rationale (protects build host from SSRF/XXE)
