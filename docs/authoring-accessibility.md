# Authoring Accessibility — Alt Text, Narrative Descriptions, and Durations

> Research-backed guidance for authoring and revising frames in `src/data/story.json`.
> Applies to every authored master integrated under `specs/003-artcraft-local-authoring`.
> Companion to `docs/delivery.md` (build/delivery) and the frame schema in
> `specs/001-cinematic-player/contracts/story-manifest.schema.json`.

## 1. Purpose and scope

This document answers one operational question for the `horror-web-comic` cinematic player:

> **When a frame's artwork (or its narrative intent) changes, which of `alt`, `description`, and `durationMs` must be updated, and to what standard?**

It synthesizes WCAG 2.2, W3C/WAI techniques, industry audio-description practice (Netflix/Amazon/ITU/ISO), and peer-reviewed work on text alternatives and graphics comprehension. It is normative for authored frames: a frame that violates the rule in §7 fails review even if the build passes.

Non-goals: it does not change the schema (v1, frozen), the player, or budgets. It governs content authoring only.

## 2. The three authored fields and their roles

The manifest (`frame` object) requires three authored accessibility/pacing fields:

| Field | Role in player | Accessibility role |
|---|---|---|
| `alt` | `image.alt = frame.alt` (line 549, `player.js`) | WCAG 1.1.1 short text alternative for the non-text content (the frame image). Announced by screen readers as the image's name. |
| `description` | `a11y.announce(frame.description)` (line 584) into `#frame-description` (`aria-live="polite"`, `aria-atomic="true"`) | Long/narrative description: the equivalent experience for a non-visual reader. Also the audio-description proxy for the frame's visual content. |
| `durationMs` | `resolveDuration()` → dwell timer before auto-advance (line 493) | Pacing: how long the frame (and its description) is on screen. Drives audio-description fit and reading time. |

`alt` and `description` are **distinct and complementary**, not duplicates:

- `alt` = label identifying the image (short, ~≤125 chars / one sentence). WebAIM: "be succinct… typically only a few words are necessary, though rarely a short sentence or two may be appropriate" (WebAIM, *Alternative Text*).
- `description` = the narrative content a sighted reader extracts from the frame (long form, plain text, announced as one atomic block).

Duplicating `alt` into `description` (or vice versa) is a defect: screen-reader users hear the same information twice, and the live region's atomic announcement becomes redundant.

## 3. WCAG 1.1.1 — Non-text Content

Normative requirement (WCAG 2.2, SC 1.1.1, Level A):

> "All non-text content that is presented to the user has a text alternative that serves the equivalent purpose, except for the situations listed below."

For the frame image (informative image, not decorative, not a control), the applicable branch is the first: "text alternatives can make the same information available in a form that can be rendered through any modality… Short and long text alternatives can be used as needed to convey the information."

Key implications for authored frames:

1. **Every frame image is non-text content** → every frame must carry both `alt` (short) and `description` (long). The schema already enforces non-empty strings; quality is the author's job.
2. **"Equivalent purpose" is context-dependent.** The same artwork can need different `alt`/`description` depending on narrative role (Stanford UIT: "The ALT text will differ in each case because the context and purpose of the image changes"). A frame that is a beat in a horror sequence is described for *story function*, not as a still-life inventory.
3. **The author is responsible.** WCAG's Understanding doc and WAI tutorials are explicit that alternative text "needs to be determined by the author, depending on the usage, context, and content of an image." Automated/AI generation is permitted as a draft only; the author owns accuracy (Cadernos Abralin: "authors remain responsible for accuracy, scope, and alignment").

### 3.1 Failure mode F20 — staleness

WCAG failure technique **F20** (Failure of 1.1.1 and 4.1.2): "situations where the non-text content is updated, but the text alternative is not updated at the same time. If the text in the text alternative cannot still be used in place of the non-text content without losing information or function, then it fails."

This is the single most relevant failure for authored frames: re-authoring a master (`media-src/frames/frame-XX.svg`) without re-authoring `alt`/`description` is exactly F20. The build will not catch it. Review must.

## 4. Complex images — two-part alternatives

W3C WAI *Complex Images* tutorial: when an image "contains substantial information – more than can be conveyed in a short phrase or sentence," a **two-part** alternative is required:

1. **Short description** (here: `alt`) — identify the image and, where appropriate, point to the long description.
2. **Long description** (here: `description`) — "a textual representation of the essential information conveyed by the image."

The frame image is, by construction, a complex image: a horror-comic frame carries character pose, setting, lighting, lettering, and mood that a single sentence cannot carry. Therefore:

