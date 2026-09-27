# Research: Detecting autoplay-block vs. load failure

**Feature**: `001-cinematic-player` | **Date**: 2026-09-23
**Question**: How should a web app reliably detect that autoplay-with-sound was
BLOCKED, versus an audio file that simply failed to load?
Companion to decision **R4** in `research.md` (áudio ativo por padrão com
fallback de gesto).

All claims below were verified against the cited pages on 2026-09-23.

---

## 1. `HTMLMediaElement.play()` promise rejections — error taxonomy

### Claim 1.1: `NotAllowedError` is the autoplay-policy rejection

- The WHATWG HTML spec's `play()` steps, step 1: *"If the media element is not
  allowed to play, then return a promise rejected with a `NotAllowedError`
  `DOMException`."*
- MDN: `NotAllowedError` "Provided if the user agent (browser) or operating
  system doesn't allow playback of media in the current context or situation."
- **Sources**:
  - WHATWG: https://html.spec.whatwg.org/multipage/media.html#dom-media-play-dev
  - MDN: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
- **Caveat**: "not allowed to play" covers the autoplay policy but also the
  `autoplay` Permissions-Policy in iframes — same error name either way
  (MDN autoplay guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

### Claim 1.2: `NotSupportedError` means source/load failure, not autoplay block

- Spec `play()` step 2: if the element's `error` attribute is
  `MEDIA_ERR_SRC_NOT_SUPPORTED`, `play()` rejects with `NotSupportedError`.
  Playback is impossible until `load()` clears the error.
- A missing file (HTTP 404/5xx, DNS error) *before* the resource is established
  triggers the "dedicated media source failure steps", which set
  `MediaError.code = MEDIA_ERR_SRC_NOT_SUPPORTED` — so a 404 surfaces as
  `NotSupportedError`, **not** `NotAllowedError`.
- **Sources**:
  - Spec `play()` steps: https://html.spec.whatwg.org/multipage/media.html#dom-media-play-dev
  - Spec media data processing (4xx/5xx → SRC_NOT_SUPPORTED):
    https://html.spec.whatwg.org/multipage/media.html#media-data-processing-steps-list
  - MDN: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play

### Claim 1.3: `AbortError` means the play attempt was interrupted — neither block nor load failure

- The spec rejects *pending* play promises with `AbortError` when a new
  `load()` call (or resource-selection restart) interrupts an in-flight
  `play()`. It is a cancellation, not an autoplay decision and not a decode
  failure.
- **Source**: https://html.spec.whatwg.org/multipage/media.html#dom-media-play-dev
  (see "reject pending play promises" steps: lines citing `AbortError` DOMException)
- **Caveat**: MDN documents only `NotAllowedError` and `NotSupportedError`
  explicitly and notes "Other exceptions may be reported, depending on browser
  implementation details." `AbortError` is spec-defined but browser
  implementations vary; treat it as "retry or ignore", never as autoplay-block.

### Claim 1.4: `play()` may stay *pending*, not reject, while loading

- If the resource is still loading (`readyState` `HAVE_NOTHING`), `play()` does
  not reject immediately; the promise resolves when playback starts or rejects
  only when loading fails. So absence of a rejection is not proof autoplay was
  allowed until the promise settles.
- **Source**: https://html.spec.whatwg.org/multipage/media.html#playing-the-media-resource
- **Caveat**: MDN also warns `play()` "may cause the user to be asked to grant
  permission", delaying resolution.

---

## 2. `navigator.getAutoplayPolicy("mediaelement")` — support and status

### Claim 2.1: Values and semantics are standardized in a W3C *Working Draft*, not a Recommendation

- Returns `"allowed"`, `"allowed-muted"`, or `"disallowed"`; accepts
  `"mediaelement"` / `"audiocontext"` type strings, or a specific
  `HTMLMediaElement` / `AudioContext`.
- The spec is the W3C **Autoplay Policy Detection** spec — Working Draft
  (4 September 2025), developed in the W3C Media WG from the WICG incubation.
  It is **not** yet a W3C Recommendation.
- **Sources**:
  - WD: https://www.w3.org/TR/autoplay-detection/ (editor's draft:
    https://w3c.github.io/autoplay/)
  - Repo/status: https://github.com/wicg/autoplay (Chrome: Positive; Firefox:
    Shipping on Nightly→shipped; Safari: Positive, not shipped)

### Claim 2.2: Browser support is Firefox-only as of September 2026

- caniuse ("Navigator API: getAutoplayPolicy", checked 2026-09-23):
  - **Firefox**: supported 112+ (desktop and Android) — global usage 2.88%
  - **Chrome/Edge/Opera** (Chrome ≤156): **not supported**
  - **Safari ≤27.2 / iOS ≤27.2**: **not supported**; TP unknown
- MDN marks the API **Experimental** and warns to check the compat table
  before production use.
- **Sources**:
  - https://caniuse.com/mdn-api_navigator_getautoplaypolicy
  - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getAutoplayPolicy
- **Caveat**: caniuse data is third-party but tracks MDN browser-compat data;
  re-verify before relying on it, since Safari has signaled a positive intent.

### Claim 2.3: The type query is explicitly "rough"; the element query is authoritative

