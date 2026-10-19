# Clarification: SVG Sanitization Posture for the Build-Time Gate

**Feature**: `specs/003-artcraft-local-authoring` (FR-002 sanitization gate, FR-013 gate placement)
**Created**: 2026-10-17
**Status**: Research-backed clarification
**Resolves**: the open design questions left by spec.md batch 2 ("Postura híbrida recomendada…") and research.md §1 ("regex-based scanning… since DOMParser is a browser API unavailable in Node"), plus the `SVG_DOS_CAPS` question from batch 8.

---

## 0. Scope and threat model

The gate runs at **build time** in `scripts/build-images.mjs`, before `sourceWidth()`/`encodeImage()`. Masters are authored with `vectorcraft`, are **never published as SVG**, and are rasterized by `sharp`/librsvg. Two distinct assets are being protected:

1. **The build host** (primary). `sharp` rasterizes via librsvg/libxml2, so a master can reach the host's file system (SSRF / file read via external references) and its memory/CPU (XXE, entity expansion, exponential `<use>`/`<pattern>` expansion). `sharp failOn: 'error'` + `limitInputPixels` protect the *encoder*, not the host.
2. **Downstream consumers** (defense-in-depth only). The delivered artifact is AVIF/WebP/JPEG, not SVG, so browser-side script execution is not the operative risk; it is the reason a reject-list floor is still worth keeping.

The security-relevant parser is **librsvg's XML parser**, not the gate's scanner. A gate that reads the bytes differently than librsvg does is not a gate. This is the single most important framing for every answer below.

---

## 1. Direct answers

