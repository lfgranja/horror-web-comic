# Research: Safari/WebKit autoplay gesture unlock — per-element vs. per-document, and multi-`<audio>` patterns

**Feature**: `001-cinematic-player` | **Date**: 2026-09-23
**Companion to**: `research-autoplay-detection.md` (R4 gesture fallback)
**Method**: All claims below were verified against the cited primary sources on
2026-09-23 (webkit.org blog posts, WebKit Bugzilla, current WebKit `main`
source on GitHub, MDN, WHATWG HTML spec, Apple developer docs). WebKit source
quotes are from `main` as of commit `56c5d512` (2026-09-23).

---

## TL;DR for this repo (scene track + per-frame SFX mixed)

- The gesture "unlock" is **per media element** (and per `AudioContext`), not
  per document/origin. A single tap does **not** auto-unlock other elements —
  but since Safari 16.4-ish / the 2023 transient-activation change, a single
  tap **can unlock every element you `play()` synchronously inside the same
  gesture handler**.
- The current recommended pattern for mixed scene track + SFX: keep separate
  elements **only for simultaneous mixing**; play every element you plan to
  use **once, inside the gesture handler** (call `play()`, then
  `pause()`/`currentTime = 0`, or just `.play()` them all), and reuse those
  same elements forever after. Do **not** create new `HTMLAudioElement`s
  lazily later — a fresh element has never been unlocked and will be blocked
  until the next gesture.
- For a *sequence* (one element playing back-to-back clips), the 2017 WebKit
  blog explicitly recommends **changing the `src` of one element** rather
  than creating multiple elements.

---

## 1. Per-element or per-document? → **Per element** (with important nuance)

### Claim 1.1 — WebKit's official statement: restrictions are granted per element

- **Source**: WebKit blog, "Auto-Play Policy Changes for macOS", 2017-06-08
  (Kevin Decker, Safari team):
  https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/
- Exact quote: *"Auto-play restrictions are granted on a per-element basis.
  Change the source of the media element instead of creating multiple media
  elements if you want to play multiple videos back to back (or play a
  pre-roll ad with sound, followed by the main video)."*
- Same post: *"Websites should assume any use of `<video>` or `<audio>`
  requires a user gesture click to play."* (still the safest assumption).

### Claim 1.2 — WebKit engineers reconfirmed per-element scoping in 2017 (Bugzilla)

- **Source**: WebKit Bugzilla bug 178120, "Audio autoplay restrictions favor
  abusive content" (Safari 11):
  https://bugs.webkit.org/show_bug.cgi?id=178120
- Jer Noble (Apple/WebKit media engineer), comment 2 (2017-10-16): *"The
  restrictions are per element (or context). So you can .play() an empty
  `<video>` element, then later attach a src to it, and play unrestricted."*
  — i.e., the recommended "pre-unlock" trick: `play()` every element you will
  ever need during the first gesture; afterwards those elements may play (or
  have their `src` swapped) without a new gesture.
- Bug status: still **NEW** (never resolved as "fixed"); the per-element
  model was deliberately kept (comment 4/5: document-wide unlock would let
  nag-banner sites blare audio after any scroll/keypress).

### Claim 1.3 — Current WebKit implementation confirms the gate is evaluated per element

- **Source**: WebKit `main`, `Source/WebCore/html/MediaElementSession.cpp`
  (`playbackStateChangePermitted()`), viewed 2026-09-23:
  https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/MediaElementSession.cpp
- Every restriction check in `playbackStateChangePermitted()` is
  `m_restrictions & RequireUserGestureForAudioRateChange` etc. — restrictions
  live on **each element's own `MediaElementSession`**. On `play()` inside a
  gesture, `HTMLMediaElement` clears them for **that element only**:
  `Source/WebCore/html/HTMLMediaElement.cpp` →
  `removeBehaviorRestrictionsAfterFirstUserGesture()` sets
  `m_removedBehaviorRestrictionsAfterFirstUserGesture = true` and calls
  `removeBehaviorRestriction(...)` on that element's session
  (https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/HTMLMediaElement.cpp).
