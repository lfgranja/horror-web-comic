# WCAG 2.2 AAA Normative Rules & Architectural Gates Requirements Quality Checklist

**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)  
**Feature Directory**: `specs/004-wcag-aaa-audit-pipeline`  
**Purpose**: Reviewer-owned requirements-quality checklist validating completeness, clarity, consistency, measurability, and coverage for WCAG 2.2 AAA normative rules, enhanced color contrast (7:1), and two-tiered target size geometry.  
**Created**: 2026-10-24  

> **Ownership & Lifecycle Note**: This checklist is a reviewer-owned requirements-quality review artifact ("Unit Tests for English"). An item marked `[x]` indicates that the reviewer has determined the requirement specification satisfies the criterion (clarity, completeness, consistency, measurability, coverage). An unchecked item `[ ]` indicates an open review item or specification gap. Generated items must NEVER be automatically checked by tools. `/speckit-implement` reads checklist state but does not modify markers.

---

## 1. Requirement Completeness

- [x] CHK001 - Are normative WCAG tag requirements explicitly enumerated for all target conformance levels (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `wcag2aaa`)? [Completeness, Spec §FR-003]
- [x] CHK002 - Are the five required visual themes (`cinema`, `noir`, `eldritch`, `industrial`, `shadow-props`) exhaustively documented as mandatory audit targets? [Completeness, Spec §FR-004]
- [x] CHK003 - Are both levels of the Two-Tiered Target Size architecture (Axe SC 2.5.8 AA $\ge 24\text{px}$ and Playwright programmatic SC 2.5.5 AAA $\ge 44 \times 44\text{px}$) fully specified? [Completeness, Spec §FR-005]
- [x] CHK004 - Does the specification define requirements for handling disabled or inactive controls (`disabled`, `aria-disabled="true"`) under AAA contrast rules? [Completeness, Spec §FR-009]
- [x] CHK005 - Are root-level and page-level audit requirements specified for the full document scope without arbitrary `.include()` subtrees? [Completeness, Spec §FR-006, Clarification Q4]
- [x] CHK006 - Does the spec define whether pseudo-elements (`::before`, `::after`) and icons with text are subject to enhanced contrast requirements? [Completeness, Spec §FR-004] — *Resolvido: Glifos Unicode em botões são nós de texto avaliados sob texto normal (>= 7:1); pseudo-elementos da aplicação são puramente visuais sem texto.*
- [x] CHK007 - Are minimum contrast requirements defined for graphical objects and user interface components (WCAG 2.2 SC 1.4.11 AA $\ge 3:1$) alongside text contrast? [Completeness, Spec §Traceability Matrix, contrast.spec.js] — *Resolvido: SC 1.4.11 é nível AA (não há AAA) e é garantido pelos tokens e pela suíte fotométrica contrast.spec.js.*

---

## 2. Requirement Clarity

- [x] CHK008 - Is "large text" quantified with exact CSS sizing thresholds ($18\text{pt} / 24\text{px}$ normal or $14\text{pt} / 18.66\text{px}$ bold) to distinguish $4.5:1$ from $7.0:1$ requirements? [Clarity, Spec §FR-004] — *Resolvido: Quantificado formalmente em §FR-004 (<24px normal / <18.66px negrito >=7:1; >=24px normal / >=18.66px negrito >=4.5:1).*
- [x] CHK009 - Is "interactive control" unambiguously defined with concrete HTML elements and ARIA roles (e.g. `button`, `select`, `input[type="range"]`, `a[href]`) for target size evaluation? [Clarity, Spec §FR-005, Contracts/test-suite-api.md §5.3] — *Resolvido: Seletor normativo formalizado em §FR-005.2 e no contrato de API.*
- [x] CHK010 - Is the measurement methodology for the $44 \times 44\text{px}$ target size clearly specified as computed bounding box including padding rather than content-box? [Clarity, Spec §FR-005, Plan §Summary]
- [x] CHK011 - Is the behavior for non-conclusive diagnostics (`incomplete`) clearly differentiated from hard violations (`violations`) with explicit action items? [Clarity, Spec §FR-011, Clarification Q3]
- [x] CHK012 - Is the scope of the full-document scan defined so that sibling overlays (`#blocked-overlay`, `#end-overlay`) are audited only when visible? [Clarity, Spec §FR-006]

