# MinMs Formula: Research Clarification

**Research question**: What is the recommended basis for computing minimum media dwell time from text? What does reading-speed / comprehension research recommend (words per minute for silent reading, for accessibility, for comics with lettering)? What should the word-count source be (the frame `description`, visible lettering, or both)? Is the 150 wpm figure defensible, and should there be a per-word floor plus a fixed overhead?

---

## 1. Direct Answer / Recommendation

### Word-count source

**Use the frame `description` field** (which per F20 must reproduce all visible lettering). This is the correct and only practical source because:

1. **Deterministic**: The `description` is a structured manifest field — no OCR or image analysis needed.
2. **Authoritative**: F20 already mandates that `description` reproduces all visible lettering, so the word count equals the visible-lettering word count.
3. **Verifiable**: The word count can be computed at build time without runtime image processing.

Do not use the `alt` text (≤125 chars, high-level summary) — it omits most lettering and would undercount.

### 150 wpm figure

**150 wpm (400 ms/word) is defensible and appropriately conservative for accessibility.** It is:

- Below the 175–300 wpm normal range for adult silent non-fiction reading (Brysbaert, 2019).
- Roughly aligned with BBC subtitle guidelines (160–180 wpm) which are designed for mixed-ability audiences including older viewers and people with reading difficulties.
- More generous than Netflix's 20 CPS (~240 wpm at 6 chars/word average).

For a horror web comic targeting a broad audience including users with dyslexia, ADHD, low vision, and non-native speakers, erring on the side of slower is correct. The cost of a slightly longer dwell is minor (user can advance); the cost of too-short is comprehension failure.

However, 150 wpm should be understood as a **floor**, not a target. Typical readers will finish early and advance manually.

### Fixed overhead

**The 1500 ms fixed overhead (500 + 1000) is well-justified** by comics-specific research:

1. **Scene/image processing time**: Eye-tracking studies show that even text-free panels require significant viewing time (8–15+ seconds per panel in some studies) for image comprehension (Ikuta et al., 2023).
2. **First fixation on pictures**: Laubrock et al. (2018) found that the first fixation on each panel lands more frequently on the picture than on the text, confirming that readers process images before text.
3. **Cognitive integration overhead**: Comics require bimodal (text + image) processing, which adds time beyond pure text reading.
4. **Narrative inference gaps**: Readers spend time inferring undepicted events between panels (Magliano et al., 2016).

### Per-word floor

**A per-word floor is already implicit** in the formula: at 150 wpm, each word gets 400 ms, which is well above the ~200–250 ms average fixation duration for silent reading (Rayner, 1998; Starr & Rayner, 2001). This means even a single-word frame gets 500 + 400 + 1000 = 1900 ms, which is adequate.

---

## 2. Key Findings with Citations

### 2.1 Silent reading speed (general adult population)

| Source | Finding | URL |
|--------|---------|-----|
| Brysbaert (2019), *Journal of Memory and Language* | Meta-analysis of 190 studies (18,573 participants): average silent reading = **238 wpm** (non-fiction), **260 wpm** (fiction). Range: 175–300 wpm (non-fiction), 200–320 wpm (fiction). Oral reading: 183 wpm. | https://doi.org/10.1016/j.jml.2019.104047 |
| Rayner et al. (2016), *Psychological Science in the Public Interest* | College-educated adults read "about 200–400 wpm." Skilled readers averaged 308 wpm. Rates above 1000 wpm impossible without severe comprehension loss. | https://doi.org/10.1177/1529100615623267 |
| Starr & Rayner (2001), *Trends in Cognitive Sciences* | Fixation durations average **200–250 ms** (4–5 per second) during silent reading. | https://doi.org/10.1016/S1364-6613(00)01604-7 |

**Implication**: 150 wpm (400 ms/word) is ~37% slower than the average silent reading rate (238 wpm), placing it in the bottom ~5th percentile of normal readers. This is appropriate for an accessibility floor.

### 2.2 Subtitle/caption reading speed (analogous to comic lettering)

| Source | Finding | URL |
|--------|---------|-----|
| BBC Subtitle Guidelines | Recommended speed: **160–180 wpm** (0.33–0.375 s/word). Minimum cue duration: ~1.2 s for a 4-word cue. Designed for mixed-ability audiences. | https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles |
| BBC R&D White Paper WHP306 (Sandford, 2015) | Ofcom: subtitles should not exceed **160–180 WPM**; above 200 WPM "difficult for many viewers to follow." Study found enjoyment peaked at ~177 WPM (block) / ~171 WPM (scrolling). | https://downloads.bbc.co.uk/rd/pubs/whp/whp-pdf-files/WHP306.pdf |
| Netflix Timed Text Style Guide | Maximum **20 CPS** (characters per second) for adult content (~240 wpm at 6 chars/word). Minimum cue duration: 5/6 second (~833 ms). | https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide |

**Implication**: The BBC's 160–180 wpm range is the closest analog to comic lettering (both involve reading overlaid text while processing visual scenes). The current 150 wpm is slightly more conservative, which is appropriate for horror content with potentially dense atmospheric text.

### 2.3 Comic-specific eye-tracking research

| Source | Finding | URL |
|--------|---------|-----|
| Ikuta, Wöhler & Aizawa (2023), *Scientific Reports* | Panel viewing times are **strongly positively correlated with text length** (median Spearman ρ = 0.7188). Individual reading speed is the most influential factor. Model: VT = t(p)/c(r) + i(p\|r) where t(p) = text length, c(r) = reader's reading speed, i(p\|r) = image viewing time. | https://doi.org/10.1038/s41598-023-47120-w |
| Laubrock, Hohenstein & Kümmerer (2018) | First fixation on each panel lands more frequently on the **picture than on the text**. Readers process images before text. | In *Empirical Comics Research*, Routledge |
| Kirtley, Murray, Vaughan & Tatler (2023), *Applied Cognitive Psychology* | Eye-tracking study of comic page layout navigation. Disruptions to panel order slow reading speed and increase regressive saccades. | https://doi.org/10.1002/acp.4018 |
| Foulsham, Wybrow & Cohn (2016), *Applied Cognitive Psychology* | Pictures understood more quickly and with fewer fixations when in original order. Disordered panels required more attention and regressions. | https://doi.org/10.1002/acp.3229 |
| Yang et al. (2024), *PMC* | Fixation durations on text content (non-experts: 237 ± 103 ms; experts: 243 ± 112 ms) are longer than on images (non-experts: 199 ± 74 ms; experts: 217 ± 88 ms). | https://pmc.ncbi.nlm.nih.gov/articles/PMC11726626 |

**Implication**: Comics reading involves parallel text + image processing. The formula's fixed overhead (1500 ms) accounts for image processing time that is independent of text length, consistent with Ikuta et al.'s finding that even text-free panels have substantial viewing times.

### 2.4 Accessibility guidelines

| Source | Finding | URL |
|--------|---------|-----|
| WCAG 2.2 SC 2.2.1 (Timing Adjustable) | For each time limit, user must be able to: turn off, adjust (≥10× default), or extend (≥20 s warning, ≥10× extension). | https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable |
| WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide) | Moving/auto-updating content > 5 s must have pause/stop/hide mechanism. | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide |

**Implication**: The `minMs` formula provides a floor, but the player must also comply with WCAG by allowing users to pause/extend. The formula and WCAG are complementary: the floor ensures a minimum default; WCAG ensures user control.

### 2.5 Reading speed for readers with disabilities

| Source | Finding | URL |
|--------|---------|-----|
| Le Cunff et al. (2024), *European Journal of Neuroscience* | Dyslexic readers demonstrate greater pupil dilation when reading, indicating higher cognitive load. ADHD readers show deficits in sustained attention affecting reading. | https://doi.org/10.1111/ejn.16201 |
| Christopher et al. (2012), *JEP: General* | Working memory and processing speed are unique predictors of reading comprehension. | https://doi.org/10.1037/a0027375 |

**Implication**: A 150 wpm floor accommodates readers with dyslexia, ADHD, low vision, and non-native speakers who may read at 100–150 wpm or slower.

---

## 3. Options and Tradeoffs

### Option A: Keep current formula (`minMs = 1500 + words × 400 ms`)

**Pros:**
- Simple, deterministic, already specified
- 150 wpm is defensible (below normal range, aligned with subtitle standards)
- 1500 ms overhead accounts for image processing
- Conservative = accessible

**Cons:**
- May feel slow for fast readers (but they can advance manually)
- Does not differentiate text complexity (e.g., "onomatopoeia" vs. "antidisestablishmentarianism")

### Option B: Increase rate to 200 wpm (300 ms/word) + keep 1500 ms overhead

**Pros:**
- Faster pacing, closer to natural reading for average readers
- Still above BBC subtitle minimum (160 wpm)

**Cons:**
- 200 wpm is within the normal range (175–300), so slower readers may struggle
- Less accessible for the target audience
- Marginal benefit since users can advance manually

### Option C: Tiered by text complexity (e.g., 150 wpm for complex text, 200 wpm for simple)

**Pros:**
- More precise pacing
- Could weight by word length or syllable count

**Cons:**
- Adds complexity to the formula and validation
- Difficult to define "complexity" objectively
- Over-engineered for the use case