- There is **no per-origin "all media unlocked" flag** in the engine. The
  closest document-level things are:
  - `Document::noteUserInteractionWithMediaElement()` (updates a main-frame
    "HasUserInteractedWithMediaElement" state used only by
    **domain-specific quirks**, e.g. `needsPerDocumentAutoplayBehavior()`);
  - a **Spotify-only quirk** (`shouldBlockAudiblePlaybackWhileAudioIsPlaying`,
    comment in `Quirks.cpp`: "spotify.com: block additive audible playback…")
    which *blocks* a second audible element while another plays. This is not
    a general Safari behavior (see Caveats).

### Claim 1.4 — But: the *gesture condition* itself is document-level sticky activation (the nuance)

- **Source**: WebKit `main`, `Source/WebCore/dom/Document.cpp` →
  `Document::mediaUserGestureReason()` (viewed 2026-09-23). The gate passes
  if **any** of:
  1. `ActiveToken` — a user-gesture token is being processed *right now*
     (i.e., your JS runs synchronously inside the event handler);
  2. `TransientActivation` — `window.hasTransientActivation()` (the
     document-wide transient user-activation flag, HTML spec §6.4);
  3. `MediaFinishedGrace` — within **1 s** after an element that was started
     by a user gesture fired `ended`
     (`maxIntervalForUserGestureForwardingAfterMediaFinishesPlaying = 1_s`);
  4. `InheritsFromDocumentSetting` / `InheritedUserGesturesQuirk` —
     embedder/quirk settings.
- Practical meaning: once the **document** has sticky/transient activation
  (after any qualifying interaction), the "gesture" precondition in
  `playbackStateChangePermitted()` is satisfied document-wide — but the
  per-element restriction removal (`removeBehaviorRestrictionsAfterFirstUserGesture`)
  is what actually matters for previously-blocked elements, and that happens
  per element, at `play()` time.
- **Uncertainty (explicit)**: WebKit's internal precedence here is intricate
  (e.g. whether a later `play()` on a never-unlocked element succeeds purely
  on transient activation depends on which restriction bit is still set and
  on platform defaults). The engine reading above is high-confidence for
  *architecture* (per-element session, document-level gesture reasons) but we
  did **not** find a version-pinned release note stating exactly when
  `TransientActivation` began satisfying the media gate. Commit
  `98a0984` ("Use transient activation for media playback",
  https://github.com/WebKit/WebKit/commit/98a09842676c3af9db9a11e6617993db076c133c,
  landed on `main` 2023-01-31, bug 251372) made
  `Document::processingUserGestureForMedia()` return true when there is an
  active transient activation — that commit's message says it *changed test
  expectations so "the second video is now able to play because the first was
  started with a user gesture"*. Treat "Safari 16.4 (March 2023)" as the
  approximate ship vehicle; **verify on real devices** if exact-version
  behavior matters (see §4).

---

## 2. Mixed scene track + per-frame track: does one tap unlock all?

### Claim 2.1 — One gesture CAN unlock many elements — if you `play()` them all inside the handler

- **Sources**: Bug 178120 comment 2 (Jer Noble, quoted above); WebKit STP 36
  release notes, "Fixed removing user gesture restrictions when adding the
  autoplay attribute to a media element during a user gesture (r219509)":
  https://webkit.org/blog/7833/release-notes-for-safari-technology-preview-36
- Mechanism (current source): during a gesture, `play()` on each element
  removes that element's gesture restrictions. So a handler like:

  ```js
  async function unlock(e) {
    for (const el of [sceneEl, sfxPool]) {
      try { await el.play(); el.pause(); el.currentTime = 0; }
      catch { /* ignore */ }
    }
  }
  element.addEventListener('pointerdown', unlock, { once: true });
  ```

  …unlocks all of them in one tap. **Caveats**: the loop must run
  synchronously in the gesture (or each `await` chain still within
  transient-activation window); pre-unlock elements with real (or short
  silent) sources; iOS may keep hardware limits on *simultaneous* playback
  counts (not a policy gate — see Caveats).

### Claim 2.2 — Elements created *later* are NOT unlocked by an earlier gesture