---

## 3. Requirement Consistency

- [x] CHK013 - Do the contrast requirements in §FR-004 ($\ge 7.0:1$) align with the non-negotiable accessibility provisions of Constitution Principle VI? [Consistency, Constitution Principle VI, Spec §FR-004]
- [x] CHK014 - Is the two-tiered target size gate in §FR-005 consistent with the touch ergonomical rules in `src/styles/base.css` ($2.8\text{rem} = 44.8\text{px}$)? [Consistency, Research §2, Spec §FR-005]
- [x] CHK015 - Do the normative tags in §FR-003 match the tag list defined in the formal test suite API contract? [Consistency, Contracts/test-suite-api.md §4, Spec §FR-003]
- [x] CHK016 - Are the theme identifiers listed in §FR-004 identical to the CSS data attributes supported in `tokens.css` (`data-theme`)? [Consistency, Spec §FR-004, Plan §Summary]

---

## 4. Acceptance Criteria & Measurability

- [x] CHK017 - Can "zero violations of WCAG 2.2 AAA" be verified objectively through a boolean assertion on `results.violations.length === 0`? [Measurability, Spec §SC-001, Spec §FR-010]
- [x] CHK018 - Can the $44 \times 44\text{px}$ physical target size requirement be verified through an automated programmatic bounding box measurement in Playwright? [Measurability, Spec §SC-003, Spec §FR-005]
- [x] CHK019 - Are pass/fail criteria for `incomplete` diagnostics objectively defined as non-blocking warnings (`console.table`) without ambiguity? [Measurability, Spec §FR-011, Clarification Q3]
- [x] CHK020 - Is the enhanced contrast ratio ($\ge 7.0:1$) verifiable mathematically against computed DOM colors across all themes? [Measurability, Spec §SC-002, Spec §FR-004]

---

## 5. Scenario & Edge Case Coverage

- [x] CHK021 - Are requirements specified for handling text rendered over gradient backgrounds or semi-transparent backdrops where Axe cannot calculate contrast? [Edge Case, Coverage, Spec §FR-011]
- [x] CHK022 - Does the spec define how target size is evaluated when an interactive element is partially off-screen or scaled via CSS transforms? [Edge Case, Coverage, Spec §FR-005, Contracts/test-suite-api.md §5.3] — *Resolvido: Medição efetuada no estado de repouso após document.getAnimations() garantindo que caixas estejam dentro dos limites do viewport.*
- [x] CHK023 - Are requirements specified for target size compliance when controls wrap onto multiple lines on narrow viewports ($360\text{px}$)? [Edge Case, Coverage, Spec §User Story 2]
- [x] CHK024 - Does the spec define whether elements with `aria-hidden="true"` or `visibility: hidden` are excluded from target size bounding box loops? [Edge Case, Spec §FR-005, Contracts/test-suite-api.md §5.3] — *Resolvido: Predicado de elegibilidade descarta nós com closest('[aria-hidden="true"], [hidden]'), display: none ou pointer-events: none.*
- [x] CHK025 - Are requirements specified for focus visible indicators (WCAG SC 2.4.7 AA) ensuring focus rings have at least $3:1$ contrast against adjacent background colors? [Coverage, Traceability Matrix, Spec §FR-008, contrast.spec.js] — *Resolvido: Matriz de rastreabilidade corrigida associando anéis de foco (>=2px sólido e contraste >=3:1 SC 2.4.7/2.4.13 AAA) à suíte fotométrica contrast.spec.js.*