- `alt` must **not** attempt to be the full description. Cap it at ~125 characters (Stanford UIT general maximum; WebAIM ~150). It names what the frame *is* ("Porta do vestíbulo com a placa …").
- `description` carries the long-form equivalent: setting, characters, action, lettering, and mood, in narrative order.
- `alt` and `description` must be **non-redundant** but **jointly complete**: a reader who hears only `alt` (e.g., browsing by images) still knows which frame; a reader who hears `description` gets the story.

WAI also recommends referring to and summarizing complex images from accompanying text; in this player the equivalent is the scene `title` and the frame's position in the sequence.

## 5. Comics-specific practice

Comics are a special case of complex image: sequential, multi-panel, lettering-driven, mood-driven. Industry/accessibility guidance converges on these points (Veroniiiica, *How To Write Alt Text For Digital Comics*; Last Call Media, *Accessible Comics*; APLN *Image Description Guide for Comics and Graphic Novels*; Liana Kerr, *On Describing Comics*):

1. **Set the scene first.** Before dialogue, state who is visible, where, and what they are doing (Veroniiiica).
2. **Then dialogue.** Reproduce speech/thought/captions/SFX, labelled by speaker and modality ("(thinking)", "signing"). Avoid interrupting intense exchanges with over-description (APLN: "Avoid interrupting intense dialogue exchanges").
3. **Describe mood, not just facts.** Body language, background color shifts, and tonal cues carry meaning in horror (Kerr: "describe body language or an overall tone or mood of the panel, which could be conveyed by a change in the background color").
4. **Describe what is new/relevant**, not recurring character descriptions every frame. Establish a character sheet once (pinned post/resource); note deviations ("if Veronica wasn't wearing her glasses, this would need to be noted") (Veroniiiica).
5. **Reading order.** Describe left-to-right, top-to-bottom for English/Portuguese (Veroniiiica).
6. **Grouping.** Panels that form a single beat can be described as a unit, but this player is frame-by-frame, so each frame is its own unit — no grouping needed at runtime. (APLN grouping principle applies to multi-panel pages; here each `frame` is one panel.)
7. **Transcripts > alt for whole comics.** For a whole comic, a full transcript/description is the optimal non-visual format (Veroniiiica; Last Call Media). In this player, `description` *is* that per-frame transcript segment, and `#frame-description` is the live region that announces it. The player already implements the "transcript per frame" pattern.
8. **Don't describe the medium as content unless it matters.** "Painting of…" only when materiality is relevant (WebAIM). For frames, the medium (illustration) is implied; describe content.

### 5.1 Expressive language and pacing (APLN)

Print-disabled readers "prefer expressive language to help convey the tone and emotions" (APLN). But "descriptions should not weigh down the narrative" — "short descriptions with a quick pace took precedence over style in order to safeguard plot development." This is the tension that `durationMs` exists to resolve (§6).

## 6. Audio descriptions and duration/pacing

Although this player is a still-frame comic (not video), its `description` is functionally an **audio description** delivered via the live region, and `durationMs` is the dwell time during which a non-visual reader consumes it. The audio-description literature therefore applies directly to choosing `durationMs`.

### 6.1 WCAG time-based media

- 1.2.1 Audio-only and Video-only (Prerecorded) (A): for video-only, either a transcript or an audio track is provided.
- 1.2.3 Audio Description or Media Alternative (Prerecorded) (A): transcript or audio description.
- 1.2.5 Audio Description (Prerecorded) (AA): audio description for all prerecorded video.
- 1.2.7 Extended Audio Description (Prerecorded) (AAA): when pauses are insufficient, freeze the frame and extend.

For this player, the equivalent of "audio description" is the `description` field; the equivalent of "extended" is a longer `durationMs` so the live region's announcement completes before auto-advance. The player already auto-advances on `durationMs` (line 496) and announces at render (line 584) with a 500 ms delay (`a11y.announce`, `a11y.js`). That 500 ms + speech time must fit inside `durationMs`.

### 6.2 Industry speaking-rate and timing guidance

- Earcatch AD guidelines: preferred speaking rate **130–160 words per minute** (wpm), present tense, third-person omniscient, describe as specifically as possible, avoid over-describing, "avoid silences that are too long; make sure the listener does not have to wonder whether the AD is still working."
- Netflix AD Style Guide: "Speak clearly and at a rate that can be understood"; delivery should match scene pace; "Allow room for dialogue, sound effects, music and intentional silence"; "Description over dialogue should be utilized only as a last resort"; "Mix level should transition … in no more than 5 seconds."
- Amazon Prime Video AD Style Guide: "Don't squeeze in a description if it adds nothing"; "The description should be read as the action occurs, not before or after"; "pauses should not last longer than 20 seconds"; "AD doesn't have to fill in every pause."
- ITU-T T.701.21 / ISO/IEC TS 20071-21: description only during non-dialogue pauses; "should not fill every moment"; allow time to experience music/silence; "not all visual content can be described" — prioritize plot-critical information.
- W3C WAI: "Extended audio description is provided for all prerecorded video content in synchronized media" when pauses are insufficient (freeze frame).

