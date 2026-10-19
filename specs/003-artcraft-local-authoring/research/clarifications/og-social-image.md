# Clarification: OG/social image — ship in `dist/` or keep out of scope?

**Feature**: `specs/003-artcraft-local-authoring`
**Question**: For a static horror web-comic site, should an OG/social image be shipped in `dist/` (which would require an explicit, documented copy step in `build.mjs`, per `spec.md:45`), or kept out of scope? What are the tradeoffs (SEO/social sharing vs. scope creep / output-contract preservation)? What do static-site and SEO practices recommend?
**Status**: answered (research-backed). Recommendation: **keep it out of scope for feature 003** and record a fully-specified follow-up for the publishing/SEO feature. The decision rule and the exact follow-up design are in §3.

---

## 0. What the repository actually has today (evidence, not assumption)

The conditional in `spec.md:45` ("If an OG/social image **must** ship in `dist/`, add an explicit, documented copy step in `build.mjs` (not via `assets/`); otherwise out of scope") presupposes two things that do **not** currently exist: a reason it *must* ship, and the machinery to ship it. Both were checked:

| Fact | Evidence |
|:---|:---|
| `index.html` declares `og:title`, `og:description`, `og:type`, `og:locale` — but **no `og:image`, no `og:url`, no `twitter:card`** | `index.html:7-10` |
| The only automated metadata gate checks `og:title`/`og:description` | `tests/e2e/metadata.spec.js:8-9`; the requirement that motivated it is `specs/001-cinematic-player/spec.md:410` (FR-026: "título, descrição e Open Graph") |
| The constitution requires "Metadados (título, descrição, Open Graph)" — **not** `og:image` specifically | `.specify/memory/constitution.md:93` |
| There is **no verbatim-root copy mechanism** in the build: `PUBLISHABLE_ROOT_FILES` (`index.html`, `favicon.svg`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`) is a **scan** list, used only by `scanPublishableResources` to look for unsafe references | `scripts/build.mjs:17`, `scripts/build.mjs:111-123` — the constant is never referenced by the copier |
| `copyPublishableFiles` ships only `index.html`, `src/data/`, and the **manifest-referenced** subset of `assets/` | `scripts/build.mjs:650-665` |
| `robots.txt`, `sitemap.xml`, `favicon.svg`, `manifest.webmanifest` do not exist in the repo root — so nothing verbatim-root is shipped today either | repo root listing |
| There is **no configured deployment origin anywhere**: no `og:url`, no `rel=canonical`, no `homepage`, no `SITE_ORIGIN`/`BASE_URL`, no site URL in `package.json`/`lighthouserc.json`/`README.md`/`ci.yml` | grep across repo config + docs |
| The build actively **rejects** absolute/protocol-relative references in publishable resources | `scripts/build.mjs:711` (`external-origin`) |
| `dist/` and `build/` are git-ignored | `.gitignore` |

Consequences that decide the question:

1. **Shipping bytes into `dist/` is necessary but not sufficient.** An OG image only has value if a page declares it in an `og:image` tag whose value is an **absolute `http(s)` URL** (§1.1). With no origin configured, `build.mjs` cannot emit a correct absolute URL — so a copy step added today would place a file in `dist/` that **no valid `og:image` can point at**. That is dead bytes plus an unmet requirement, not a feature.
2. **The `assets/` tree is the wrong home and the spec already says so.** `assets/` is manifest-referenced, hashed, budgeted (`budget.json`), and routed through sharp; an OG image is none of those. `findUnreferencedAssets === []` would fail a stray unreferenced file in `assets/` anyway. `spec.md:45`'s "not via `assets/`" is therefore correct — but the alternative it names (a bespoke copy step) does not exist yet.
3. **`og:image` is promotional art, and 003 already places promotional art outside the pipeline.** `spec.md:45` puts designcraft output in top-level `marketing/`, explicitly outside `assets/`, `media-src/`, `build:images`, `build`, `validate`, and `budget.json`. An OG image *is* promotional art. What 003 owns is **authoring** it; what it does not own is **publishing** it.

---

## 1. Direct answer / recommendation

**Keep the OG/social image out of scope for feature 003. Do not add the conditional copy step to `build.mjs` now. Record a small, fully-specified follow-up (the publishing/SEO change) instead — see §3 for the exact design.**

The three reasons, in order of force:

1. **The enabling precondition is absent.** No deployment origin exists, so no correct absolute `og:image` URL can be produced at build time (§0.1). A copy step without an origin ships an unreferenced file.
2. **It is a publishing concern, not an authoring concern.** 003's contract is "authoring/regeneration of assets; runtime, player, manifest schema and budgets unchanged" (`spec.md:17`, FR-003/FR-009) and "promotional art lives in `marketing/`, outside the pipeline" (`spec.md:45`). Delivery of a root-level, non-manifest asset into `dist/` changes the **output set** — it adds an artifact class that `validateDeliveryBudgets` and `findUnreferencedAssets` do not govern.
3. **It is not required by the project's own gates.** The constitution (`constitution.md:93`) requires Open Graph metadata, satisfied by the `og:title`/`og:description`/`og:type`/`og:locale` already present; FR-026/SC-021 and `tests/e2e/metadata.spec.js` check exactly those. `og:image` and `og:url` are required by the *protocol* (ogp.me) but by no project requirement or test.

**This is not a "SEO vs. scope creep" tradeoff, and it is important to say so plainly:** `og:image` has **no ranking effect**. Google does not support or consume Open Graph tags for ranking; its own guidance lists the meta tags it supports and says it ignores the rest (`special-tags`). The real, modest benefit is **appearance and click-through in social cards, Google Images, and Discover** — a genuine but *distribution-time* benefit, not a search-ranking one. Framing it as SEO inflates the stakes.

### Decision rule — when it becomes a "must"

Treat the conditional in `spec.md:45` as resolved to **"out of scope"** unless **both** hold:

- **the site has a stable, known deployment origin** (so an absolute `og:image`/`og:url` can be emitted), **and**
- **social/Discover distribution is an active goal** (the repo already carries `docs/monetization/` and `docs/delivery.md`, so this is plausible — it just isn't this feature's job).

If both hold and the site is about to launch, shipping it is a ~1-hour change and Option B in §3 is the right mechanism. Until then, Option A + Option D.

---

## 2. Key findings, with citations

### 2.1 `og:image` is a *required* OG property, and it must be an absolute `http(s)` URL

The Open Graph protocol defines four required properties for every page — `og:title`, `og:type`, `og:image`, `og:url` — and its `URL` type is defined as "All valid URLs that utilize the `http://` or `https://` protocols." It also states: "If the page specifies an `og:image` it should specify `og:image:alt`."

- **Source**: The Open Graph protocol — <https://ogp.me/> (§"Basic Metadata"; §"Structured Properties" → `og:image:alt`; §"Types" → `URL`).

The current `index.html` therefore **already omits two protocol-required properties** (`og:image`, `og:url`). That is a pre-existing gap, not something 003 introduced — and it is evidence that the project's reading of "Open Graph metadata present" is deliberately narrower than the protocol's "required" set.

Social crawlers do not have a base-URL context and generally do not resolve relative `og:image` paths; the value must be absolute. This is corroborated by every platform below and is the mechanical reason §0.1 is decisive.

### 2.2 Google does **not** use Open Graph for ranking — but **does** use `og:image` to choose image previews

- **Google Search ignores unsupported meta tags**, and its supported-tag list does not include Open Graph: "You can use other `meta` tags if they are important to your site, but Google will ignore `meta` tags that it doesn't support." — <https://developers.google.com/search/docs/crawling-indexing/special-tags>
- **Google Images / text-result images**: `og:image` is an explicit, supported way to influence which image Google shows: "You can influence which image gets selected by providing your preferred image through one of the following metadata sources: … Specify the `og:image` `meta` tag." Best practices: relevant/representative, avoid generic logos, avoid extreme aspect ratios, use high resolution. — <https://developers.google.com/search/docs/appearance/google-images>
- **Google Discover**: recommends images "At least 1200 px wide", "more than 300,000 total pixels", "16x9 aspect ratio", specified via "schema.org markup or the `og:image` `meta` tag"; avoid generic images. — <https://developers.google.com/search/docs/appearance/google-discover>
- **Article structured data**: recommends an `image` with "a minimum of 50K pixels … with the following aspect ratios: 16x9, 4x3, and 1x1", and "Image URLs must be crawlable and indexable." — <https://developers.google.com/search/docs/appearance/structured-data/article>

Net: the benefit is **appearance/eligibility in image surfaces**, not ranking.

### 2.3 Social-card specs converge on ~1200×630 (1.91:1), JPG/PNG, absolute URL, ≲5–8 MB

| Platform | Minimum | Recommended | Max size | Formats | Notes |
|:---|:---|:---|:---|:---|:---|
| Facebook | 200×200 | 1200×630, ~1.91:1 | 8 MB | (image) | crawler accepts only gzip/deflate; first share is not pre-cached unless pre-scraped or `og:image:width`/`height` are given |
| X / Twitter (`summary_large_image`) | 300×157 | 1200×600 (2:1) | 5 MB | JPG/PNG/GIF/WebP — **SVG not supported** | must be absolute, HTTPS, no auth |
| LinkedIn | >200 px wide | 1200×627 (1.91:1) | 5 MB | JPEG/PNG/GIF | |
| Slack (classic unfurl) | — | — | — | — | crawls and reads "common OpenGraph and X (formerly Twitter) Card metadata"; requires a fully-qualified URL (protocol required) |

- **Facebook**: <https://developers.facebook.com/docs/sharing/webmasters/images/> (200×200 min; 8 MB; "at least 1200 x 630 pixels"; "keep your images as close to 1.91:1"; pre-caching; `og:image:width`/`og:image:height`).
- **X/Twitter**: the official card pages moved to the API-only `docs.x.com` tree and now 404; the card requirements are quoted verbatim from the official card documentation in X's developer forum — "an aspect ratio of 2:1 with minimum dimensions of 300x157 or maximum of 4096x4096 pixels. Images must be less than 5MB … JPG, PNG and GIF formats are supported … SVG is not" — <https://devcommunity.x.com/t/degraded-image-quality-in-summary-cards-w-large-image/81228>. (Treat as official-quote-via-forum, not a live official page.)
- **LinkedIn**: "Use a 1.91:1 ratio (1200 x 627 pixels). Image must be more than 200 pixels wide." — <https://www.linkedin.com/help/linkedin/answer/a563309/image-specifications-for-your-linkedin-pages-and-career-pages>; Post Inspector refreshes the cache — <https://www.linkedin.com/post-inspector>.
- **Slack**: "Slack crawls the URL, looks for common OpenGraph and X (formerly known as Twitter) Card metadata"; "Links will only unfurl if the message they appear in contains a fully-qualified URL." — <https://docs.slack.dev/messaging/unfurling-links-in-messages>.

**One image covers all of them**: ~1200×630 (1.91:1), JPG/PNG, ≲1 MB. That is also *under* the project's own per-frame spirit (`budget.json` frame budget 300 KB is for delivered reader assets; an OG image is never loaded by the reader).

### 2.4 Caching: platforms cache per URL

Facebook: "We cache all images referenced based on each image's URL … Use a new URL for the new image or the image won't be updated." LinkedIn caches previews and requires a manual re-scrape (`Post Inspector`). **Design consequence**: the OG image wants a **stable, non-hashed path** (e.g. `/og.png`) so the URL does not change on every deploy; if the art changes, the platform cache must be invalidated deliberately (new URL or debugger). This is a further argument against routing it through the **hashed** `assets/` graph.

### 2.5 What static-site generators recommend: a verbatim `public/`/`static/` directory

The idiomatic SSG home for an OG image is a directory copied **as-is to the dist root**, not the processed/hashed asset graph:

- **Vite** — "If you have assets that are: never referenced in source code (e.g. `robots.txt`); must retain the exact same file name (without hashing); … Then you can place the asset in a special `public` directory … Assets in this directory will be served at root path `/` during dev, and copied to the root of the dist directory as-is." — <https://vite.dev/guide/assets#the-public-directory>
- **Astro** — "Files in the `public/` directory are always served or copied into the build folder as-is, with no processing. … your site favicon will commonly be placed in the root of this folder." — <https://docs.astro.build/en/guides/images/>

This is **exactly** the shape `spec.md:45` describes ("explicit copy step in `build.mjs`, not via `assets/`"), and it is the shape the repo *almost* has — `PUBLISHABLE_ROOT_FILES` names `robots.txt`/`sitemap.xml` but is only a scan list (§0). So the follow-up is small and idiomatic, and it should reuse the existing constant as the copy list rather than invent a second concept.

---

## 3. Options, tradeoffs, and the recommended one

| | Option A — **Out of scope** (recommended) | Option B — **Ship now via explicit copy step** | Option C — **Ship now, no copy** (reference a marketing-hosted absolute URL) |
|:---|:---|:---|:---|
| **What it means** | 003 authors the marketing/OG art and documents it; no `build.mjs` change; nothing new in `dist/` | Extend `build.mjs` so a root-level OG file (e.g. `marketing/og.png` → `dist/og.png`) is copied verbatim; add absolute `og:image`/`og:url` from a configured origin | Keep `marketing/` non-published; point `og:image` at an absolute URL where the marketing asset is hosted elsewhere |
| **Social/Discover benefit** | Deferred until the publishing feature | Immediate | Immediate |
| **Requires an origin** | No | **Yes** — otherwise the emitted URL is wrong (§0.1) | Yes (a hosting location for `marketing/`) |
| **Output-contract impact** | None | New artifact class in `dist/` outside `validateDeliveryBudgets` / `findUnreferencedAssets` — needs a documented size cap to avoid an ungoverned artifact | None to the build, but breaks 003's "`marketing/` is outside the pipeline" model and introduces an external dependency the build cannot verify |
| **Scope fit for 003** | **In scope for authoring, out of scope for delivery** — matches FR-003/FR-009 and `spec.md:45` | Publishing concern smuggled into an authoring feature | Publishing concern smuggled in, *and* it undermines the "no external references" invariant |
| **Cost** | ~0 now | ~1 h + origin config + a budget line + an e2e assertion | ~0 in the build, but splits truth across two systems |

### Recommended: **Option A now, Option D (a dedicated publishing/SEO follow-up) recorded**

**Option D (the follow-up) is the recommended *staging***: a separate change, owned by the publishing feature, that does exactly this and nothing more:

1. **Art** (authored under 003's `marketing/` rules, `spec.md:45`): one **1200×630**, JPG or PNG, ≲1 MB; `og:image:alt` required (ogp.me). Provenance via the existing trailer + optional sidecar in `marketing/` (FR-008).
2. **Delivery**: copy the file **verbatim to the dist root** at a **stable, non-hashed path** (e.g. `dist/og.png`) — implement by promoting `PUBLISHABLE_ROOT_FILES` from a scan-only list to the copy list (`scripts/build.mjs:650-665`), which is the Vite `public/` pattern (§2.5), not a second bespoke mechanism. Do **not** route it through `assets/`.
3. **Origin**: introduce a configured origin (e.g. `SITE_ORIGIN` env / a `site.json`) and emit absolute `og:image` and `og:url`; also add `og:image:width`/`og:image:height` (Facebook pre-cache) and `twitter:card=summary_large_image`.
4. **Governance**: add a documented size cap for the root artifact so it is not an ungoverned file (it is outside `budget.json` by design).
5. **Cache policy**: document that changing the art requires a new URL or a manual re-scrape (FB Sharing Debugger / LinkedIn Post Inspector).
6. **Optionally**: `max-image-preview:large` (Discover) and a real `sitemap.xml`/`robots.txt` — the same "publishing" feature, not this one.

### Why not Option B now

Option B is the *correct mechanism* (§2.5) but the *wrong time*: without an origin it ships unreferenced bytes (§0.1), it adds an ungoverned artifact to the output set that 003's contract says stays unchanged (FR-003), and it converts a documented "out of scope" into an undocumented new output class. The mechanism is right; the feature is wrong. Ship it with the publishing feature, where the origin and the SEO/social goals actually exist.

---

## 4. Open questions (for the follow-up, not this feature)

1. **Is there a planned deployment origin, and will social/Discover distribution be a launch goal?** If both are already true, Option B becomes a "must" and `spec.md:45` should be flipped to in-scope with the design above.
2. **Should the OG image be a crop of `frame-01`, or dedicated designcraft art?** Google advises against generic/logo images and text-heavy images; a dedicated 1200×630 promotional render is usually better than a 3:2 frame crop.
3. **Does the project want a single `dist/og.png`, or per-scene OG images?** A single-page comic argues for one; per-scene would multiply the artifact and the cache-invalidation burden.
4. **Where does the size cap live** — a new field in `budget.json`, or a documented constant? (It is outside the reader budget by construction.)
5. **Should `og:url`/`rel=canonical` be added at the same time?** They are protocol-required and currently absent (§2.1) — a one-line fix that belongs to the same publishing change.

---

## Sources

**Primary (external)**
- The Open Graph protocol. <https://ogp.me/> — four required properties (`og:title`, `og:type`, `og:image`, `og:url`); `URL` type is `http://`/`https://`; "If the page specifies an `og:image` it should specify `og:image:alt`".
- Facebook for Developers. *Images in Link Shares*. <https://developers.facebook.com/docs/sharing/webmasters/images/> — 200×200 min; 8 MB; "at least 1200 x 630 pixels"; "as close to 1.91:1 aspect ratio as possible"; pre-caching; `og:image:width`/`height`; gzip/deflate; cache-by-URL ("Use a new URL for the new image or the image won't be updated").
- Google Search Central. *`meta` tags and attributes that Google supports*. <https://developers.google.com/search/docs/crawling-indexing/special-tags> — "Google will ignore `meta` tags that it doesn't support"; Open Graph is not in the supported list.
- Google Search Central. *Google image SEO best practices*. <https://developers.google.com/search/docs/appearance/google-images> — `og:image` as a supported way to specify a preferred image; avoid logos/extreme aspect ratios.
- Google Search Central. *Discover and your website*. <https://developers.google.com/search/docs/appearance/google-discover> — ≥1200 px wide, >300,000 px, 16:9; specify via `og:image`.
- Google Search Central. *Article structured data*. <https://developers.google.com/search/docs/appearance/structured-data/article> — image ≥50K px, 16x9/4x3/1x1; URLs must be crawlable/indexable.
- X Developer Platform (quoted from the official card docs in X's developer forum, official pages now relocated/404). <https://devcommunity.x.com/t/degraded-image-quality-in-summary-cards-w-large-image/81228> — `summary_large_image`: 2:1, 300×157 min, 4096×4096 max, <5 MB, JPG/PNG/GIF, SVG unsupported, absolute/HTTPS.
- LinkedIn Help. *Image specifications for your LinkedIn Pages and Career Pages*. <https://www.linkedin.com/help/linkedin/answer/a563309/image-specifications-for-your-linkedin-pages-and-career-pages> — 1.91:1 (1200×627), >200 px wide. Post Inspector: <https://www.linkedin.com/post-inspector>.
- Slack Developer Docs. *Unfurling links in messages*. <https://docs.slack.dev/messaging/unfurling-links-in-messages> — classic unfurl reads OpenGraph/Twitter Card metadata; fully-qualified URL required.
- Vite. *Static Asset Handling → The `public` Directory*. <https://vite.dev/guide/assets#the-public-directory> — "never referenced in source code (e.g. `robots.txt`)", "must retain the exact same file name (without hashing)", "copied to the root of the dist directory as-is".
- Astro. *Images → Where to store images*. <https://docs.astro.build/en/guides/images/> — "Files in the `public/` directory are always served or copied into the build folder as-is, with no processing"; favicon lives at its root.

**Primary (repo)**
- `specs/003-artcraft-local-authoring/spec.md:45` — the conditional under test; `marketing/` is outside the pipeline; provenance in `marketing/` never in `assets/`.
- `specs/003-artcraft-local-authoring/plan.md:98` — `build.mjs` modification marked "(condicional)".
- `specs/003-artcraft-local-authoring/spec.md` — FR-003 (output contract unchanged), FR-008 (provenance), FR-009 (no runtime change), Non-Goals.
- `index.html:7-10` — `og:title`/`og:description`/`og:type`/`og:locale`; no `og:image`/`og:url`/`twitter:card`.
- `tests/e2e/metadata.spec.js:8-9` — the only automated metadata assertions.
- `.specify/memory/constitution.md:93` — "Metadados (título, descrição, Open Graph)".
- `specs/001-cinematic-player/spec.md:410` — FR-026 (title/description/Open Graph).
- `scripts/build.mjs:17`, `:111-123` — `PUBLISHABLE_ROOT_FILES` is a scan list, not a copy list.
- `scripts/build.mjs:650-665` — `copyPublishableFiles` copies `index.html`, `src/data/`, and manifest-referenced `assets/` only.
- `scripts/build.mjs:711` — `external-origin` rejection of absolute/protocol-relative references.
- `budget.json` — manifest-asset budgets (an OG image would sit outside them).
- `.gitignore` — `dist/`, `build/`.