### Option D: WCAG-style "extend" model (short default + user extends)

**Pros:**
- Maximum user control
- WCAG 2.2.1 compliant by design

**Cons:**
- Poor default experience (users must act before reading)
- Adds UI complexity
- Not suitable for automated/ambient viewing modes

### Recommendation: **Option A (keep current formula)**

The current formula is well-calibrated:

1. **150 wpm** is defensible and appropriately conservative. It is below the normal range (175–300 wpm), aligned with BBC subtitle standards (160–180 wpm), and accessible to readers with disabilities.

2. **1500 ms fixed overhead** is justified by comics-specific research showing significant image processing time even for text-free panels.

3. **400 ms/word** is well above average fixation duration (200–250 ms), providing a comfortable per-word floor.

4. The formula is simple, deterministic, and can be validated at build time.

**The real accessibility guarantee comes from the player's ability to pause/extend (WCAG 2.2.1/2.2.2), not from the floor value itself.** The floor ensures a reasonable default; user control ensures universal access.

---

## 4. Summary Table

| Parameter | Current value | Research basis | Verdict |
|-----------|--------------|----------------|---------|
| Reading rate | 150 wpm (400 ms/word) | Below normal range (175–300); aligned with BBC subtitles (160–180) | ✅ Defensible |
| Fixed overhead | 1500 ms | Image processing time (Ikuta et al. 2023); first fixation on pictures (Laubrock et al. 2018) | ✅ Justified |
| Word source | `description` field | F20 mandates description = all visible lettering; deterministic | ✅ Correct |
| Per-word floor | Implicit (400 ms) | Above average fixation duration (200–250 ms) | ✅ Adequate |
| Upper clamp | 30000 ms | Prevents excessive dwell for text-heavy frames | ✅ Reasonable |
| Lower clamp | 500 ms | Minimum perceptible dwell | ✅ Reasonable |

---

## 5. References

1. Brysbaert, M. (2019). How many words do we read per minute? A review and meta-analysis of reading rate. *Journal of Memory and Language*, 109, 104047. https://doi.org/10.1016/j.jml.2019.104047

2. Rayner, K., Schotter, E. R., Masson, M. E. J., Potter, M. C., & Treiman, R. (2016). So much to read, so little time: How do we read, and can speed reading help? *Psychological Science in the Public Interest*, 17(1), 4–34. https://doi.org/10.1177/1529100615623267

3. Starr, M. S., & Rayner, K. (2001). Eye movements during reading: Some current controversies. *Trends in Cognitive Sciences*, 5(4), 156–163. https://doi.org/10.1016/S1364-6613(00)01604-7

4. Ikuta, H., Wöhler, L., & Aizawa, K. (2023). Statistical characteristics of comic panel viewing times. *Scientific Reports*, 13, 20291. https://doi.org/10.1038/s41598-023-47120-w

5. Laubrock, J., Hohenstein, S., & Kümmerer, M. (2018). Attention to comics: Cognitive processing during the reading of graphic literature. In *Empirical Comics Research* (pp. 239–263). Routledge.

6. Kirtley, C., Murray, C., Vaughan, P. B., & Tatler, B. W. (2023). Navigating the narrative: An eye-tracking study of readers' strategies when reading comic page layouts. *Applied Cognitive Psychology*, 37(5), 1069–1084. https://doi.org/10.1002/acp.4018

7. Foulsham, T., Wybrow, D., & Cohn, N. (2016). Reading without words: Eye movements in the comprehension of comic strips. *Applied Cognitive Psychology*, 30(4), 566–579. https://doi.org/10.1002/acp.3229

8. Yang, H. et al. (2024). Reading comics: The effect of expertise on eye movements. *PMC*. https://pmc.ncbi.nlm.nih.gov/articles/PMC11726626/

9. BBC. (2026). *BBC Subtitle Guidelines*. https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles

10. Sandford, J. (2015). The Impact of Subtitle Display Rate on Enjoyment Under Normal Television Viewing Conditions. *BBC Research & Development White Paper WHP306*. https://downloads.bbc.co.uk/rd/pubs/whp/whp-pdf-files/WHP306.pdf

11. W3C. (2024). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/

12. Le Cunff, A.-L. et al. (2024). Neurophysiological measures and correlates of cognitive load in ADHD, ASD and dyslexia. *European Journal of Neuroscience*. https://doi.org/10.1111/ejn.16201

13. Christopher, M. E. et al. (2012). Predicting word reading and comprehension with executive function and speed measures across development. *Journal of Experimental Psychology: General*, 141(2), 470–488. https://doi.org/10.1037/a0027375