### 6.3 Pacing rule for frames

Combine the above with the player mechanics:

- `resolveDuration(frame, scene, story, speed) = max(MINIMUM_DWELL, authored / speed)` with `MINIMUM_DWELL` enforced and `durationMs` range 500–30000 ms (schema).
- The description is announced ~500 ms after render (`a11y.announce` timer) and must finish before auto-advance. At 130–160 wpm, a frame's `description` word count implies a minimum dwell:
  - `minDwellMs = 500 (announce delay) + (wordCount / 150 wpm) * 60000 + 1000 (buffer)`.
- Therefore: **`durationMs` must be ≥ the estimated speech duration of `description` at 150 wpm**, plus a 1 s buffer, and ≤ 30000 ms. If the required dwell exceeds 30 s, the description is too long for one frame — split the beat across frames or shorten.
- Conversely, a frame with a one-line description should not dwell 30 s: match dwell to content (Amazon: "Don't squeeze in a description if it adds nothing"; also avoid over-dwelling, which kills pacing in horror).
- Reduced-motion / degraded / save-data modes switch to light variants but **do not** change `durationMs` (duration is authored, not capability-derived). Pacing tests (`tests/perf`) enforce budgets.

### 6.4 Audio tracks vs. descriptions

Scene/frame `audio` tracks are separate from `description`. When a frame has both a scene audio track and a long `description`, the description is delivered as text (live region), not mixed into audio — the player does not duck. Authors must therefore ensure the `description` does not need to be heard over dialogue; if the scene audio is dense, keep `description` shorter or split the frame. (Netflix: description over dialogue only as last resort.)

## 7. Concrete rule — when to update `alt` / `description` / `durationMs`

This is the operative rule. Apply it at authoring time and at review time (commit/PR). It is checkable by a reviewer reading the diff.

### Rule R1 — Update triggers (any one ⇒ update the named field)

A frame's authored accessibility/pacing fields must be updated **in the same change** that modifies the underlying content, per WCAG F20 (staleness). Triggers:

| Trigger (change to…) | `alt` | `description` | `durationMs` |
|---|---|---|---|
| Frame image re-authored or replaced (new master in `media-src/frames/`) | **Yes** | **Yes** | Re-evaluate (R2) |
| Image composition changed: subject, pose, setting, lighting, lettering, or mood differs | **Yes** | **Yes** | Re-evaluate (R2) |
| Image dimensions/aspect ratio changed (affects layout but not content) | No (unless subject changed) | No | No |
| Scene audio track added/changed/removed | No | Re-evaluate (may shorten/lengthen) | Re-evaluate (R2) |
| Narrative beat changed (plot point, dialogue, SFX, caption text) | **Yes** (if visible lettering changes) | **Yes** | Re-evaluate (R2) |
| Pacing intent changed (faster/slower beat) | No | No | **Yes** |
| Character appearance deviation from established sheet (new costume, injury, etc.) | **Yes** | **Yes** | Re-evaluate (R2) |
| Decorative-only change (color grade, texture) with no information change | No | No | No |

"Re-evaluate (R2)" means: recompute the minimum dwell from the (possibly unchanged) description word count and the new audio context; update `durationMs` only if the new minimum differs by more than 10% or crosses a 500 ms boundary. This avoids churn ("No blanket rewrite of timing" — spec 003 clarification).

### Rule R2 — Derivation formulas

For each frame:

1. `alt` (short): ≤ 125 characters, one sentence, no "image of…", names what the frame *is* + its narrative hook. Must change if the visible subject/lettering/mood changed.
2. `description` (long): plain text, narrative order (scene → characters → action → dialogue/SFX → mood). Must change whenever the image or beat changes. Word count `W`.
3. Minimum dwell: `minMs = 500 + ceil(W / 150 * 60000) + 1000`, clamped to [500, 30000]. Authored `durationMs` must satisfy `durationMs ≥ minMs`. If `minMs > 30000`, split the beat or shorten the description.
4. If a scene audio track is present and dense, prefer `description` ≤ 40 words (≈ 16 s at 150 wpm) so it does not compete with the track.

