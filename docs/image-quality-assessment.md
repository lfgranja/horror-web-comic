# Image Quality Assessment for Web Images / Comics — Research & Recommended Gate

**Context:** `horror-web-comic` is transitioning from synthetic 1200×800 fixtures to authored masters produced with local ArtCraft tools (`media-src/` → `assets/` via `build:images`). This note surveys subjective vs. objective image quality methods, cites peer-reviewed/industry sources, and recommends a feasible quality gate that a small team can actually run.

**Companion spec:** `specs/003-artcraft-local-authoring/spec.md` (FR-007 subjective comparative review, fail-fast build, budgets unchanged).

---

## 1. Why a gate is needed now

Today `docs/delivery.md` admits the published frames are "synthetic fixtures of 1200×800 (~0.19 bit/pixel), promoted to master from the already-published variants. A green media build certifies that the pipeline reproduces its own fixtures — not that final art is reproducible." When real art lands, two distinct failure modes appear:

1. **Authoring failure** — the master itself is low quality (compression, banding, blur).
2. **Delivery failure** — `build:images` (sharp, AVIF/WebP/JPEG at Q 50/75/80, light variants at Q 35/60/65) degrades the master beyond acceptability.

A single gate cannot catch both. The recommendation separates **master quality** (subjective, because there is no reference for "good art") from **delivery fidelity** (objective, because the master is the reference).

---

## 2. Subjective methods

### 2.1 Core constructs

- **Mean Opinion Score (MOS)** — arithmetic mean of per-stimulus ratings on a predefined scale (ITU-T P.10/G.100 vocabulary). The canonical 5-point Absolute Category Rating (ACR) scale maps Bad/Poor/Fair/Good/Excellent → 1–5 (ITU-T P.800, P.910) [^MOS].
- **Double-Stimulus / paired methods** — DSCQS (Double Stimulus Continuous Quality Scale), DSIS/DCR (Degradation Category Rating), and Pair Comparison (PC), all standardized in ITU-R BT.500 and ITU-T P.910 [^SVQ].
- **Side-by-side (2AFC / flicker)** — two images shown adjacent or alternating; observer picks the better or detects a difference. SSIMULACRA's authors use side-by-side at 1:1 and flicker tests as the perceptual anchors for their score bands [^SSIMULACRA2].

### 2.2 What the literature says about MOS reliability

- MOS is **ordinal in nature**; averaging categorical labels is mathematically questionable, though accepted in practice. Range-equalization bias makes MOS from two different test pools non-comparable (Streijl, Winkler & Hands, 2016; Hoßfeld et al., 2016) [^MOS].
- ITU-T P.800.2 explicitly states that MOS from separate experiments should not be directly compared unless designed for it [^MOS].
- A MOS difference of ≈ **0.46 on a 5-point scale** is needed for 75 % of users to detect the higher-quality photo (Katsigiannis et al., 2018, *Quality and User Experience*) [^MOS].
- ITU-T P.910 requires 4–40 subjects, ≥ 15 preferred, non-expert, vision-screened (Snellen/Ishihara), in a controlled or at least reported environment [^SVQ].

### 2.3 Small-team reality

A full ITU study (15+ screened subjects, lab, statistics) is infeasible for a solo/small team and is unnecessary for a comic pipeline. The defensible lightweight substitute, consistent with spec FR-007, is:

- **Stakeholder visual review + documented side-by-side** (size, format, qualitative impression) for each integrated master.
- **At least one second pair of eyes** (author + maintainer), recorded via commit trailer (`Authored-With: …`) and optional sidecar JSON in `media-src/`.
- Treat subjective review as a **human gate on masters only**, never as a CI assertion.

---

## 3. Objective metrics

All metrics below are **full-reference** (master = reference, delivered variant = distorted). That is exactly the shape of the delivery problem.

### 3.1 PSNR (Peak Signal-to-Noise Ratio)

- Definition: 10·log₁₀(MAX²/MSE), dB. 8-bit typical range 30–50 dB for lossy compression; ≥ 60 dB considered high for 12-bit [^PSNR].
- **Poor correlation with human perception** (Huynh-Thu & Ghanbari, 2008, *Electronics Letters*; PSNR Wikipedia performance comparison) [^PSNR]. Use only as a crude floor / regression detector, not as a quality claim.

### 3.2 SSIM (Wang et al., 2004, *IEEE TIP*)

- Perception-based: models degradation as change in structural information; accounts for luminance and contrast masking. Range −1…1, 1 = identical [^SSIM].
- Cited >50,000 times; IEEE Best Paper 2009; Emmy 2015 [^SSIM].
- Significantly outperforms MSE/PSNR on LIVE-style databases, but Dosselmann & Yang (2009) showed its advantage is sometimes overstated and that MSE can win on packet-loss video [^SSIM].

### 3.3 MS-SSIM (Wang, Simoncelli & Bovik, 2003, Asilomar)

- Multi-scale SSIM over 5 scales via subsampling; better than single-scale SSIM on subjective databases [^SSIM].
- Recommended as the **default delivery-fidelity metric**: cheap (scikit-image / ffmpeg), well-understood, robust to mild geometric differences.

