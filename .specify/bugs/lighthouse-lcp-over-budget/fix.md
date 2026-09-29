# Bug Fix: Lighthouse LCP gate fails at 2.87 s against a 2.5 s budget on the mobile 4G profile

- **Slug**: lighthouse-lcp-over-budget
- **Fixed**: 2026-09-29T13:05:00-04:00
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

`scripts/build.mjs` now writes the first frame's `<picture>` into the static shell at
build time, so the preload scanner fetches it during the initial parse instead of three
serialized round trips after the bundle and the manifest. LCP went from **2862/2864/2866 ms
to 1543/1586/1629 ms** — a ~44% cut, roughly 900 ms inside the 2500 ms budget, and the
Lighthouse gate passes. The assessment's second lever (not arming `preload='auto'` on audio
before playback is granted) was **refuted by measurement and reverted**; the status is
`partial` because that half of the proposed remediation does not work.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/build.mjs` | modified | Exports `firstFramePicture()` and `injectFirstFramePicture()`; `writeIndex()` applies the injection and now receives the manifest. |
| `tests/unit/first-frame-preload.test.js` | added | 7 tests pinning the build↔manifest coupling. |
| `tests/perf/first-frame.spec.js` | modified | Added one test asserting the image request precedes the manifest request. |
| `src/scripts/audio.js` | **reverted** | The audio preload change was implemented, measured, and reverted — see Deviations. |
| `.specify/bugs/lighthouse-lcp-over-budget/assessment.md` | untouched | It is the contract. |

## Diff Highlights

```js
// scripts/build.mjs — the manifest is the single source, resolved through the same
// resolveImageSources() the player uses at runtime, so candidates cannot disagree.
export function firstFramePicture(manifest) {
  const frame = manifest?.scenes?.[0]?.frames?.[0];
  if (!frame?.image) return null;
  const sources = resolveImageSources(frame.image).standard;
  if (!sources.fallback) return null;
  return { id: frame.id, alt: frame.alt ?? '', sizes: frame.image.sizes || '100vw',
           width: frame.image.width ?? '', height: frame.image.height ?? '',
           src: frame.image.fallback, avifSrcset: sources.avif || '',
           webpSrcset: sources.webp || '', fallbackSrcset: sources.fallback };
}

export function injectFirstFramePicture(html, manifest) {
  const picture = firstFramePicture(manifest);
  if (!picture) throw mediaError('the manifest has no first frame to preload into index.html', 'build-invalid');
  const avifTag = /<source\b[^>]*\bid="frame-avif"[^>]*>/i.exec(html);
  // ...webpTag, imgTag...
  for (const [name, match] of [['frame-avif', avifTag], ['frame-webp', webpTag], ['frame-image', imgTag]]) {
    if (!match) throw mediaError(`index.html no longer has a #${name} anchor for the first-frame preload`, 'build-invalid');
  }
  // srcset/sizes on both <source>s and the <img>; src, alt, width, height and
  // fetchpriority="high" on the <img>.
}
```

Produced `dist/index.html`:

```html
<source id="frame-avif" type="image/avif" srcset="assets/frames/generated/frame-01-320.avif 320w, …-640.avif 640w, …-960.avif 960w, …-1200.avif 1200w" sizes="100vw">
<source id="frame-webp" type="image/webp" srcset="assets/frames/generated/frame-01-320.webp 320w, …" sizes="100vw">
<img id="frame-image" class="frame-image" alt="Porta do vestíbulo com a placa “VOLTE QUANDO A CASA ACORDAR”." … width="1200" height="800" srcset="assets/frames/generated/frame-01-320.jpg 320w, …" sizes="100vw" src="assets/frames/generated/frame-01.jpg" fetchpriority="high">
```

## Tests Added or Updated

- `tests/unit/first-frame-preload.test.js::the first-frame picture is derived from the manifest, never hand-written` — the derived picture equals `resolveImageSources()` on the real manifest.
- `::injection populates every <picture> slot so the preload scanner can fetch the frame` — all three slots carry `srcset` **and** `sizes`; a missing `sizes` would make the browser pick the 1200w candidate on a 360 px screen.
- `::injection is idempotent, so a rebuild cannot compound the markup` — injection twice equals injection once.
- `::injection preserves the intrinsic size, which is what keeps CLS at zero` — the drift guard for the CLS budget.
- `::injection escapes the alt text rather than trusting the manifest` — `"`, `<`, `>`, `&`.
- `::a shell that lost an anchor fails loudly instead of silently regressing LCP` — each missing anchor and an empty manifest throw.
- `::the built shell carries the same first frame the manifest declares` — asserts against real `dist/index.html`, the build↔manifest drift guard (skipped when `dist/` is absent).
- `tests/perf/first-frame.spec.js::the first frame image is requested in the initial batch, not after the manifest resolves` — pins the **cause** rather than the number: asserts `image.startTime < story.json.startTime`, against `/dist/` because that is the only build carrying the injection.

