# Dynamic States, Overlays & Narrative Traversal Requirements Quality Checklist

**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)  
**Feature Directory**: `specs/004-wcag-aaa-audit-pipeline`  
**Purpose**: Reviewer-owned requirements-quality checklist validating completeness, clarity, consistency, measurability, and scenario coverage for the 4 essential states, DOM stabilization, audio overlays, and narrative traversal under WCAG 2.2 AAA.  
**Created**: 2026-10-24  

> **Ownership & Lifecycle Note**: This checklist is a reviewer-owned requirements-quality review artifact ("Unit Tests for English"). An item marked `[x]` indicates that the reviewer has determined the requirement specification satisfies the criterion (clarity, completeness, consistency, measurability, coverage). An unchecked item `[ ]` indicates an open review item or specification gap. Generated items must NEVER be automatically checked by tools. `/speckit-implement` reads checklist state but does not modify markers.

---

## 1. Requirement Completeness

- [x] CHK001 - Are the four essential audit states (Repouso, Traversal Dinâmico, Interação/Áudio, Fim da Narrativa) explicitly documented with their respective trigger conditions? [Completeness, Spec §FR-008, Clarification Q7]
- [x] CHK002 - Are ARIA integrity requirements specified for the progress bar (`#progress` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`) across frames 1 through 4? [Completeness, Spec §FR-008]
- [x] CHK003 - Are accessible naming and descriptive text requirements specified for `#frame-image` (`alt` attribute) and the live region `#frame-description`? [Completeness, Spec §FR-008, Spec §User Story 1]
- [x] CHK004 - Are dialog semantics (`role="dialog"`, `aria-modal="true"`, accessible name) explicitly specified for `#blocked-overlay` and `#end-overlay`? [Completeness, Spec §FR-008, Spec §User Story 2] — *Resolvido: Arquitetura Dual Assimétrica adotada (#blocked-overlay modal com aria-modal="true"; #end-overlay não-modal perante FR-033 e Princípio VI).*
- [x] CHK005 - Does the specification define initial keyboard focus requirements when a modal overlay opens and focus return when dismissed? [Completeness, Spec §FR-008, Spec §User Story 2] — *Resolvido: Foco inicial em #continue-silent e #replay; restauração de foco em #player ao dispensar.*
- [x] CHK006 - Are requirements specified for the audio live region (`#audio-status`) regarding `role="status"` and `aria-live="polite"`? [Completeness, Spec §FR-008]

---

## 2. Requirement Clarity

- [x] CHK007 - Is DOM stabilization quantified with concrete readiness attributes (e.g., `data-image-loading="false"`, `data-status="playing"`) before triggering `AxeBuilder.analyze()`? [Clarity, Spec §FR-007]
- [x] CHK008 - Is the stabilization window for live region narration explicitly linked to the 500ms debounce of `AccessibilityController`? [Clarity, Spec §FR-008, Clarification Q7]
- [x] CHK009 - Is the overlay identifier normalized to `#blocked-overlay` rather than the legacy term `#autoplay-overlay`? [Clarity, Spec §FR-006, Research §1]
- [x] CHK010 - Is the state of the control bar during `#end-overlay` display clearly defined as unobstructed and operable? [Clarity, Spec §FR-008, Research §1]
- [x] CHK011 - Does the spec define whether `#theme` dropdown validation requires an expanded state (`aria-expanded="true"`) or only default closed state? [Clarity, Spec §FR-008] — *Resolvido: #theme é um <select> nativo validado em repouso com foco ativo (:focus-visible), sem injeção de aria-expanded (conforme W3C ARIA in HTML).*

---

## 3. Requirement Consistency

- [x] CHK012 - Do the narrative traversal requirements in §FR-008 align with the 4 canonical frames defined in `src/data/story.json`? [Consistency, Spec §FR-008, AGENTS.md Layout]
- [x] CHK013 - Are the live region requirements in §FR-008 consistent with the `AccessibilityController` contract in `src/scripts/a11y.js`? [Consistency, Spec §FR-008, Plan §Summary]
- [x] CHK014 - Is the audio autoplay block modal requirement in §FR-008 consistent with the audio lifecycle defined in Constitution Principle V? [Consistency, Constitution Principle V, Spec §FR-008]
- [x] CHK015 - Do the state traversal assertions in §FR-008 align with the data model entities in `data-model.md` (`AuditState`, `AuditPhase`)? [Consistency, Data-Model.md §1, Spec §FR-008]

---

## 4. Acceptance Criteria & Measurability

- [x] CHK016 - Can the stabilization of `#frame-description` be verified deterministically via Playwright auto-waiting on text content? [Measurability, Spec §FR-007, Spec §FR-008]
- [x] CHK017 - Can the mutation of `aria-valuenow` from '1' to '4' be objectively verified across each frame transition? [Measurability, Spec §FR-008]
- [x] CHK018 - Can modal visibility (`hidden = false`) and focus trap confinement be evaluated objectively without subjective judgment? [Measurability, Spec §FR-006, Spec §FR-008] — *Resolvido: Confinamento físico de foco testado em #continue-silent de #blocked-overlay (verificando #player[inert] e asserção de ciclo da tecla Tab) e transição desobstruída testada em #end-overlay.*
- [x] CHK019 - Is the success criterion for zero violations across all 4 states objectively testable with aggregate reporting? [Measurability, Spec §SC-001, Spec §FR-010]

---

## 5. Scenario & Edge Case Coverage

- [x] CHK020 - Are requirements defined for state machine behavior when frame transitions are aborted or interrupted by user rapid clicks? [Edge Case, Coverage, Spec §Out of Scope, zz-timing-coalescing.spec.js] — *Resolvido: Estados de interrupção dinâmica isolados na suíte de resiliência zz-timing-coalescing.spec.js para proteger o orçamento <=10s.*
- [x] CHK021 - Does the spec define requirements for accessibility tree stability when an image fails to load (`data-image-error="true"`)? [Edge Case, Coverage, Spec §Out of Scope, image-failure.spec.js] — *Resolvido: Falhas catastróficas de mídia isoladas na suíte image-failure.spec.js.*
- [x] CHK022 - Are requirements specified for keyboard traps inside `#blocked-overlay` preventing tab focus from escaping to background player controls? [Edge Case, Coverage, Spec §User Story 2, Spec §FR-008] — *Resolvido: Armadilha de foco e confinamento por HTML inert em #player implementados no audio.js e testados por Playwright para cumprir WCAG 2.2 AAA SC 2.4.12 Focus Not Obscured e W3C APG Modal Dialog pattern.*
- [x] CHK023 - Are accessibility requirements defined for the `#resume-overlay` when returning from a previous reading session via storage? [Edge Case, Spec §FR-008, Research §1] — *Resolvido: #resume-overlay integrado ao Estado 3 via disparo em memória player.pauseForFocusLoss().*
- [x] CHK024 - Does the spec specify accessibility requirements for the error screen (`#error-screen`) when narrative manifest loading fails? [Edge Case, Spec §Out of Scope, manifest-failure.spec.js] — *Resolvido: Falhas de bootstrap isoladas em manifest-failure.spec.js.*
- [x] CHK025 - Are requirements defined for `prefers-reduced-motion` interactions during dynamic frame crossfades within the audit suite? [Coverage, Constitution Principle VI, Spec §FR-002, reduced-motion.spec.js] — *Resolvido: prefers-reduced-motion preservado e auditado na suíte dedicada reduced-motion.spec.js.*
