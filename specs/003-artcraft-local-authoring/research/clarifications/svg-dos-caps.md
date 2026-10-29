# Clarification: SVG DoS Caps — Measurable Limits, Normative Location, and Render-Time Expansion

**Feature**: `specs/003-artcraft-local-authoring` (FR-002 SVG sanitization gate)
**Created**: 2026-10-17
**Status**: Research-backed clarification (resolves the batch-8 open question — "What are recommended measurable DoS limits for build-time SVG processing, where should they be normatively defined, and are static caps on parsed elements sufficient?")

---

## 1. Direct Answer / Recommendation

### 1.1 Recommended measurable DoS limits

The batch-8 values (file ≤ 1 MB, elements ≤ 10 000, depth ≤ 100, attrs/element ≤ 256) are **well-grounded and appropriate** for the 1200×800 authoring target. Each is 10–256× tighter than the corresponding librsvg/libxml2 limit, which is the correct posture for a build-time gate that must fail-fast on hostile or degenerate input **before** it reaches the rasterizer:

| Dimension | Proposed cap | Nearest librsvg / libxml2 limit | Ratio | Verdict |
|---|---|---|---|---|
| File bytes | ≤ 1 MB (1 048 576 B) | librsvg has **no** byte cap; libxml2 `XML_MAX_TEXT_LENGTH` = 10 MB per node | — | Sensible for 1200×800 authored art |
| Element count | ≤ 10 000 | `MAX_LOADED_ELEMENTS` = 1 000 000 | 100× tighter | Appropriate — authored frames are small |
| Nesting depth | ≤ 100 | `MAX_LAYER_NESTING_DEPTH` = 500 (glibc) / 50 (musl); libxml2 `xmlParserMaxDepth` = 256 | Between musl's 50 and libxml2's 256 | Reasonable middle ground |
| Attributes/element | ≤ 256 | `MAX_LOADED_ATTRIBUTES` = 65 535 | 256× tighter | Appropriate — real SVG uses <20 attrs/element |

**Keep the four values as-is.** They are measurable, fail-fast, and already referenced by FR-002, `data-model.md`, and the checklist.

### 1.2 Where to normatively define them

**The current arrangement is the recommended pattern:** FR-002 names the *dimensions* (the "what"), `data-model.md` holds the *values* (the normative "how much"), and `scripts/svg-sanitize.mjs` exposes them as the `SVG_DOS_CAPS` constant (the implementation). See §3 for the tradeoffs.

### 1.3 Are static caps on parsed elements sufficient?

**No.** Static caps on the *parsed* element tree are necessary but **not sufficient**. The librsvg project's own security history proves that `<use>` and `<pattern>` elements expand at **render time** into exponentially more objects than the file contains:

- librsvg issue **#323**: deeply nested `<use>` groups — each references the next 10× — causing 10¹⁷ rendered objects from a small file.
- librsvg issue **#515** / **CVE-2019-20446**: nested `<pattern>` elements where each object has `fill="url(#next_pattern)"`, so rendered objects grow exponentially.
- librsvg's mitigation is `MAX_REFERENCED_ELEMENTS = 500 000` — a budget on how many `url(#foo)` references get **resolved during rendering**, not on how many elements get **parsed**.

A build-time gate that only counts parsed elements would pass a file that explodes during sharp/librsvg rasterization. **A separate guard is needed.** See §2.4 for the recommendation.

---

## 2. Key Findings with Citations

### 2.1 librsvg `limits.rs` — the canonical render-time + load-time budget