- **Source**: same architecture as Claim 1.3 — a new `HTMLAudioElement` gets
  its own `MediaElementSession` with the default
  `RequireUserGestureForAudioRateChange`-family restrictions; no flag says
  "this document's future elements are free".
- This is why the "one shared player + reuse" pattern is the dominant
  community workaround (e.g. the widely-circulated
  `ios-html-audio-unlock` gist:
  https://gist.github.com/amariichi/0059ff72766c3878dfa3ff939598ba32 —
  *"Use one shared player instance and reuse it for every utterance"*;
  secondary source, but consistent with the primary-source architecture).
- For this repo: **don't** lazily create a new `<audio>` per frame. Pre-create
  a small pool, unlock them all on the start gesture, reuse.

### Claim 2.3 — Web Audio alternative: `AudioContext` is the other per-object gate

- **Sources**: MDN "Autoplay guide for media and Web Audio APIs"
  (updated 2026-09-10):
  https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay ;
  MDN Web Audio best practices (autoplay policy section):
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- An `AudioContext` created outside a gesture starts `suspended`; create or
  `resume()` it inside a gesture. Once running, **all** sound scheduled
  through it is free — which is why games prefer it for many short clips.
  Trade-offs (per bug 178120 and MDN): buffers must be decoded (memory),
  no native streaming of long tracks; but mixing/latency are better.
