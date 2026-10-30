# Bug Assessment: accessibility Axe-Core color-contrast failures in CI

- **Slug**: accessibility-axe-color-contrast
- **Created**: 2026-10-29
- **Source**: CI run 40983459997 (github.com, allowlisted) + local e2e run (color-contrast 18 serious, color-contrast-enhanced 6 serious)
- **Verdict**: likely valid, needs reproduction
- **Severity**: medium

## Report (verbatim or summarized)

CI gate (run 40983459997): 9 failed, 2 flaky. accessibility.spec.js fails on mobile-chromium and desktop-chromium at lines 105 (Estado 1: Repouso Canônico & Matriz Ortogonal dos 5 Temas Visuais) and 315 (Estado 4: Fim da Narrativa e Overlay de Encerramento). Axe-Core reports 18 `color-contrast` + 6 `color-contrast-enhanced` serious violations. Local e2e run (chromium) reproduces the same Axe diagnostics.

## Symptom

The automated WCAG 2.2 AAA Axe-Core audit reports serious color-contrast violations (18 nodes) and color-contrast-enhanced violations (6 nodes) across the 5 themes, causing accessibility.spec.js to fail/time out on Chromium projects. The violations are flagged as "diagnósticos inconclusivos requerem inspeção visual humana" but still fail the gate.

## Reproduction

1. `npx playwright test tests/e2e/accessibility.spec.js --project=mobile-chromium` (or desktop-chromium).
2. Observe Axe-Core reporting 18 `color-contrast` + 6 `color-contrast-enhanced` serious violations, test timeout at lines 105/315.

## Suspected Code Paths

- `src/styles/tokens.css` — theme color tokens (`--ink-*`, `--mist-*`, `--amber-*`) for 5 themes (cinema, noir, eldritch, industrial, shadow-props).
- `src/styles/player.css` — control bar, progress bar, badges using theme tokens.
- `tests/e2e/accessibility.spec.js:105,315` — Axe-Core audit states (rest canonical + end overlay).
- `src/scripts/a11y.js` — AccessibilityController (announce, live regions).

## Root Cause Hypothesis

**Confidence: medium.** The Axe-Core violations are likely real contrast shortfalls in one or more of the 5 themes (especially `shadow-props` or `eldritch` with low-contrast amber/mist tokens), or they may be false positives due to CSS filters (`memory-distortion`) / backdrop overlays that Axe cannot evaluate correctly. The test labels them "inconclusivos" requiring visual inspection, suggesting some may be borderline. Needs per-theme, per-state manual verification.

## Proposed Remediation

**Preferred**: Run Axe per theme individually to identify which theme/state fails; adjust the offending token pairs in `tokens.css` to meet AAA contrast (7:1 for normal text, 4.5:1 for large). Re-run accessibility.spec.js.

**Alternatives**:
- If violations are false positives (filtered/overlaid elements), scope the Axe rules to exclude those selectors.
- Lower to AA-only for the affected theme (not recommended; breaks AAA claim).

**Files likely to change**:
- `src/styles/tokens.css` (theme token adjustments)
- `src/styles/player.css` (if component-level contrast)
- `tests/e2e/accessibility.spec.js` (if rule scoping needed)

**Tests to add or update**:
- Per-theme contrast regression (Axe scoped to each theme).
- Visual inspection checklist for the 5 themes at 200% zoom.

## Risks & Considerations

- Changing theme tokens affects visual identity; needs aesthetic review (bug `frames-low-quality` related).
- Some violations may be inherent to the "shadow-props" theme design; may require accepting AA for that theme or redesign.
- Do not weaken Axe assertions to make the gate green.

## Open Questions

- [NEEDS CLARIFICATION: Which theme(s) and element(s) account for the 18 color-contrast + 6 enhanced violations?]
- [NEEDS CLARIFICATION: Are any violations false positives from CSS filters/backdrop overlays?]