Source: [`internals/src/rsvg/limits.rs`](https://gnome.pages.gitlab.gnome.org/librsvg/internals/src/rsvg/limits.rs.html) (verbatim, current main):

| Constant | Value | Scope | What it mitigates |
|---|---|---|---|
| `MAX_REFERENCED_ELEMENTS` | 500 000 | **Render-time** — total `url(#foo)` resolutions | Billion-laughs via `<use>`/`<pattern>` (#323, #515) |
| `MAX_LOADED_ELEMENTS` | 1 000 000 | **Load-time** — elements in the streaming parse | Millions of elements exhausting memory |
| `MAX_LOADED_ATTRIBUTES` | 65 535 (`u16::MAX`) | **Load-time** — attributes per single element | `<foo attr1="blah" attr2="blah" …/>` |
| `MAX_FILE_LOADING_DEPTH` | 20 | **Load-time** — nested file inclusion (XInclude, `<image>`, CSS includes) | Recursively self-referencing files |
| `MAX_LAYER_NESTING_DEPTH` | **500** (glibc) / **50** (musl) | **Render-time** — layer nesting during rendering | Stack exhaustion |

> **Factual correction for the spec:** the batch-8 clarification and checklist say `MAX_LAYER_NESTING_DEPTH = 50`. That is the **musl-only** value. On Linux glibc (the build host), the value is **500**. The spec should cite both or cite "500 (glibc) / 50 (musl)".

The critical design insight: librsvg separates **load-time** caps (`MAX_LOADED_ELEMENTS`, `MAX_LOADED_ATTRIBUTES`, `MAX_FILE_LOADING_DEPTH`) from **render-time** caps (`MAX_REFERENCED_ELEMENTS`, `MAX_LAYER_NESTING_DEPTH`). This is the direct answer to Q3 — even the most hardened SVG renderer does not rely on parse-time caps alone.

### 2.2 libxml2 — the underlying XML parser's own budget

librsvg parses SVG with libxml2. libxml2 enforces its own limits ([`parserInternals.h`](https://gnome.pages.gitlab.gnome.org/libxml2/html/parserInternals_8h.html), [`parser.h`](https://gnome.pages.gitlab.gnome.org/libxml2/html/parser_8h.html)):

| Constant / API | Default | Purpose |
|---|---|---|
| `xmlParserMaxDepth` | **256** | Maximum element nesting depth (without `XML_PARSE_HUGE`) |
| `XML_MAX_TEXT_LENGTH` | **10 000 000** (10 MB) | Max size of a single text node |
| `XML_MAX_NAME_LENGTH` | **50 000` | Max size of a markup identifier |
| `XML_MAX_AMPLIFICATION_DEFAULT` | **5** | Max amplification factor for serialized output after entity expansion (billion-laughs) |
| Entity nesting depth | **20** (40 with `XML_PARSE_HUGE`) | Max entity indirection depth |
| `XML_FEATURE_MAX_ENTITY_INDIRECTIONS` | 40 | JAXP-style entity indirection limit |
| `XML_FEATURE_MAX_ENTITY_EXPANSIONS` | (configurable) | Total entity expansion budget |

The entity-amplification default of **5×** is the parser's built-in billion-laughs defense: a 1 KB file cannot expand beyond ~5 KB of serialized output. This is why the spec's rejection of **all DOCTYPE** (not just entities) is the correct fail-closed posture — it removes the amplification vector entirely rather than tuning the factor.

### 2.3 CVE-2026-29074 — SVGO billion-laughs (build-tool DoS)

- **CVE record**: [CVE-2026-29074](https://www.cve.org/CVERecord?id=CVE-2026-29074) (GitHub Advisory [GHSA-xpqw-6gx7-v673](https://github.com/svg/svgo/security/advisories/GHSA-xpqw-6gx7-v673))
- **CWE-776**: Improper Restriction of Recursive Entity References in DTDs (XML Entity Expansion)
- **CVSS 7.5 HIGH** (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Affected**: SVGO ≥2.1.0 <2.8.1, ≥3.0.0 <3.3.3, =4.0.0. Patched in 2.8.1, 3.3.3, 4.0.1.
- **Impact**: an **811-byte** SVG with custom entities stalls the application and crashes Node.js with JavaScript heap OOM.
- **Relevance**: SVGO is a Node.js SVG optimizer — the same class of build-time SVG processing this feature's gate runs. The attack works because SVGO accepted XML with custom entities without guards against expansion or recursion. The spec's "reject all DOCTYPE" + byte/element caps are the correct mitigation.

### 2.4 CVE-2019-20446 — librsvg nested-pattern DoS (render-time expansion)

- **CVE record**: [CVE-2019-20446](https://www.cve.org/CVERecord?id=CVE-2019-20446) (Red Hat [bug 1797608](https://bugzilla.redhat.com/show_bug.cgi?id=1797608))
- **Description**: "a crafted SVG file with nested patterns can cause denial of service… The attacker constructs pattern elements so that the number of final rendered objects grows exponentially."
- **Statement**: "This flaw is similar to billion laughs. A specially-crafted XML file can cause librsvg to consume excessive memory and result in denial of service."
- **Fixed in**: librsvg 2.46.2 (via `MAX_REFERENCED_ELEMENTS` in later versions).
- **Relevance**: This is the canonical proof that **parse-time element counting is insufficient** — the nested `<pattern>` structure is small on disk but explodes at render time. Directly answers Q3.

### 2.5 OWASP guidance — the general XML DoS playbook

- **OWASP XML Security Cheat Sheet** ([cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/XML_Security_Cheat_Sheet.html)): names billion laughs, quadratic blowup, and recursive entity reference as the three entity-expansion attacks; recommends `minOccurs`/`maxOccurs` limits and positive (whitelisting) validation.
- **OWASP XXE Prevention Cheat Sheet** ([cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)): "Disable document type definitions (DTDs) whenever possible. Reject DOCTYPE declarations if the parser supports it. If your application needs DTDs, disable external entity resolution and external DTD loading, and **limit entity expansion**." Also: "Preventing XXE does not prevent every XML denial-of-service attack. See the XML Security Cheat Sheet for entity expansion and other XML resource risks."
- **OWASP Top 10 2017 A4 (XXE)** ([owasp.org](https://owasp.org/www-project-top-ten/2017/A4_2017-XML_External_Entities_%28XXE%29.html)): "Being vulnerable to XXE attacks likely means that the application is vulnerable to denial of service attacks including the Billion Laughs attack."

### 2.6 defusedxml — the Python community's billion-laughs defense

- **defusedxml** ([pypi.org](https://pypi.org/project/defusedxml/)): the reference implementation for XML-bomb defense. Default policy: `forbid_dtd=False`, `forbid_entities=True`, `forbid_external=True`. Recommended hardening list: "Don't allow DTDs; Don't expand entities; Don't resolve externals; **Limit parse depth; Limit total input size; Limit parse time**; Favor a SAX or iterparse-like parser for potential large data."
- **expat ≥ 2.4.0** (the C parser behind Python's `xml.etree`) has built-in billion-laughs protection via `XML_SetBillionLaughsAttackProtectionMaximumAmplification` and `XML_SetBillionLaughsAttackProtectionActivationThreshold` (CVE-2013-0340).

### 2.7 Java JAXP — entity-expansion numeric limits (analogous measurable caps)

- **IBM JAXP documentation** ([ibm.com](https://www.ibm.com/docs/en/sdk-java-technology/8?topic=options-djdkxmlentityexpansionlimit)): `-Djdk.xml.entityExpansionLimit` default **64 000** (number of entity expansions per document); also `jdk.xml.totalEntitySizeLimit`, `jdk.xml.maxGeneralEntitySizeLimit`, `jdk.xml.maxParameterEntitySizeLimit`. This is a useful precedent for *measurable* numeric caps on expansion, not just "reject DTD."

### 2.8 CAPEC-197 — the formal attack-pattern taxonomy

- **CAPEC-197 Exponential Data Expansion** ([capec.mitre.org](https://capec.mitre.org/data/definitions/197.html)): "A small number of nested expansions can result in an exponential growth in demands on memory." Mitigation: "Use libraries and templates that minimize unfiltered input. Use methods that limit entity expansion and throw exceptions on attempted entity expansion."

---

## 3. Options and Tradeoffs

### 3.1 Where to normatively define the DoS caps

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. FR names dimensions; data-model holds values; `SVG_DOS_CAPS` constant implements** (current) | FR stays readable; values centralized in the normative data-model document; implementation has a single named constant; consistent with existing pattern (`QUALITY_FLOORS`, `STANDARD_WIDTHS`) | Two documents must stay in sync | **Recommended** — already the project's convention |
| **B. FR-002 names the values directly** | Self-contained; no cross-document sync | Bloats the FR; duplicates values that `data-model.md` and the checklist also reference; makes the FR harder to review | Rejected |
| **C. Values live only in `scripts/svg-sanitize.mjs` as an implementation constant** | Single source of truth in code | Not reviewable as a requirement; tests/checklist can't reference a normative value; violates the project's pattern of spec-defined constants | Rejected |
| **D. Values in `budget.json`** | Already the project's "hard limits" file | `budget.json` is about *delivery* budgets (bytes per frame/total, compressed code), not *security* caps; mixing concerns would be confusing | Rejected |

**Recommendation: Option A** (status quo). The values belong in `data-model.md` (normative contract), referenced by name from FR-002, and implemented once as `SVG_DOS_CAPS` in `scripts/svg-sanitize.mjs`. Add a unit test that asserts `SVG_DOS_CAPS` matches the data-model values to catch drift.

### 3.2 Are static caps sufficient, or is a render-time expansion guard needed?

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Parse-time caps only** (current batch-8) | Simple; catches degenerate files | **Insufficient** — misses `<use>`/`<pattern>` render-time expansion (CVE-2019-20446) | Rejected as sole guard |
| **B. Parse-time caps + static reference-expansion budget** | Fail-closed at build time; catches #323/#515-style attacks before they reach sharp; matches librsvg's `MAX_REFERENCED_ELEMENTS` intent | Requires traversing the `<use>`/`<pattern>` reference graph at sanitize time | **Recommended** — see §3.3 |
| **C. Parse-time caps + delegate to librsvg's render-time budget** | No extra code; librsvg already enforces `MAX_REFERENCED_ELEMENTS` | The spec's threat model says the *gate* protects the build host; delegating the core DoS responsibility to the rasterizer contradicts that; a crash during sharp is a worse UX than a fail-fast throw in the gate | Rejected as sole guard; acceptable as documented **backstop** (defense-in-depth) |
| **D. Parse-time caps + render-time budget + librsvg backstop** | Defense-in-depth; gate fails fast, librsvg catches anything that slips through | Most code | Overkill for authored masters; the static budget in B is sufficient |

**Recommendation: Option B** — add a **static reference-expansion budget** to the gate. Concretely: traverse the SVG's `<use>`/`<pattern>`/`<image>` reference graph (following `href`/`xlink:href`/`fill="url(#…)"` edges), computing an upper bound on the number of objects that would be rendered. Cap that bound at a measured threshold (e.g. ≤ 500 000, matching librsvg's `MAX_REFERENCED_ELEMENTS`, or tighter — e.g. ≤ 100 000 — for authored art). This is the build-time analog of librsvg's render-time budget and directly addresses CVE-2019-20446.

### 3.3 Concrete expansion-budget algorithm (for planning)

The gate already parses the SVG into a token/element stream to count elements and check depth. During that same pass:

1. Build a map of `id → element` for all elements with an `id` attribute.
2. For each `<use>` element, resolve its `href`/`xlink:href` to a target id (must be fragment-only per the reference rule — see `svg-reference-rule.md`).
3. Compute the **expansion factor** of a `<use>` as the number of times its target is referenced, recursively (a `<use>` referencing a `<g>` containing 10 `<use>`s to the same target = 10×).
4. Sum the expansion factors across all `<use>` elements; reject if the total exceeds the budget.
5. For `<pattern>`, apply the same logic to `fill="url(#…)"` edges between patterns.

This is O(n) in the number of reference edges and runs in the same pass as the element/depth/attribute counters. The budget value should be recorded in `SVG_DOS_CAPS` alongside the four existing caps (e.g. `maxExpandedReferences: 100_000`).

---

## 4. Summary of Recommendations

1. **Keep the four batch-8 caps** (1 MB / 10 000 elements / depth 100 / 256 attrs) — they are well-grounded and appropriately tighter than librsvg/libxml2.
2. **Keep the normative location** — `data-model.md` holds the values, FR-002 references them by name, `SVG_DOS_CAPS` implements them. Add a sync unit test.
3. **Add a static reference-expansion budget** (e.g. `maxExpandedReferences ≤ 100 000`) computed during the existing sanitize pass — parse-time element counting alone is insufficient against `<use>`/`<pattern>` render-time expansion (CVE-2019-20446, librsvg #323/#515).
4. **Correct the factual note** — `MAX_LAYER_NESTING_DEPTH` is 500 on glibc, 50 on musl (the spec currently says only 50).
5. **Document librsvg's render-time budget** (`MAX_REFERENCED_ELEMENTS` = 500 000) as a defense-in-depth backstop in the gate's rationale, but do not delegate the gate's DoS responsibility to it.

---

## Sources

**librsvg (primary):**
- `internals/src/rsvg/limits.rs` — https://gnome.pages.gitlab.gnome.org/librsvg/internals/src/rsvg/limits.rs.html
- `rsvg::limits` module docs — https://gnome.pages.gitlab.gnome.org/librsvg/internals/rsvg/limits/index.html
- `MAX_REFERENCED_ELEMENTS` docs — https://gnome.pages.gitlab.gnome.org/librsvg/internals/rsvg/limits/constant.MAX_REFERENCED_ELEMENTS.html
- librsvg issue #323 (nested `<use>` billion laughs) — https://gitlab.gnome.org/GNOME/librsvg/issues/323
- librsvg issue #515 (nested `<pattern>` exponential) — https://gitlab.gnome.org/GNOME/librsvg/issues/515

**libxml2 (primary):**
- `parserInternals.h` (`xmlParserMaxDepth`, `XML_MAX_TEXT_LENGTH`, `XML_MAX_NAME_LENGTH`) — https://gnome.pages.gitlab.gnome.org/libxml2/html/parserInternals_8h.html
- `parser.h` (`xmlCtxtSetMaxAmplification`, `XML_PARSE_HUGE`) — https://gnome.pages.gitlab.gnome.org/libxml2/html/parser_8h.html
- libxml2 NEWS (entity amplification rework) — https://github.com/GNOME/libxml2/blob/master/NEWS

**CVEs:**
- CVE-2026-29074 (SVGO billion laughs) — https://www.cve.org/CVERecord?id=CVE-2026-29074 · https://github.com/svg/svgo/security/advisories/GHSA-xpqw-6gx7-v673
- CVE-2019-20446 (librsvg nested patterns) — https://www.cve.org/CVERecord?id=CVE-2019-20446 · https://bugzilla.redhat.com/show_bug.cgi?id=1797608
- CVE-2013-0340 (expat billion laughs) — referenced via https://pypi.org/project/defusedxml/

**OWASP:**
- XML Security Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/XML_Security_Cheat_Sheet.html
- XXE Prevention Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html
- Top 10 2017 A4 (XXE) — https://owasp.org/www-project-top-ten/2017/A4_2017-XML_External_Entities_%28XXE%29.html

**defusedxml / community:**
- defusedxml PyPI — https://pypi.org/project/defusedxml/
- defusedxml GitHub — https://github.com/tiran/defusedxml
- IBM JAXP `entityExpansionLimit` docs — https://www.ibm.com/docs/en/sdk-java-technology/8?topic=options-djdkxmlentityexpansionlimit
- CAPEC-197 Exponential Data Expansion — https://capec.mitre.org/data/definitions/197.html

**Project sources:**
- `specs/003-artcraft-local-authoring/spec.md` — FR-002, batch-8 clarification
- `specs/003-artcraft-local-authoring/data-model.md` — SVG DoS caps values
- `specs/003-artcraft-local-authoring/checklists/security-svg-sanitization.md` — CHK017–CHK020
- `specs/003-artcraft-local-authoring/research.md` §1 — gate rationale