### 3.4 VMAF (Netflix + USC + UT Austin + Nantes, 2016)

- ML-fused (SVM) of DLM + (historically VIF) + temporal feature; output 0–100, trained on subjective DMOS. VMAF v1 (June 2026) adds CAMBI banding detection and a chroma feature; NEG variant prevents enhancement gaming [^VMAF].
- **Built for video**, but runs per-frame. On the MSU benchmark it outperformed all other metrics across H.265/VP9/AV1/VVC [^VMAF]. VMAF can be gamed by preprocessing (Zvezdakova et al., 2019; Siniukov et al., 2021) [^VMAF] — relevant if anyone ever optimizes for the score instead of for quality.
- Heavier dependency (libvmaf). Treat as optional/secondary, not the CI gate, unless the runner has it.

### 3.5 LPIPS (Zhang et al., 2018, CVPR)

- "The Unreasonable Effectiveness of Deep Features as a Perceptual Metric" — deep CNN features (VGG/AlexNet/SqueezeNet) outperform PSNR/SSIM by large margins on a new human-judgment dataset. Holds across architectures and supervision levels [^LPIPS].
- Requires PyTorch; heavy. Best used for **offline authoring review** (e.g., comparing two candidate masters), not CI.

### 3.6 SSIMULACRA 2 (Sneyers, Cloudinary, 2022)

- MS-SSIM in XYB color space + asymmetric ringing/smoothing error maps, 6 scales, tuned on CID22/TID2013/KADID-10k/KonFiG. Correlation table (TID2013): SSIMULACRA 2.1 SRCC 0.8445 vs. MS-SSIM 0.7868 vs. VMAF 0.7439 vs. SSIM 0.7552 [^SSIMULACRA2].
- Score bands mapped to MOS: 10 ≈ MOS 1 ("bad"), 30 ≈ 2 ("poor"), 50 ≈ 3 ("fair"), 70 ≈ 4 ("good", artifacts perceptible but not annoying), 80 = very high (not noticeable side-by-side), 90 = visually lossless, 100 = lossless [^SSIMULACRA2].
- Open source (BSD-3, C++), builds from libjxl. Ideal **image-specific** metric for a comic pipeline, but adds a native build step — feasible only if a maintainer owns it.

---

## 4. Correlation summary (for choosing the gate metric)

| Metric | TID2013 SRCC | KADID-10k SRCC | Notes |
|---|---|---|---|
| PSNR-Y | 0.6394 | 0.6319 | Poor; use as floor only |
| SSIM | 0.7552 | 0.7806 | Baseline perceptual |
| MS-SSIM | 0.7868 | 0.8359 | Good, cheap, recommended |
| VMAF | 0.7439 | 0.7253 | Video-oriented; gaming risk |
| SSIMULACRA 2.1 | 0.8445 | 0.8133 | Best image correlation; native build |
| LPIPS (VGG) | — (not in table) | — | Highest on LPIPS dataset; heavy |

Source: SSIMULACRA 2 README metric-performance tables [^SSIMULACRA2].

---

## 5. Recommended feasible quality gate

Design constraints from the project: no new runtime deps in CI, pinned toolchain, fail-fast build, Node + sharp + ffmpeg already required, masters in `media-src/`, variants in `assets/`.

### 5.1 Tier A — Authored masters (human gate, not automated)

- **What:** each new master in `media-src/frames/` or `media-src/audio/`.
- **Gate:** stakeholder side-by-side vs. the current synthetic fixture (or vs. the previous master for a re-author), with a documented note (size, format, qualitative impression) per spec FR-007.
- **Record:** commit trailer `Authored-With: <tool> <version>`; optional sidecar JSON in `media-src/`.
- **Rationale:** there is no reference for "good art"; objective metrics cannot judge aesthetics. Subjective review is the only honest master gate (spec Q: "Subjective quality → stakeholder visual review plus side-by-side").

### 5.2 Tier B — Delivery fidelity (automated, CI, full-reference)

Compare each generated variant to its master. Recommended implementation uses **ffmpeg's built-in `ssim`/`ms_ssim` filters** (zero new dependency — ffmpeg is already a hard preflight requirement) [^PSNR][^SSIM]:

| Check | Threshold | Applies to |
|---|---|---|
| MS-SSIM (luma) | ≥ 0.95 | Standard AVIF/WebP/JPEG at every width |
| MS-SSIM (luma) | ≥ 0.90 | Light (`-light`) variants (intentional degradation accepted) |
| PSNR | ≥ 30 dB | Floor / regression detector, all variants |
| Byte budget | ≤ 300 KB (standard) / 150 KB (light) | Already enforced by `build:images` |
| Geometry | width ≤ master, no upscaling | Already enforced (T217) |

- **Fail-fast:** any variant below threshold fails `build:images` (aligns with FR-011 / "99.9 % green is still red").
- **Why MS-SSIM and not SSIMULACRA2/LPIPS:** MS-SSIM is available in ffmpeg today, runs in seconds, and correlates well (SRCC 0.78–0.84). SSIMULACRA2 requires a native C++ build; LPIPS requires PyTorch. Both are recommended as **offline authoring aids** (Tier C), not CI gates.