### Rule R3 — Cross-field consistency checks (reviewer)

A frame passes review only if all hold:

1. `alt` ≠ `description` (not a duplicate) and `alt` is a strict subset of `description`'s subject (no information in `alt` absent from `description`).
2. `description` contains no claim not supportable from the image or the authored beat (accuracy/restraint — Cadernos Abralin).
3. `description` reproduces any visible lettering (dialogue, captions, SFX, signs) verbatim or clearly marked as paraphrase.
4. `durationMs ≥ minMs` (R2.3) and `durationMs ≤ 30000`.
5. If the image changed, both `alt` and `description` changed in the same commit (F20).
6. Decorative-only frames (none expected in this comic; every frame is narrative) would use `alt: ""` — but the schema requires `minLength: 1`, so a truly decorative frame is not representable; do not author one. (Consistent with "every frame is narrative.")

### Rule R4 — Provenance

Per spec 003 (FR-008): record the authoring tool/version via commit trailer (`Authored-With: vectorcraft 0.12.0`) and/or an optional JSON sidecar in `media-src/`. The accessibility metadata is part of the authored artifact; a commit that changes a master without updating `alt`/`description`/`durationMs` must be rejected in review. No manifest schema change.

### Rule R5 — No retroactive blanket rewrites

Per spec 003 clarification ("No blanket rewrite of timing"): do not mass-regenerate `alt`/`description`/`durationMs` for untouched frames. Update only frames whose content changed. This keeps diffs reviewable and avoids introducing regressions in pacing tests.

## 8. Quality criteria for `alt` and `description` (authoring checklist)

Drawn from WCAG/WAI, WebAIM, Stanford UIT, Cadernos Abralin, and comics-specific guidance:

- **Accurate**: describes only what is in the image; no speculation/evaluation (Cadernos Abralin).
- **Equivalent**: conveys the same information a sighted reader gets, in the context of the story (WCAG 1.1.1 "equivalent purpose"; WebAIM "equivalent").
- **Succinct (`alt`)**: ≤ 125 chars; no "image of…"/"graphic of…" (screen readers already announce "image"); exception when medium matters (WebAIM; Stanford UIT).
- **Complete (`description`)**: setting, characters, action, lettering, mood, in narrative order; visible text reproduced (Veroniiiica; APLN).
- **Non-redundant pair**: `alt` ≠ `description`; `alt` is the label, `description` is the content (W3C Complex Images two-part alternative).
- **No duplication with caption/scene title**: don't repeat the scene title verbatim in `alt` (WebAIM "not be redundant… as text near the image").
- **Punctuation**: end with a period; screen readers pause (Stanford UIT).
- **Language**: pt-BR (matches `document.documentElement.lang` and `#frame-description.lang`); `lang` is fixed by the player.
- **Character consistency**: don't re-describe recurring characters each frame; note deviations only (Veroniiiica).
- **Mood over inventory in horror**: describe tonal cues (lighting, color, body language) that carry meaning, but keep plot-critical info first (APLN; Kerr).
- **Accuracy of lettering**: speech/thought/captions/SFX reproduced; modality marked ("(thinking)", "signing") (Veroniiiica; Leif & Thorn).
- **No personal attributes** (age/gender/race) unless analytically relevant and consistent (Cadernos Abralin; The Markup).

## 9. Enforcement

- Build (`npm run build`) validates schema and refs, not accessibility prose. F20-class staleness is not machine-checkable; it is a review gate.
- Suggested: add a lightweight unit test in `tests/unit/` that (a) every frame has `alt`/`description` non-empty (schema already), (b) `alt.length ≤ 125`, (c) `alt !== description`, (d) `durationMs ≥ minMs` computed from word count. This converts R2/R3 into a failing test rather than a guideline. (Optional; schema frozen.)
- E2E `tests/e2e/wcag-audit.spec.js` already asserts `imageAlt.length > 0` and `aria-describedby === 'frame-description'`; keep it green.

## 10. Sources

Primary standards:
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.2* — SC 1.1.1 Non-text Content; SC 1.2.1/1.2.3/1.2.5/1.2.7 Time-Based Media. https://www.w3.org/TR/WCAG22/
- W3C WAI, *Understanding SC 1.1.1: Non-text Content*. https://www.w3.org/WAI/WCAG22/Understanding/non-text-content
- W3C WAI, *Complex Images* tutorial. https://www.w3.org/WAI/tutorials/images/complex/
- W3C WAI, *Images* tutorial. https://www.w3.org/WAI/tutorials/images/
- W3C, *Technique F20: Failure of 1.1.1 and 4.1.2 due to not updating text alternatives when changes to non-text content occur*. https://www.w3.org/WAI/WCAG22/Techniques/failures/F20.html
- W3C WAI, *Description of Visual Information (audio description)*. https://www.w3.org/WAI/media/av/description/
- W3C, *Understanding SC 1.2.7 Extended Audio Description*. https://www.w3.org/WAI/WCAG22/Understanding/extended-audio-description-prerecorded