- Spec: *"the returned result isn't always correct for every element which have
  the same type of the given media type"* — if type and element queries differ,
  **take the element result as correct**. Also: if the result is `disallowed`,
  `play()` will reject with `NotAllowedError` (the spec links the two).
- **Source**: https://w3c.github.io/autoplay/#querying (§2.2.1, §2.2.2)
- **Caveat** (Mozilla, Bug 1773551): Firefox's optional "transient user gesture"
  policy can make the result change from `disallowed` to `allowed` *after* a
  gesture within a time window; the policy can also change during a session and
  there is **no event** notifying of changes.
  https://bugzilla.mozilla.org/show_bug.cgi?id=1773551

**Verdict**: not reliable as the sole cross-browser signal today. Use it when
present (feature-detect `navigator.getAutoplayPolicy`) as a pre-check, and
always keep the `play()` promise rejection as the ground truth.

---

## 3. Recommended detection strategy (avoids misclassifying a missing file)

### Claim 3.1: MDN's own recommended pattern keys off `error.name === "NotAllowedError"` only

- MDN autoplay guide, "Handling play() failures": catch the `play()` promise
  rejection; **only** `NotAllowedError` gets the play-button/autoplay-block UI;
  *"Any other errors are handled as appropriate"* (i.e., load/playback errors).
- **Source**: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

### Claim 3.2: Cross-check `mediaElement.error` / `networkState` to separate load failure from policy block

- Spec-defined mapping, usable as a decision table:
  | Signal | Meaning |
  |---|---|
  | rejection `NotAllowedError` | autoplay policy block |
  | rejection `NotSupportedError` | source failed/unsupported (404 → `MEDIA_ERR_SRC_NOT_SUPPORTED`) |
  | rejection `AbortError` | play attempt interrupted by `load()`/new source — neither |
  | `error.code == MEDIA_ERR_SRC_NOT_SUPPORTED` (4) | file missing or unsupported format |
  | `error.code == MEDIA_ERR_NETWORK` (2) | network error mid-load |
  | `error === null` + `NotAllowedError` | clean autoplay block |
- **Sources**:
  - MediaError codes: https://html.spec.whatwg.org/multipage/media.html#error-codes
  - `play()` steps: https://html.spec.whatwg.org/multipage/media.html#dom-media-play-dev
- **Caveat**: because a 404 also produces `NotSupportedError` (not a distinct
  HTTP-level code), you cannot distinguish "missing file" from "unsupported
  codec" purely from `play()`; if that distinction matters, check the resource
  with `fetch()`/HTTP status or inspect `error.message` (non-standard).

### Claim 3.3: For the `autoplay` attribute path, there is no failure event — use the first `play` event

- No event fires when autoplay is denied. MDN's fallback: listen for the first
  `play` event; if it never arrives, autoplay did not happen.
- **Source**: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay ("Example 3")
- **Caveat**: this cannot distinguish "blocked" from "still loading"; combine
  with the `error` event.

### Claim 3.4: Practical order of checks

1. Feature-detect `navigator.getAutoplayPolicy`; if present, prefer
   `getAutoplayPolicy(element)` over `getAutoplayPolicy("mediaelement")`
   (element result wins per spec).
2. Attempt `play()` regardless; treat the settled promise as ground truth.
3. On rejection: `NotAllowedError` → autoplay blocked (show play affordance);
   `NotSupportedError` → check `element.error.code` → load failure, retry
   alternate source, **do not** blame autoplay policy; `AbortError`/others →
   retry, log.
4. Never classify an error while `readyState === HAVE_NOTHING` and
   `error === null` and no rejection has occurred — the outcome is still pending.

---

## 4. 2024–2026 changes worth noting

- **2025-09-04**: W3C published a new Working Draft of Autoplay Policy Detection
  (previous WD: 2023-01-27). Still a WD; API still marked Experimental on MDN.
  https://www.w3.org/TR/autoplay-detection/
- **Firefox**: shipped `getAutoplayPolicy` in Firefox 112 (April 2023);
  implementation details and edge cases (type-vs-element result divergence,
  transient-gesture policy) documented in Bug 1773551 (activity continuing
  through 2023–2024). https://bugzilla.mozilla.org/show_bug.cgi?id=1773551
- **Safari**: positive position signal (wicg/autoplay) but still unshipped in
  Safari 27.x as of September 2026 (caniuse).
- **Chrome/WebKit**: no new standard autoplay-detection API; Chrome remains on
  its MEI + sticky-activation heuristics
  (https://developer.chrome.com/blog/autoplay/), WebKit on its per-page policy
  (https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/).
- **MDN autoplay guide** (last modified 2026-09-10) now presents
  `getAutoplayPolicy()` as the primary detection mechanism with the
  `NotAllowedError`-only catch pattern as the fallback.
  https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- **No 2024–2026 change** alters the `play()` rejection taxonomy —
  `NotAllowedError` / `NotSupportedError` / `AbortError` semantics in the HTML
  spec are unchanged (living standard, verified 2026-09-22 revision).

## Uncertainty summary

- Safari/Chrome may ship `getAutoplayPolicy` at any time; recheck caniuse/MDN.
- `AbortError` frequency and timing varies by engine (spec allows other
  implementation-specific exceptions).
- caniuse numbers reflect September 2026 data (global usage 2.88% for the API).