### 5.3 Tier C — Optional authoring aids (offline, maintainer-run)

- **SSIMULACRA 2** (if built locally): score ≥ 70 for "good" (artifacts perceptible but not annoying) on the delivered AVIF; ≥ 80 for "very high" [^SSIMULACRA2].
- **LPIPS** (if PyTorch available): compare two candidate masters or two encoding settings; lower is better; use relative, not absolute.
- **VMAF** (if ffmpeg built with libvmaf): per-frame score as a sanity check; beware gaming.

### 5.4 Tier D — Synthetic fixtures (no perceptual gate)

- Fixtures are **baselines, not quality targets**. Do not compare them to a reference and do not assert a perceptual score.
- Keep the existing structural/byte/integrity checks (format, dimensions, srcset, audio bitrate, unreferenced-asset scan, budget).
- When a fixture is replaced by an authored master, the authored master becomes the new reference and Tier A/B apply from that commit forward.

### 5.5 What NOT to do

- Do not add a perceptual threshold to `scripts.ci` that can be gamed by preprocessing (VMAF gaming literature) [^VMAF].
- Do not compare MOS values across separate review sessions (ITU-T P.800.2) [^MOS].
- Do not run LPIPS/SSIMULACRA2 in CI without owning their heavy native deps.
- Do not gate synthetic fixtures on perceptual scores.

---

## 6. Implementation sketch (no code change required now)

1. Add a helper `scripts/quality-gate.mjs` (optional, post-authoring) that shells out to `ffmpeg -i variant -i master -lavfi ms_ssim=... -f null -` and parses the printed score, failing below threshold.
2. Invoke it from `build:images` only when `QUALITY_GATE=1` (default off) so CI stays fast and the existing byte/geometry checks remain the hard gate; flip to default-on once a baseline of authored masters exists.
3. Document the subjective review template in `docs/authoring.md` (per spec US-3): master path, tool+version, reviewer, date, side-by-side notes, decision.

---

## 7. Sources

[^SSIM]: Wang, Z.; Bovik, A. C.; Sheikh, H. R.; Simoncelli, E. P. (2004). "Image quality assessment: from error visibility to structural similarity." *IEEE Transactions on Image Processing*, 13(4), 600–612. DOI 10.1109/TIP.2003.819861. Wikipedia "Structural similarity index measure."

[^MS-SSIM]: Wang, Z.; Simoncelli, E. P.; Bovik, A. C. (2003). "Multiscale structural similarity for image quality assessment." *Asilomar Conference on Signals, Systems & Computers*, 1398–1402.

[^PSNR]: "Peak signal-to-noise ratio." Wikipedia; Huynh-Thu, Q. & Ghanbari, M. (2008). "Scope of validity of PSNR in image/video quality assessment." *Electronics Letters*, 44(13), 800.

[^VMAF]: "Video Multimethod Assessment Fusion." Wikipedia; Netflix TechBlog (2016) "Toward a Practical Perceptual Video Quality Metric"; Bampis et al. (June 2026) "VMAF v1: Good Is Not Good Enough"; Zvezdakova et al. (2019) arXiv:2107.04510; Siniukov et al. (2021) arXiv:2107.04510.

[^LPIPS]: Zhang, R.; Isola, P.; Efros, A. A.; Shechtman, E.; Wang, O. (2018). "The Unreasonable Effectiveness of Deep Features as a Perceptual Metric." *CVPR 2018*. arXiv:1801.03924.

[^SSIMULACRA2]: Sneyers, J. (Cloudinary) (2022). "SSIMULACRA 2." GitHub `cloudinary/ssimulacra2` (BSD-3). Score bands and correlation tables as documented in README.

[^MOS]: "Mean opinion score." Wikipedia; ITU-T P.800, P.800.1, P.800.2, P.910, P.913; Streijl, R. C.; Winkler, S.; Hands, D. S. (2016). "Mean opinion score (MOS) revisited." *Multimedia Systems*, 22(2), 213–227; Katsigiannis, S. et al. (2018). "Interpreting MOS scores… Understanding user experience differences for photo quality." *Quality and User Experience*, 3(1), 6; Hoßfeld, T. et al. (2016). "QoE beyond the MOS." *Quality and User Experience*, 1(1), 2.

[^SVQ]: "Subjective video quality." Wikipedia; ITU-R BT.500 (2012); ITU-T P.910 (2008); Brunnström, K. & Barkowsky, M. (2018). "Statistical quality of experience analysis." *Journal of Electronic Imaging*, 27(5), 053013; Hossfeld, T. (2014). "Best Practices for QoE Crowdtesting." *IEEE Transactions on Multimedia*, 16(2), 541–558.

[^WangBovik]: Wang, Z. & Bovik, A. C. (2009). "Mean squared error: Love it or leave it? A new look at Signal Fidelity Measures." *IEEE Signal Processing Magazine*, 26(1), 98–117.

[^Dosselmann]: Dosselmann, R. & Yang, X. D. (2009). "A comprehensive assessment of the structural similarity index." *Signal, Image and Video Processing*, 5(1), 81–91.