- MDN's `navigator.getAutoplayPolicy("mediaelement" | "audiocontext")` API
  (W3C autoplay-detection draft) is the intended way to *query* the policy;
  **uncertainty**: `getAutoplayPolicy` is not documented as shipped in
  Safari's user-facing release notes; WebKit only has it in imported WPT
  interfaces (https://github.com/WebKit/WebKit/blob/main/LayoutTests/imported/w3c/web-platform-tests/interfaces/autoplay-detection.idl).
  Caniuse lists it as no-support for Safari. Don't rely on it; use
  `play()`-promise rejection detection instead (per
  `research-autoplay-detection.md`).

---

## 3. Recommended implementation patterns (current, primary-source-backed)

| Need | Pattern | Source |
|---|---|---|
| Back-to-back clips (sequence) | **One element, swap `src`** ("Change the source of the media element instead of creating multiple media elements") | webkit.org blog 7734 (2017) |
| Simultaneous mix (scene + SFX) | Pre-create the elements, `play()` each once inside the start gesture (then pause/reset), reuse thereafter | Bug 178120 comment 2; STP 36 notes |
| Many short one-shots / precise mixing | Single `AudioContext` created/resumed in the gesture; schedule all clips through it | MDN autoplay guide; MDN Web Audio best practices |
| Detect blockage | `play()` promise → `.catch(NotAllowedError)` → show your own play UI; retry on next gesture | webkit.org blog 7734; MDN autoplay guide |
| Qualifying gestures | Handlers for `keydown` (non-Esc), `mousedown`, `pointerdown` (mouse), `pointerup` (touch/pen), `touchend` — **not** `touchstart`/`scroll` | WHATWG HTML §6.4.2 "activation triggering input event": https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event ; confirmed by Apple Dev Forums thread 23499 (`touchstart` doesn't qualify) |
| Sequence of *elements* (playlist) | Start next track in `ended` handler — WebKit grants a **1-second grace** ("MediaFinishedGrace") after a gesture-started element ends, so chained `play()` in `ended` works | WebKit main, `Document.cpp` (`maxIntervalForUserGestureForwardingAfterMediaFinishesPlaying = 1_s`) |

Note: for this repo's horror-comic player, the mixed scene+per-frame case maps
to row 2 (element pool unlocked at "start reading" tap) + row 5 (use
`pointerdown`/`pointerup`/`touchend`/`keydown` hooks, not `touchstart`).

---

## 4. Has behavior changed recently (2024–2026)?

**No documented change to the per-element model itself.** What changed around
it:

- **2023-01-31** (ships ~Safari 16.4, Mar 2023): commit `98a0984` "Use
  transient activation for media playback" — document-wide transient
  activation now satisfies the media gesture gate; test expectations updated
  so a second media element can play after the first was gesture-started.
  This is the biggest recent relaxation relevant to multi-element pages.
  (https://github.com/WebKit/WebKit/commit/98a09842676c3af9db9a11e6617993db076c133c,
  bug 251372)
- **~2025-2026**: a **Spotify-only quirk** landed (`Quirks.cpp`:
  "spotify.com: block additive audible playback…"), denying a second audible
  element while another plays without an *active* gesture token. Domain-quirk
  only — not general behavior — but it shows Apple is willing to add
  document-level audible-overlap restrictions per-site.
  (https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Quirks.cpp)
- **iOS 26 PWA regressions** (2025): bugs 295518 (`<audio>` silent after
  PWA reopen; `play()` resolves but no sound) and 291892 (WebAudio silent
  after backgrounding) show gesture/autoplay behavior *around* backgrounding
  is still in flux. Unrelated to the per-element unlock model, but relevant
  if the player runs as an installed PWA.
  (https://bugs.webkit.org/show_bug.cgi?id=295518,
  https://bugs.webkit.org/show_bug.cgi?id=291892)
- **Sticky activation redefinition**: WebKit now tracks sticky activation as
  an explicit boolean per proposed WHATWG change whatwg/html#11454
  (comment in `LocalDOMWindow.cpp`) — spec-level, not behavior-breaking.
- Apple's current author-facing doc ("Delivering Video Content for Safari")
  still states the same model as 2016/2017: `play()`/autoplay without a
  gesture only when silent/muted; otherwise a gesture is required.
  (https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari)

---

## 5. Caveats and explicit uncertainties

1. **No Safari release note ever re-stated the per-element rule** after the
   2017 blog; our "still true" claim rests on current engine source + the
   open bug 178120, not on a newer official statement. Confidence: high.
2. **Transient-activation ship version** (~16.4) is inferred from the commit
   date (2023-01-31) + Safari 16.4 release timing; I did not find a Safari
   16.4 release note mentioning it. If exact-version behavior matters,
   verify on-device.
3. **Exact semantics of "play() all elements in one gesture" on iOS**:
   community-documented and architecturally supported, but I found no WebKit
   layout test named for unlocking *multiple audio elements in one gesture*
   (the closest is
   `Tools/TestWebKitAPI/Tests/WebKitCocoa/autoplaying-multiple-media-elements.html`
   mentioned in commit `98a0984`, for video). Test on real iOS hardware.
4. **iOS simultaneous-audio hardware limits**: historically iOS capped
   concurrent `<audio>`/`<video>` element playback; I did not find a current
   primary source confirming a specific limit. If you need many
   simultaneous element-based tracks, prefer the `AudioContext` path.
5. **`getAutoplayPolicy()`**: in WebKit's tree only as imported WPT IDL; not
   shipped per caniuse/MDN BCD. Use promise-rejection detection instead.
6. **Apple Developer Forums threads** cited above are first-party-adjacent
   but not normative; treat as corroboration only.

## Source list (primary)

- https://webkit.org/blog/6784/new-video-policies-for-ios/ (2016-07-25)
- https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/ (2017-06-08)
- https://webkit.org/blog/7833/release-notes-for-safari-technology-preview-36 (2018)
- https://bugs.webkit.org/show_bug.cgi?id=178120 (2017-10; still NEW)
- https://bugs.webkit.org/show_bug.cgi?id=295518 (2025-07, iOS 26 PWA)
- https://github.com/WebKit/WebKit/commit/98a09842676c3af9db9a11e6617993db076c133c (2023-01-31)
- https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/MediaElementSession.cpp (main @ 56c5d512, 2026-09-23)
- https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/HTMLMediaElement.cpp (main @ 56c5d512)
- https://github.com/WebKit/WebKit/blob/main/Source/WebCore/dom/Document.cpp (`mediaUserGestureReason`, main @ 56c5d512)
- https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Quirks.cpp (Spotify quirk, main @ 56c5d512)
- https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event (living standard, 2026-09-22)
- https://html.spec.whatwg.org/multipage/media.html#allowed-to-play (living standard)
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay (2026-09-10)
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari (Apple, current)
