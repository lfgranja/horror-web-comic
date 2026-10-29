# Light-Variant Exemption — Build-Time Condition Research

**Spec**: `specs/003-artcraft-local-authoring` (FR-011)
**Date**: 2026-10-17
**Status**: Clarification research (no code changes)

---

## 1. Direct Answer / Recommendation

**Light variants should be unconditionally required at build time.** No build-time capability detection is needed. The exception clause in FR-011 that references `capabilities.shouldDegrade` is a **category error**: it treats a runtime browser capability detection as if it were a build-time condition.

### Why

`capabilities.shouldDegrade` (`src/scripts/capabilities.js:20`) is computed from:

| Signal | Source | Available at build time? |
|--------|--------|--------------------------|
| `saveData` | `navigator.connection.saveData` | No — runtime browser API |
| `slowConnection` | `navigator.connection.effectiveType` / `.rtt` | No — runtime network state |
| `lowMemory` | `navigator.deviceMemory` | No — runtime device API |
| `lowCpu` | `navigator.hardwareConcurrency` | No — runtime device API |
| `reducedMotion` | `matchMedia('(prefers-reduced-motion: reduce)')` | No — runtime user preference |

The build pipeline (`scripts/build-images.mjs`) runs in Node.js and has **no access** to any of these signals. It already generates light variants unconditionally (lines 228–230, 244–247, 259–260). The player selects between `imageSources.light` and `imageSources.standard` at runtime (`src/scripts/player.js:556`).

### Recommended resolution of FR-011

**Remove the exception clause.** Replace:

> "variante light ausente (exceto quando a capability detection do pipeline determina que variantes light não são aplicáveis, como em modo degradação explícito; ver `capabilities.shouldDegrade`)"

with:

> "variante light ausente"

This makes light variants unconditionally required — which matches what the build already does, what progressive enhancement practices recommend, and what the budget system already enforces (SC-002 counts light variants in the total asset budget).

---

## 2. Key Findings with Citations

### 2.1 Progressive enhancement: generate all variants, select at runtime

The standard progressive enhancement pattern is to **generate all variants at build time and select at runtime** based on capability detection. The build does not predict runtime conditions; it produces a complete artifact that the runtime adapts.

- **MDN Web Docs — Progressive Enhancement**: "Progressive enhancement is a design philosophy that provides a baseline of essential content and functionality to as many users as possible, while delivering the best possible experience only to users of the most modern browsers." Feature detection is used at **runtime** to determine which enhancements to apply.  
  <https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement>

- **web.dev — Capabilities**: "The first letter in PWA stands for progressive, and it comes from the idea of progressive enhancement and feature detection. You should not expect your app to work the same way on every device."  
  <https://web.dev/learn/pwa/capabilities>

- **Springernature Frontend Playbook — Progressive Enhancement**: "We enable progressive enhancement at every level of our products. On the broadest level our browser support approach lets us offer Core versions of our products that work for all users, in all situations, and which are then enhanced when the browser is deemed advanced enough." The practice is to **build the base first, then enhance at runtime** — not to conditionally omit build outputs.  
  <https://github.com/springernature/frontend-playbook/blob/main/practices/progressive-enhancement.md>

### 2.2 HTTP Client Hints (RFC 8942): generate both variants, serve conditionally

The IETF standard for adaptive serving via Client Hints explicitly recommends **generating both variants and serving based on the hint**, with `Vary` for cache correctness:

- **RFC 8942 — HTTP Client Hints**: "When selecting a response based on one or more Client Hints, and if the resource is cacheable, the server MUST also generate a `Vary` response header field to indicate which hints can affect the selected response."  
  <https://www.rfc-editor.org/rfc/rfc8942.html>

- **web.dev — Save-Data**: "To determine when to deliver the 'light' experience to your users, your application can check for the Save-Data client hint request header. […] In cases where a lighter application experience is preferred, it might be prudent to send lower resolution (1x) images to these screens, rather than larger (2x) variants." The pattern is: **both variants exist; the server selects which to serve**.  
  <https://web.dev/articles/optimizing-content-efficiency-save-data>

- **Save Data API (WICG)**: "A web application which primary purpose is to stream media could provide highly compressed media content if the user is interested in reducing their data costs." The standard assumes the light variant **exists** and is selected at request time.  
  <https://wicg.github.io/savedata>

### 2.3 Build-time feature flags are for compile-time constants, not runtime detection

Build-time conditional compilation (DefinePlugin, esbuild `define`, C preprocessor directives) is designed for values that are **known at build time** — environment, debug toggles, version strings — not for runtime device/network conditions:

- **webpack DefinePlugin**: "The DefinePlugin allows you to create global constants which can be **configured at compile time**." The values are inlined and dead-code-eliminated at bundle time.  
  <https://webpack.js.org/plugins/define-plugin/>

- **esbuild `define`: "This feature is useful for allowing different behavior between development builds and production builds."** It substitutes compile-time constants; it cannot detect runtime capabilities.  
  <https://esbuild.github.io/api/#define>

- **Feature Flags taxonomy (LaunchDarkly, Building Evolutionary Architectures)**: Feature toggles are categorized into release toggles (build-time, short-lived) and experiment toggles (runtime, user-segmented). Runtime toggles that depend on device capabilities are **not** build-time concerns.  
  <https://launchdarkly.com/blog/what-are-feature-flags>

### 2.4 Differential serving: generate both, serve selectively

The differential serving pattern (module/nomodule, responsive images with srcset) always generates both variants and lets the browser choose at runtime:

- **Smashing Magazine — Front-End Performance 2021**: "The idea is to compile and serve **two separate JavaScript bundles** […] and serve them only to legacy browsers that actually need them." The build produces both; the runtime selects.  
  <https://www.smashingmagazine.com/2021/01/front-end-performance-build-optimizations>

- **Responsive images (srcset/sizes)**: The `srcset` attribute lists multiple candidates; the browser selects based on DPR, viewport, and network conditions. The build generates all candidates; runtime selection is the browser's job. This is exactly the pattern the horror-web-comic player already uses (`resolveImageSources` → `lightSrcset` → `lightUrl`).

### 2.5 No valid build-time condition can predict runtime capability detection

The signals that feed `shouldDegrade` are:
- **User preferences** (`saveData`, `reducedMotion`) — set by the user at any time, changeable during a session
- **Network conditions** (`effectiveType`, `rtt`) — change as the user moves between networks
- **Device hardware** (`deviceMemory`, `hardwareConcurrency`) — fixed per device but unknowable at build time

There is **no build-time input** that can determine whether a future visitor will be on a slow connection, have Save-Data enabled, or be on a low-memory device. Therefore, any build-time "capability detection" would be a guess, and a wrong guess would either:
- **False negative**: omit light variants → users on slow connections get full-weight images → degraded experience
- **False positive**: generate light variants unnecessarily → wasted build time and storage (but harmless at runtime)

The only correct build-time condition is **unconditional generation**.

---

## 3. Options with Tradeoffs

### Option A — Unconditional requirement (recommended)

**Change**: Remove the exception clause from FR-011. Light variants are always required.

**Tradeoffs**:
| Pros | Cons |
|------|------|
| Matches what the build already does (no code change) | None — this is the current behavior |
| Fail-fast catches real regressions (deleted generation logic, broken ffmpeg) | |
| Aligns with progressive enhancement and Client Hints standards | |
| Simplest to reason about; no dual-path logic | |
| Budget system already counts light variants (SC-002) | |

### Option B — Build-time capability detection flag

**Change**: Add a build-time flag (e.g., `BUILD_TARGET=light-only`) that mirrors a subset of runtime detection.

**Tradeoffs**:
| Pros | Cons |
|------|------|
| Could skip light variant generation for known-static hosting | Requires duplicating capability logic in two places (build + runtime) |
| | The flag cannot predict runtime conditions (user preferences, network state) |
| | Adds a skip flag — FR-011 explicitly says "Nenhuma flag de skip deve ser adicionada ao build" |
| | Two sources of truth for the same decision → drift risk |
| | Violates the "no unreviewed third-party plugin in the critical path" principle — this is a custom flag in the critical path |

### Option C — Runtime-only exemption (reword FR-011)

**Change**: Reword FR-011 to say the build fails on missing light variants, and the **player** handles missing light variants gracefully at runtime (fallback to standard).

**Tradeoffs**:
| Pros | Cons |
|------|------|
| Decouples build from runtime entirely | Requires player code changes (FR-009 says player must remain unchanged) |
| Build stays simple and unconditional | The player currently assumes light variants exist (`resolveImageSources` always produces `.light` URLs) |
| | Adds a silent degradation path — violates the project's fail-fast philosophy |

### Option D — Server-side adaptation (future, out of scope)

**Change**: Use HTTP Client Hints (`Save-Data`, `Sec-CH-Device-Memory`) at serving time to rewrite `srcset` URLs.

**Tradeoffs**:
| Pros | Cons |
|------|------|
| Theoretically eliminates the need for light variants entirely | Requires server-side logic (current hosting is static file serving) |
| | Client Hints are not universally supported (Safari, Firefox partial) |
| | `Save-Data` is deprecated in most major browsers (MDN: "no longer supported by default in most major browser engines") |
| | Out of scope for this feature (FR-009: no runtime changes) |

---

## 4. Recommendation

**Option A — unconditional requirement.**

FR-011 should be simplified to:

> "`build` e `build:images` devem **falhar imediatamente** (fail-fast) diante de master inválido, variante light ausente, estouro orçamento ou referência insegura."

The parenthetical exception should be removed entirely. The build always generates light variants; the runtime always has them available; the build fails if they are missing. No build-time capability detection is needed because no valid build-time signal exists to predict runtime conditions.

---

## 5. References

1. **RFC 8942 — HTTP Client Hints** (IETF, Feb 2021). <https://www.rfc-editor.org/rfc/rfc8942.html>
2. **Save Data API** (WICG). <https://wicg.github.io/savedata>
3. **web.dev — Save-Data: Delivering Fast and Light Applications**. <https://web.dev/articles/optimizing-content-efficiency-save-data>
4. **MDN Web Docs — Progressive Enhancement**. <https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement>
5. **web.dev — PWA Capabilities**. <https://web.dev/learn/pwa/capabilities>
6. **Springernature Frontend Playbook — Progressive Enhancement**. <https://github.com/springernature/frontend-playbook/blob/main/practices/progressive-enhancement.md>
7. **webpack DefinePlugin documentation**. <https://webpack.js.org/plugins/define-plugin/>
8. **esbuild `define` API documentation**. <https://esbuild.github.io/api/#define>
9. **LaunchDarkly — Feature Flags 101**. <https://launchdarkly.com/blog/what-are-feature-flags>
10. **Smashing Magazine — Front-End Performance 2021: Build Optimizations**. <https://www.smashingmagazine.com/2021/01/front-end-performance-build-optimizations>
11. **Gradle — Feature Variants and Optional Dependencies**. <https://docs.gradle.org/6.0/userguide/feature_variants.html>
12. **Android Developers — Play Feature Delivery (conditional delivery)**. <https://developer.android.com/guide/playcore/feature-delivery>