Industry audio-description practice:
- Netflix, *Audio Description Style Guide v2.5*. https://partnerhelp.netflixstudios.com/hc/en-us/articles/215510667-Audio-Description-Style-Guide-v2-5
- Amazon Prime Video, *AD Style Guide*. https://m.media-amazon.com/images/G/01/CooperWebsite/dvp/downloads/AD_Style_Guide_Prime_Video.pdf
- ITU-T, *T.701.21 — Guidance on audio description* (2022). https://www.itu.int/epublications/publication/itu-t-t-701-21-2022-03-guidance-on-audio-description
- ISO/IEC TS 20071-21:2015, *Guidance on audio descriptions*. https://www.iso.org/standard/63061.html
- Earcatch, *Guidelines and delivery AD* (2024). https://www.earcatch.nl/upload/earcatch_guidelines_and_delivery_ad_20240901.pdf
- Section 508, *Synchronized Media / Audio Descriptions*. https://www.section508.gov/create/synchronized-media/

Alt-text practice:
- WebAIM, *Alternative Text*. https://webaim.org/techniques/alttext/
- Stanford UIT, *Informative Images*. https://uit.stanford.edu/accessibility/learn-about/images/image-informative
- Style Manual (Australian Government), *Alt text, captions and titles for images*. https://www.stylemanual.gov.au/content-types/images/alt-text-captions-and-titles-images
- Cadernos Abralin, *Alternative Text (ALT) for Figures and Images*. https://cadernos.abralin.org/index.php/cadernos/alt
- W3C, *HTML5: Techniques for providing useful text alternatives*. https://w3c.github.io/alt-techniques/

Comics-specific:
- Veroniiiica, *How To Write Alt Text For Digital Comics*. https://veroniiiica.com/how-to-write-alt-text-digital-comics/
- Last Call Media, *Accessible Comics???*. https://lastcallmedia.com/blog/accessible-comics
- APLN, *Image Description Guide for Comics and Graphic Novels*. https://apln.ca/image-description-guide-for-comics-and-graphic-novels/
- Leif & Thorn, *Making Your Webcomic Accessible*. https://leifandthorn.com/2021/05/making-your-webcomic-accessible-a-grab-bag-of-tips-tricks/
- Webcomics R&D, *Accessibility*. https://webcomics.ti.gt/R+D/a11y/
- The Markup, *How We Approach Visual Storytelling Accessibility*. https://themarkup.org/hello-world/2023/09/16/how-we-approach-visual-storytelling-accessibility-at-the-markup
- Liana Kerr, *On Describing Comics* (cited via Last Call Media / Broodhollow descriptions).

Cognitive/graphics research:
- Schnotz & Wagner, *Surface and deep structures in graphics comprehension*, Memory & Cognition (2014). https://doi.org/10.3758/s13421-014-0490-2
- NeuroAdaptX (Springer, 2025): presentation-level adaptation preserving informational equivalence.
- MDPI J. Imaging (2023), *Detecting Deceptive Dark-Pattern Web Advertisements for Blind Screen-Reader Users* (alt-text equivalence gaps in practice).

Audio-description timing research:
- ACM, *Towards the usage of pauses in audio-described videos*. https://dl.acm.org/doi/10.1145/2461121.2461130
- DEV, *Find the pauses. Plan the words: audio-description timing from SRT and WebVTT*. https://dev.to/nekoautomata/find-the-pauses-plan-the-words-audio-description-timing-from-srt-and-webvtt-3j0d

Project-internal:
- `specs/003-artcraft-local-authoring/spec.md` (FR-002, FR-009, SC-003, SC-006; clarifications on metadata scope and "no blanket rewrite of timing").
- `specs/001-cinematic-player/contracts/story-manifest.schema.json` (frame fields: `alt`, `description`, `durationMs`).
- `src/scripts/player.js` (render line 549 sets `image.alt`; line 584 announces `description`; `resolveDuration` line 18).
- `src/scripts/a11y.js` (announce with 500 ms delay into `#frame-description`).
- `tests/e2e/wcag-audit.spec.js` (asserts `imageAlt.length > 0`, `aria-describedby === 'frame-description'`).