## Local Verification

| Command | Result |
|---|---|
| `npm run build` | passes; budgets intact (13203 compressed script B, 3192 compressed style B) |
| `npm run ci:lighthouse` | **gate passes** — `All results processed!` (was `Assertion failed`, exit 1) |
| LCP, 3 runs before → after | 2861.9 / 2863.9 / 2866.0 → **1543 / 1586 / 1629 ms** |
| `npm run test:unit` | **129/129 pass** (122 pre-existing + 7 new) |
| `npx playwright test tests/perf --project=desktop-chromium` | 11/12 — only SC-019, see below |
| `npx playwright test tests/e2e --project=desktop-chromium` | 160/169 — see below |

Network-order proof, from the Lighthouse `network-requests` audit:

```
before:  2.1 ms  /            41/42/43 ms  css×3    44 ms  main.js
        121.4 ms  story.json  187.6 ms  frame-01-960.avif        <-- 4-deep chain
after:   2.5 ms  /            53.8/54.9/55.7 ms  css×3
          57.2 ms  frame-01-960.avif   58.6 ms  main.js
         192.3 ms  story.json                                 <-- same batch, chain broken
```

FCP moved 1176 → ~1166 ms (unchanged); the entire win is in the LCP element's discovery.

### Manual checks

- Confirmed `index.html` and everything under `src/` are **byte-identical** to HEAD
  (`git diff --stat HEAD -- index.html src/` is empty), so the dev and e2e servers —
  which serve `index.html` verbatim and never import `build.mjs` — are unaffected.
- Confirmed the injected `srcset`/`src` values are already `isSafeLocalReference`-valid
  manifest references, so the external-origin scan stays green.

### Pre-existing local failures, not regressions

Both were reproduced **on stashed HEAD** and are unrelated to this change:

- **SC-019** (`first-frame.spec.js:76`) fails in a full-file run on this machine
  (3239 ms on HEAD, 3802 ms with the change) and **passes twice in isolation** with the
  change. The e2e/perf workers compete for the same CPU; this is load flakiness.
- **e2e**: 5–9 failures per full-suite run, with a **different set every time**
  (HEAD: `audio-activity:3`, `audio-activity:87`, `autoplay:3`, `resume:4`,
  `zz-degraded-coverage:225`; with the change: an overlapping but non-identical set).
  `AGENTS.md` documents the missing-audio-output gotcha; configuring the PipeWire sink
  (`pactl set-default-sink`) cut a targeted rerun from 4 failures to 1. CI is the authority
  here — the branch's own CI had these green on Linux.

## Deviations from Assessment

### 1. The audio lever does not work, and was reverted

The assessment's second lever was: stop arming `preload='auto'` before playback is granted,
so 347 KB leaves the critical path. It was implemented — a `preloadFor()` helper shared by
`createElements()` and `updatePreloadPolicy()`, plus `promotePreloads()` fired from the
resolution handler of `requestPlay()`, the single choke point every granted `play()` passes
through. All 26 audio and degradation e2e specs passed with it.