| # | Question | Verdict |
|---|----------|---------|
| 1 | Posture: (a) hybrid reject-list floor + fail-closed allow-list, (b) reject-list only, (c) allow-list only? | **(a) Hybrid — allow-list is the primary control, reject-list is a never-removable floor.** |
| 2 | `<style>` element and `style` attribute: hard-reject or prefer-reject? | **Hard-reject both** for authored masters (promote the spec's "preferring" to "must"). |
| 3 | Regex-based scanning of SVG text acceptable, or real XML parser required? | **Real XML parser required (or a fail-closed, spec-strict tokenizer). Regex-only scanning is not acceptable.** Additionally: parse → filter → **re-serialize** → rasterize the canonical output, not the original bytes. |
| 4 | Do static element-count / nesting-depth caps bound `<use>`/`<symbol>` expansion? | **No. A dedicated reference-graph guard (expansion budget + depth cap + circular-reference rejection) is required.** Static caps are necessary but not sufficient. |

---

## 2. Sub-question 1 — Sanitization posture

### 2.1 Answer

Adopt **(a) the hybrid posture**: a **fail-closed allow-list over the minimal vocabulary `vectorcraft` emits** as the *primary* control, plus the **enumerated reject-list as a floor**. The allow-list is what makes the gate provably closed over a known finite input language; the reject-list is defense-in-depth, gives actionable diagnostics, and carries the *value-level* rules (URL schemes, `data:`, CSS vectors) that an element/attribute allow-list expresses awkwardly.

This matches what the spec already proposes; the research below upgrades the rationale from "recommended" to "supported by OWASP, the sanitizer literature, and the fail-safe-defaults principle".

### 2.2 Evidence

- **OWASP — allow-list over deny-list.** The Input Validation Cheat Sheet's *Allowlist vs Denylist* section: "Define what the application accepts and reject values outside those rules. **Do not try to recognize every malicious string.**" The same sheet lists "**Denylisting or 'cleaning' input**" as a Common Pitfall. The SSRF Prevention Cheat Sheet is blunter: "**Deny-lists are bypass-prone. Prefer allow-lists.**"
- **OWASP — sanitization must be a maintained library, not ad-hoc rules.** The XSS Prevention Cheat Sheet: "When users need to author HTML… **HTML Sanitization** should be used… OWASP recommends DOMPurify." The Input Validation Cheat Sheet: "When accepting user-authored HTML, use a maintained HTML sanitization library. **Input validation and regular expressions cannot replace that control.**"
- **DOMPurify's own model is a default-deny allow-list.** The threat model: "DOMPurify's secure **defaults are the product**. Most application-specific bypasses are born the moment someone widens the allow-list (`ADD_TAGS`, `ADD_ATTR`, …)." The allow-list governs what is *kept*; anything not kept is removed. That is a fail-closed default.
- **Saltzer & Schroeder — fail-safe defaults.** "The protection of information in computer systems" (Proc. IEEE 63(9), 1975) lists **fail-safe defaults** among the eight design principles: base access decisions on permission rather than exclusion. An allow-list is the fail-safe-default instantiation; a reject-list is the exclusion (deny-list) model the principle warns against.
- **The input language is finite and known, which is exactly when an allow-list is tractable.** `vectorcraft` emits a small, enumerable SVG subset (paths/shapes/gradients/`<use>`/`<defs>`). This is the precondition OWASP names for allow-listing ("Fixed choices → exact membership in the allowed set").
- **The reject-list still earns its place** because: (i) it documents the threat model in code; (ii) it yields precise errors (`script element rejected` vs `element not in allow-list`) which matters for a fail-fast build; (iii) it survives a future *widening* of the allow-list (DOMPurify's history is a catalogue of bypasses introduced by widening the allow-list); (iv) some rules are value-level, not name-level (reject all `data:` URIs in URL-valued attributes; reject `javascript:`-class schemes) and are cleaner as explicit denies than as a giant attribute-value grammar.

### 2.3 Options and tradeoffs

| Option | Strengths | Weaknesses | Verdict |
|---|---|---|---|
| **(a) Hybrid: allow-list (primary) + reject-list (floor)** | Fail-closed over a known finite language; explicit threat model; actionable errors; survives allow-list widening; covers value-level rules | Two lists to maintain; risk of drift between them | **Recommended** |
| (b) Reject-list only | Least code; easy to read | Deny-lists are bypass-prone (OWASP); cannot enumerate all malicious strings; the finite known vocabulary makes this strictly worse than (a) | Reject |
| (c) Allow-list only | Functionally subsumes the reject-list; single source of truth; strongest default-deny | Weaker diagnostics; no defense-in-depth if the allow-list is later widened; element/attribute allow-lists express value-level URL/CSS rules poorly | Acceptable simplification, but (a) is preferred |

### 2.4 Recommendation

Keep **(a)**, and make the floor explicit and non-removable:

- **Primary control:** element allow-list + attribute allow-list + attribute-value grammar (per element), fail-closed on anything unlisted.
- **Floor:** the FR-002 reject-list, retained as explicit denies that must fire *even if* a future change widens the allow-list.
- **No "prefer" language in code:** the floor is a `throw`, not a warning.

---

## 3. Sub-question 2 — `<style>` element and `style` attribute

### 3.1 Answer

**Hard-reject both** for authored masters. The spec's "preferring to reject the `<style>` element and the `style` attribute entirely" should be promoted to a hard requirement. The vocabulary that survives is SVG **presentation attributes** (`fill`, `stroke`, `opacity`, `transform`, …), which are the SVG-native styling mechanism and are not affected.

### 3.2 Evidence

- **DOMPurify is explicitly *not* a CSS sanitizer.** Its threat model states: "DOMPurify is not a CSS sanitizer. Both the `<style>` *element* and the `style` *attribute* are allowed by default (DOMPurify keeps CSS)… **If you don't need CSS, drop it with `FORBID_TAGS: ['style']` and `FORBID_ATTR: ['style']`; if you keep it, you own the CSS risk.**" That "own the CSS risk" is the whole problem: accepting CSS means accepting a second language with its own parsing, URL-fetching, and legacy-engine semantics that the gate would then have to sanitize.
- **CSS-based exfiltration is real and out of scope for a non-CSS sanitizer.** Same page, *Non-Goals*: "DOMPurify does not stop CSS-based data exfiltration (attribute-selector + resource-URL tricks)". See also the H5SC CSS attack corpus.
- **`<style>` is a rawtext-like element whose text is serialized unescaped**, which is a parser-state hazard: "Its text is serialized *unescaped*, so a node-built `<style>` carrying an element child or `</style>` in its text would re-open markup on reparse" (DOMPurify threat model, `style` element row). In an XML/SVG context this is the same class of hazard as the HTML rawtext breakouts documented in DOMPurify's *Attack Classes* page §5.
- **OWASP classifies `<style>` as a "dangerous context".** The XSS Prevention Cheat Sheet's *Dangerous Contexts* list includes `<style>Directly in CSS</style>`: "Don't place variables into dangerous contexts as even with output encoding, it will not prevent an XSS attack fully."
- **The FR-002 legacy CSS vectors all vanish if `style` is rejected wholesale:** `expression()`, `-moz-binding`, `behavior:`, `@import`, `image-set()`, and `url()` in CSS. Rejecting the container is cheaper and safer than enumerating the vectors inside it.
- **Counterpoint (W3C).** The W3C *SVG Security* wiki notes that in the "SVG as image" context "The style attribute and the style element can style the document. **Restricting these is unpractical. A lot of content already relies on CSS styling** and would be broken by changing any default setting." This is the general-purpose-content argument — it does not apply here: the author controls the exporter, the vocabulary is known, and presentation attributes cover the styling the comic needs. It is the reason to reject *only* the two CSS containers, not presentation attributes.

### 3.3 Options and tradeoffs

| Option | Strengths | Weaknesses | Verdict |
|---|---|---|---|
| **A. Hard-reject `<style>` and `style`** | Removes an entire second language and its parser/fetch/legacy semantics; cheap; matches DOMPurify's own advice when CSS isn't needed; no CSS sanitizer required | Loses CSS-only properties (`mix-blend-mode`, `isolation`, `will-change`, …); authoring tool must emit presentation attributes | **Recommended** |
| B. "Prefer-reject" but allow a strict CSS property allow-list | Keeps a few CSS-only properties | Requires a real CSS parser/sanitizer the project does not have; DOMPurify explicitly declines this job; every property value is a potential `url()` sink; large test surface | Reject for now (revisit only with a vetted CSS sanitizer) |
| C. Allow `<style>`/`style` as-is | Simplest for the author | CSS exfiltration; rawtext reparse hazard; legacy CSS vectors; contradicts FR-002 | Reject |

### 3.4 Recommendation

**Hard-reject.** Concretely:

1. `<style>` is not in the element allow-list; `style` is not in any element's attribute allow-list. Both are also on the reject-list so they fail with a named error (`css-container-rejected`).
2. **Also reject the `class` attribute *if and only if* it is meaningless without a stylesheet** — with `<style>` gone, `class` is inert, so either drop it (simpler) or keep it (harmless). Prefer dropping it to keep the allow-list minimal.
3. Document in `docs/authoring.md` that `vectorcraft` must be configured to **emit presentation attributes, not a `<style>` block**. This is the actionable consequence of the decision.
4. If a specific CSS-only property is later proven necessary, that is a *deliberate, tested* relaxation: add a real CSS value parser and a per-property allow-list, and re-run the mXSS/reparse tests. Do not "just allow `style`".

---

## 4. Sub-question 3 — Regex scanning vs a real XML parser

### 4.1 Answer

**A regex scan over SVG text is not an acceptable primary control. Use a real XML parser (or, at minimum, a spec-strict, fail-closed tokenizer).** And go one step further: **parse → filter the tree against the allow-list → re-serialize canonically → hand the canonical bytes to `sharp`/librsvg**, rather than scanning the original bytes and passing the original file to `sharp`.

Narrow lexical checks are *legitimate as complements* (e.g., a pre-parser tripwire), but they are not a substitute for parsing. The DOMPurify project states the rule directly:

> "**Do not use regex to sanitize HTML.** Do use narrow lexical checks to reject inputs whose parser state cannot be safely recovered from the DOM. **There is no general HTML sanitizer regex.** But there may be one very specific regex to rule one very specific parser-mutation class."

### 4.2 Evidence

- **Regexes cannot model a context-free grammar, and XSS-filter regexes were formally shown to be unsound.** Bates, Barth & Jackson, "**Regular expressions considered harmful in client-side XSS filters**" (WWW 2010, DOI 10.1145/1772690.1772701) is the canonical primary source; the DOMPurify paper's reference list cites it for exactly this reason.
- **Parser mutation / parse asymmetry (mXSS) is the reason "scan the text" fails.** Heiderich, Schwenk, Frosch, Magazinius & Yang, "**mXSS attacks: attacking well-secured web-applications by using innerHTML mutations**" (CCS 2013, DOI 10.1145/2508859.2516723) established that markup inert in the tree a sanitizer inspects can become active after a serialize/reparse round-trip. DOMPurify's current threat model restates the class: "A large share of modern bypasses are not 'forgot to remove `<script>`' but *parse asymmetry*."
- **The sanitizer literature's own conclusion is that parsing, not pattern-matching, is the control.** DOMPurify's *Attack Classes* §8 ("Where DOM-only sanitization is not enough") and §7 ("Nesting-based mXSS") conclude that the defense is "**parse symmetry plus namespace integrity, not depth alone**", and that a DOM walk must be complemented by "narrow, fail-closed, auditable" lexical guards *only* for parser-state hazards the tree cannot represent.
- **OWASP says the same for input validation and XML.** Input Validation Cheat Sheet: "**Parse Safely, Then Validate** — Use a maintained parser for the expected format, handle parsing failures, and validate the resulting values before business processing… A schema check after parsing cannot protect a parser that has already exhausted resources." XML Security Cheat Sheet: "developers should use an XML processor that **follows W3C specifications**… only use well-formed documents… validate the contents of each element."
- **XML is *stricter* than HTML, which helps — but only if the gate actually parses.** XML has no error recovery: "If an XML document is malformed, the XML parser will detect a **fatal error**, it should stop execution, the document should not undergo any additional processing" (OWASP XML Security CS). So there is no foster-parenting/repair surface as in HTML. The residual disagreement surface is *entity decoding, CDATA, comments/PIs, attribute normalization, and namespaces* (see §4.3).
- **The gate must protect the host before librsvg runs, and must agree with librsvg.** The gate's scanner and librsvg's parser are two parsers over the same bytes; OWASP's SSRF guidance applies: "**Treat parser disagreement as a rejection.**" Re-serializing the canonical, allow-listed tree from a real parse is how you make disagreement structurally impossible.

### 4.3 Concrete parser-disagreement vectors (why regex is unsafe here)

These are not hypotheticals; they are the exact ways a regex over raw text and librsvg over parsed XML can read the same bytes differently:

1. **Character references in attribute values.** `href="java&#x73;cript:alert(1)"` is `javascript:alert(1)` to a parser but does not match a naive `javascript:` regex. Likewise `href="&#35;frag"` is the fragment `#frag` (should be *allowed* by the SVG reference rule) but a naive `startsWith('#')` regex rejects it, while `href="&#x64;ata:text/html,..."` is `data:` (must be *rejected*) but a naive `data:` regex misses it. **A scanner that does not decode character references is wrong in both directions.**
2. **`<` in tag position cannot be entity-encoded**, so entity-encoded tag names (`&#x3c;script&#x3e;`) are *text*, not elements — a regex will produce false positives here, and, worse, a regex that strips comments/CDATA naively can be tricked into *removing* a real tag from its view.
3. **CDATA sections and comments.** `<![CDATA[ <script> ]]>` and `<!-- <script> -->` are not elements; a regex either false-positives or, if it tries to strip them, can be made to strip the wrong span. Reject CDATA and comments outright (fail-closed) rather than pattern-matching them.
4. **Namespaces and prefixes.** `<svg:script>` / `<x:script xmlns:x="http://www.w3.org/2000/svg">` are the `script` element in the SVG namespace. A name-based regex misses the prefix; a parser resolves it. DOMPurify's own history is a catalogue of **namespace-confusion** bypasses (threat model: "never disable the namespace check").
5. **Attribute normalization and duplicate attributes.** XML normalizes whitespace in attribute values and forbids duplicate attribute names; a regex sees the raw bytes.
6. **Processing instructions** (`<?xml-stylesheet ...?>`) and **`xml:base`**, which can rewrite relative references (SVG 2 §16.1.7.1) — reject both; a parser sees them, a naive scanner may not.

### 4.4 Architectural recommendation: parse → filter → re-serialize → rasterize

The strongest and simplest way to eliminate the parser-disagreement surface:

1. **Parse** the master with a real XML parser configured to **not** process DTDs, external entities, or XInclude. In Node this means either a small maintained parser dependency (e.g. a streaming, DTD-free parser such as `saxes`) **or** a hand-written, spec-strict, fail-closed tokenizer. (Note: the project's "no new dependency" rationale in research.md §1 rejected DOMPurify/`svg-sanitizer`; a focused XML parser is a much smaller ask and should be weighed explicitly at planning time — see Options.)
2. **Reject** on any construct the tokenizer/parser does not fully understand (DOCTYPE, CDATA, PIs, comments, entity references beyond the five predefined, unknown namespaces, non-allow-listed elements/attributes, bad attribute-value grammars).
3. **Decode** character references in attribute values *before* applying the URL/fragment rule.
4. **Re-serialize** the filtered tree canonically (the gate's own output), and **hand those bytes to `sharp`** rather than the original file. This is the mXSS/parse-symmetry defense in the build context: librsvg never sees the author's bytes, only a document the gate itself produced from an allow-listed tree.
5. Keep `sharp failOn: 'error'` + `limitInputPixels` as backstops, and (optionally) re-parse the canonical output once and assert it is unchanged (an idempotence/round-trip check, mirroring DOMPurify's "parse → sanitize → serialize → parse again" regression discipline).

### 4.5 Options and tradeoffs

| Option | Strengths | Weaknesses | Verdict |
|---|---|---|---|
| **A. Real XML parser (small dep) + filter + re-serialize** | Spec-correct; entity/namespace/CDATA handled; re-serialization removes parser disagreement; auditable | One new dependency (against the current "no new deps" stance) | **Recommended** |
| **B. Hand-written fail-closed tokenizer + filter + re-serialize** | No dependency; can be made safe by rejecting everything ambiguous (DOCTYPE/CDATA/PI/comments/entities) | Security-critical parsing code is easy to get subtly wrong; must be fuzzed and reviewed | Acceptable fallback if the dependency is refused |
| C. Regex scanning of original bytes (current research.md plan) | No dependency; trivial | Unsound: entity decoding, CDATA, namespaces, comments; contradicts OWASP and the regex-harm literature; cannot be made fail-closed without reinventing a tokenizer | **Reject** |

---

## 5. Sub-question 4 — Do static DoS caps bound `<use>`/`<symbol>` expansion?

### 5.1 Answer

**No.** A static file-size / element-count / nesting-depth cap does **not** bound `<use>`/`<symbol>` (or `<pattern>`) expansion, because the blow-up lives in the **reference graph**, not in the XML tree. A dedicated guard is required: a budget on resolved references / instantiated elements, a reference-depth cap, and rejection of circular references.

### 5.2 Why static caps are insufficient

- **Amplification is exponential in the reference chain but linear in the file.** A chain of `<use>` elements where each level references the next level *N* times renders *N*<sup>depth</sup> objects from a tiny document. The XML is shallow (the `<use>` elements can be siblings, at nesting depth 2) and small, so **both** the element-count cap (10 000) and the nesting-depth cap (100) pass while rendering explodes.
- **Cycle detection alone is not enough.** The attack works with an **acyclic** chain: `a` contains *N* `<use href="#b">`, `b` contains *N* `<use href="#c">`, … Each reference is used once; there is no cycle. You need a **budget** on the number of resolved references / instantiated elements, not just a cycle check.
- **`<pattern>` has the same shape** via `fill="url(#next_pattern)"`: each object inside each pattern references the next pattern, and the rendered object count grows exponentially.

### 5.3 Evidence (primary)

- **librsvg's own limits file documents both attacks and why a separate counter was needed.** `internals/src/rsvg/limits.rs` (librsvg) introduces `MAX_REFERENCED_ELEMENTS = 500_000` with the comment: *"Imagine the XML [billion laughs attack], but done in SVG's terms: #323 creates deeply nested groups of `<use>` elements. The first one references the second one ten times, the second one references the third one ten times, and so on. In the file given, this causes **10^17 objects to be rendered**… #515 has deeply nested references of `<pattern>` elements… the number of final rendered objects grows exponentially. We deal with both cases by placing a limit on **how many references will be resolved**."* The existence of a *separate* `MAX_REFERENCED_ELEMENTS` counter — distinct from `MAX_LOADED_ELEMENTS` (1 000 000) and `MAX_LAYER_NESTING_DEPTH` (500/50) — is the direct proof that element count and nesting depth do not bound expansion.
- **CVE-2019-20446** (librsvg < 2.46.2): "a crafted SVG file with nested patterns can cause denial of service… The attacker constructs pattern elements so that the **number of final rendered objects grows exponentially**." References librsvg issue #515. This is the `<pattern>` half of the class.
- **CVE-2026-29074** (`SVGO`, CWE-776, CVSS 7.5): a **811-byte** SVG with a custom-entity `DOCTYPE` "stalling the application and even crashing the Node.js process with JavaScript heap out of memory." Two lessons: (i) a byte cap alone is useless (the file is < 1 KB); (ii) a *Node* SVG-processing library was the victim — the same runtime as this build.
- **SVG 2 defines circular references as invalid** (§16.1.2): "URL references that directly or indirectly reference themselves are treated as invalid circular references." So rejecting cycles is standards-aligned — but, per §5.2, it does not by itself stop the acyclic multiplication.
- **SVG 2 places no size limits on content.** Conformance §2.4.1: "The SVG language and these conformance criteria provide **no designated size limits** on any aspect of SVG content. There are no maximum values on the number of elements, the amount of character data, or the number of characters in attribute values." The implementer must impose its own.
- **OWASP DoS guidance** supports budgeting *derived* work, not just input size: "Prevent input based resource allocation" and "Prevent input based function and threading interaction: User input can influence how many times a function needs to be executed."

### 5.4 Proposed dedicated guard

Keep the four static caps (they bound memory and stack) and **add a reference-graph budget**:

```js
export const SVG_DOS_CAPS = {
  // static (already agreed, batch 8) — necessary but NOT sufficient
  maxFileBytes: 1_048_576,          // 1 MB
  maxElements: 10_000,
  maxNestingDepth: 100,
  maxAttributesPerElement: 256,

  // reference-graph / expansion (NEW — the actual bound on <use>/<pattern>)
  maxReferenceDepth: 20,            // depth of a url(#…) resolution chain (librsvg MAX_FILE_LOADING_DEPTH = 20)
  maxResolvedReferences: 10_000,    // total url(#…) resolutions (librsvg MAX_REFERENCED_ELEMENTS = 500_000; we are far stricter)
  maxInstantiatedElements: 50_000,  // total elements after <use>/<pattern> expansion
  rejectCircularReferences: true,   // SVG 2 §16.1.2
};
```

Implementation notes:

- Build an **ID → element** map and a **reference graph** over the allow-listed tree (`<use>`, `<pattern>`, gradient `href`, `clip-path`/`mask`/`filter`/`marker-*`/`fill`/`stroke` = `url(#…)`).
- Traverse with memoization and a **running budget**: count resolved references and instantiated elements; `throw` (`svg-expansion-budget-exceeded`) when either cap is hit. This is what makes the *acyclic* case safe.
- Track the current chain to **reject cycles** (`svg-circular-reference`).
- The numbers are project-chosen and should be tuned to `vectorcraft`'s real output (a 1200×800 illustration is tiny); the important thing is the **dimension** (a budget on derived work), not the exact value.
- librsvg's `MAX_REFERENCED_ELEMENTS` / `MAX_LOADED_ELEMENTS` remain backstops, never the primary control — the gate must stop the input **before** librsvg spends the work.

### 5.5 Options and tradeoffs

| Option | Strengths | Weaknesses | Verdict |
|---|---|---|---|
| **A. Static caps + reference-graph budget + cycle rejection (above)** | Bounds the actual amplification; standards-aligned cycle rule; cheap to compute on a tiny document | Requires a small graph traversal | **Recommended** |
| B. Static caps only (current FR-002) | Simplest | Does not bound `<use>`/`<pattern>` expansion at all; librsvg documents 10^17 objects from a small file | Reject |
| C. Rely on librsvg's own limits (500 k references) | No gate code | The gate's stated purpose is to protect the host *before* librsvg; 500 k resolved references is still expensive; and it is not a *build-time* failure | Reject as the only control (keep as backstop) |

---

## 6. Recommended consequences for FR-002 / spec text

These are recommendations for the planning step; they are recorded here so the clarification is actionable.

1. **Promote "preferring to reject `<style>`/`style`" to "must reject"** (hard-reject), with `docs/authoring.md` telling authors to emit presentation attributes.
2. **Replace the regex-scanning plan** with: parse with a real XML parser (or fail-closed tokenizer) with DTD/external-entity/XInclude processing disabled; decode character references in attribute values; validate the parsed tree; **re-serialize and rasterize the canonical output**.
3. **Add the reference-graph caps** to `SVG_DOS_CAPS` and require rejection of circular references (SVG 2 §16.1.2).
4. **Keep the reject-list as an explicit floor** that must fire even if the allow-list is later widened.
5. **Keep the existing static caps** (1 MB / 10 000 / 100 / 256) — necessary, not sufficient.

---

## 7. Open questions (for planning)

1. **Dependency vs hand-written tokenizer.** Is a small, DTD-free XML parser dependency acceptable, or must the gate stay dependency-free with a hand-written fail-closed tokenizer? (This is the one place the research argues the current "no new deps" stance may need revisiting.)
2. **Re-serialize vs validate-only.** If the gate re-serializes and `sharp` rasterizes the canonical output, does any fidelity check (Tier B) need to compare against the *original* master or the canonical one? (They should be identical for allow-listed content; the round-trip check makes that explicit.)
3. **Allow-list vocabulary.** Finalize the `vectorcraft` element/attribute set (deferred by the spec). Include `use`/`symbol`/`defs`/gradients/`clipPath`/`mask`; decide on `filter` primitives, `text`/`tspan`, `marker`.
4. **Expansion cap values.** Tune `maxResolvedReferences` / `maxInstantiatedElements` to real `vectorcraft` output with headroom.
5. **Round-trip assertion.** Should the gate re-parse its own canonical output and assert stability (idempotence) as a hard check, or is that overkill for a build gate?
6. **`class` attribute.** Drop it (inert without `<style>`) or keep it (harmless)? Prefer drop for a minimal allow-list.

---

## Sources

**Standards (W3C / IETF):**
- W3C SVG 2, §16.1.2 "Definitions" (same-document vs external vs data URL; **circular reference** treated as invalid) — https://www.w3.org/TR/SVG2/linking.html#definitions
- W3C SVG 2, §16.1.5 "URL reference attributes" — https://www.w3.org/TR/SVG2/linking.html#linkRefAttrs
- W3C SVG 2, §16.1.7.1 "Generating the absolute URL" (`xml:base`) — https://www.w3.org/TR/SVG2/linking.html#processingURL-absolute
- W3C SVG 2, §16.1.7.2 "Fetching the document" (secure static/animated mode disallows external file references) — https://www.w3.org/TR/SVG2/linking.html#processingURL-fetch
- W3C SVG 2, §2.2.6 "Secure static mode" (no script, no external refs, no animation, no interactivity) — https://www.w3.org/TR/SVG2/conform.html#secure-static-mode
- W3C SVG 2, §2.3 "Processing modes for SVG sub-resource documents" (`use` references processed in secure static mode) — https://www.w3.org/TR/SVG2/conform.html#referencing-modes
- W3C SVG 2, §2.4.1 (no designated size limits on SVG content) — https://www.w3.org/TR/SVG2/conform.html#ConformingSVGDOMSubtrees
- W3C Wiki, "SVG Security", §1.1 "SVG as image" (no resource fetching; style restriction "unpractical") — https://www.w3.org/wiki/SVG_Security

**OWASP Cheat Sheets:**
- Input Validation — allowlist vs denylist; "Parse Safely, Then Validate"; regex limits; HTML sanitization needs a library — https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- Cross Site Scripting Prevention — HTML sanitization (DOMPurify); "dangerous contexts" incl. `<style>` — https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- XML External Entity Prevention — disable DTDs; reject DOCTYPE; keep XInclude disabled; fail on unsupported settings; libxml2 `XML_PARSE_NOENT`/`XML_PARSE_DTDLOAD` — https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html
- XML Security — malformed documents, parser recovery, coercive parsing, jumbo payloads, entity expansion / billion laughs — https://cheatsheetseries.owasp.org/cheatsheets/XML_Security_Cheat_Sheet.html
- Server Side Request Forgery Prevention — "Deny-lists are bypass-prone. Prefer allow-lists."; "Treat parser disagreement as a rejection" — https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- Denial of Service — cheap validation first; prevent input-based resource allocation — https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html

**Sanitizer / rasterizer (primary project sources):**
- DOMPurify, "Security Goals & Threat Model" (mXSS/parse asymmetry; not a CSS sanitizer; `<style>`/`style` default-allowed with `FORBID_*` guidance; "sanitize for the exact sink"; server-side DOM is part of the TCB) — https://github.com/cure53/DOMPurify/wiki/Security-Goals-&-Threat-Model
- DOMPurify, "Attack Classes & Bypass History" ("Do not use regex to sanitize HTML"; parse → sanitize → serialize → parse again; depth-limit flattening; namespace confusion; rawtext breakouts) — https://github.com/cure53/DOMPurify/wiki/Attack-Classes-&-Bypass-History
- DOMPurify issue #574 (maintainer-endorsed hook: allow `href` iff it `startsWith('#')`) — https://github.com/cure53/DOMPurify/issues/574
- librsvg, `internals/src/rsvg/limits.rs` (`MAX_REFERENCED_ELEMENTS = 500_000` with the `<use>`/`<pattern>` billion-laughs comment; `MAX_LOADED_ELEMENTS`, `MAX_LOADED_ATTRIBUTES`, `MAX_FILE_LOADING_DEPTH`, `MAX_LAYER_NESTING_DEPTH`) — https://docs.rs/librsvg/latest/src/rsvg/limits.rs.html
- librsvg crate docs, "Security and locations of referenced files" — https://docs.rs/librsvg/latest/rsvg/
- Federico Mena-Quintero, "Refactoring allowed URLs in librsvg" (`Href` enum: `PlainUri` vs `WithFragment`) — https://viruta.org/refactoring-allowed-urls-in-librsvg.html

**Vulnerability records:**
- CVE-2019-20446 — librsvg < 2.46.2, nested `<pattern>` elements → exponential final rendered objects (DoS) — https://cveawg.mitre.org/api/cve/CVE-2019-20446 · https://nvd.nist.gov/vuln/detail/CVE-2019-20446
- CVE-2026-29074 / GHSA-xpqw-6gx7-v673 — SVGO DoS via `DOCTYPE` entity expansion (Billion Laughs), CWE-776, CVSS 7.5, from an 811-byte file — https://github.com/svg/svgo/security/advisories/GHSA-xpqw-6gx7-v673 · https://cveawg.mitre.org/api/cve/CVE-2026-29074

**Academic papers:**
- Heiderich, Frosch, Jensen, Holz. "Crouching Tiger – Hidden Payload: Security Risks of Scalable Vectors Graphics." CCS '11, pp. 239–250. DOI [10.1145/2046707.2046735](https://doi.org/10.1145/2046707.2046735)
- Heiderich, Schwenk, Frosch, Magazinius, Yang. "mXSS Attacks: Attacking well-secured Web-Applications by using innerHTML Mutations." CCS '13, pp. 777–788. DOI [10.1145/2508859.2516723](https://doi.org/10.1145/2508859.2516723)
- Bates, Barth, Jackson. "Regular Expressions Considered Harmful in Client-Side XSS Filters." WWW '10, pp. 91–100. DOI [10.1145/1772690.1772701](https://doi.org/10.1145/1772690.1772701)
- Heiderich, Späth, Schwenk. "DOMPurify: Client-Side Protection Against XSS and Markup Injection." ESORICS 2017, LNCS, pp. 116–134. DOI [10.1007/978-3-319-66399-9_7](https://doi.org/10.1007/978-3-319-66399-9_7)
- Saltzer & Schroeder. "The Protection of Information in Computer Systems." Proc. IEEE 63(9), pp. 1278–1308, 1975 (fail-safe defaults). DOI [10.1109/PROC.1975.9939](https://doi.org/10.1109/PROC.1975.9939)
- H5SC — CSS attack corpus — https://html5sec.org/?css

**Project sources:**
- `spec.md` — FR-002 (reject-list floor + hybrid posture), FR-013 (gate placement)
- `research.md` §1 (sanitization decision; regex-scanning plan challenged by §4 above)
- `research/clarifications/svg-reference-rule.md` — SVG `href`/`xlink:href` fragment-only rule (complementary; unaffected by this clarification)
- `checklists/security-svg-sanitization.md` — CHK011–CHK029
- `scripts/build-images.mjs` — `sourceWidth()`/`encodeImage()` (gate runs before these)