Then it was measured, with a probe reading `PerformanceResourceTiming`:

```json
{ "preload": "metadata", "scene-01.aac": 115484, "scene-02.aac": 115484, "frame-03.aac": 115484, "totalEncoded": 346452 }
```

**`metadata` and `auto` transfer exactly the same 346,452 bytes.** `preload` is advisory,
and for these AAC files Chromium downloads the whole resource either way. The 347 KB was
never gated by `preload`, so changing it gates nothing. Lighthouse confirmed it from the
other side: total byte weight was 384 KiB both before and after.

The change was reverted rather than kept, because it produced **no measurable benefit** and
carried behavior change plus three new tests. Shipping an unmeasurable "fix" makes the
preload policy look deliberate when it is inert. `src/scripts/audio.js` is untouched.

**Consequence: the 347 KB remains on the critical path, and the assessment's contention
hypothesis is still unresolved.** The 1.44 Mbit/s profile spends real time on it. A remedy
that actually removes the bytes — not creating the `<audio>` elements until playback is
granted, or dropping `src` and resolving it at play time — is outside this assessment's
scope and should be assessed on its own before anyone attempts it.

### 2. No `<link rel="preload" as="image">`, only the populated `<picture>`

The assessment proposed the static markup **plus** a preload link. The link was deliberately
omitted, for the reason the assessment itself raised under Risks: one link names a single
tier, and a tier the browser does not paint is discarded and re-fetched by the `<picture>` —
a double download on exactly the engines that support the cheaper tier. A populated
`<picture>` is discovered by the preload scanner on its own, so it achieves the same
parallelism with no tier guess. `fetchpriority="high"` carries the intent instead. The
measured network record confirms the scanner does fetch it in the initial batch.

### 3. `alt` and `width`/`height` are injected too

Not proposed, but the player sets all three at runtime (`player.js:549-552`), so injecting
only the fetch attributes would leave a visible/AT-visible window where the static and
dynamic states disagree. Injecting the same values the player computes keeps them identical.

### 4. Open risk accepted: `rel=preload`/`fetchpriority` cannot be capability-conditioned

A `rel="preload"` in HTML cannot consult `capabilities.shouldDegrade` at runtime, so a
`saveData` or slow-connection visitor now fetches the **standard** first frame once, and JS
may then swap to a light variant. The waste is bounded and small (the 320w AVIF is 1310 B
against 3919 B for the 1200w standard) and it applies only to visitors who will get an
even smaller image moments later. The alternative — forgoing the static markup — forfeits
the entire 1.2 s win for everyone. Accepted deliberately, not overlooked.

## Follow-ups

- **CI is the verdict.** The Lighthouse gate ran locally and passes, but the branch's
  authoritative run is the `gate` job on Linux. Push and confirm.
- **Investigate the `largest-contentful-paint-element` gatherer error** flagged in the
  assessment (`Cannot read properties of undefined (reading 'frame_sequence')`). It is why
  the LCP element was inferred rather than observed, and it also silences
  `prioritize-lcp-image`, `lcp-lazy-loaded` and `render-blocking-resources`. The fix landed
  on strong inference; direct observation would confirm it.
- **Reconcile the two 2.5 s gates** (assessment Open Questions). `first-frame.spec.js:11-16`
  throttles to 170 ms / 9 Mbit/s with **no CPU slowdown** and measures decode-complete, while
  Lighthouse uses 562.5 ms / 1.44 Mbit / 4× CPU and measures paint. They encode one target
  under profiles 6.2× apart, and the optimistic one keeps passing for the wrong reasons.
- **Decide the audio question properly** (Deviation 1) — assess not creating `<audio>`
  elements until playback is granted.
- **Refresh `docs/monitization`/delivery notes if the LCP number is quoted anywhere** — the
  recorded first-frame figure is stale.
