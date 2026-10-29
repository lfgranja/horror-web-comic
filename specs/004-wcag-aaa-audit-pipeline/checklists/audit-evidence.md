# Evidence Retention, Reporting Artifacts & Governance Requirements Quality Checklist

**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)  
**Feature Directory**: `specs/004-wcag-aaa-audit-pipeline`  
**Purpose**: Reviewer-owned requirements-quality checklist validating completeness, clarity, consistency, measurability, and governance boundary definitions for test evidence retention (`testInfo.attach`), W3C EARL metadata, JSON/Markdown reporting, and formal closure boundaries for tasks T144, T159, and T176.  
**Created**: 2026-10-24  

> **Ownership & Lifecycle Note**: This checklist is a reviewer-owned requirements-quality review artifact ("Unit Tests for English"). An item marked `[x]` indicates that the reviewer has determined the requirement specification satisfies the criterion (clarity, completeness, consistency, measurability, coverage). An unchecked item `[ ]` indicates an open review item or specification gap. Generated items must NEVER be automatically checked by tools. `/speckit-implement` reads checklist state but does not modify markers.

---

## 1. Requirement Completeness

- [x] CHK001 - Are the attachment requirements via `testInfo.attach()` fully documented for both structured JSON payloads and executive Markdown summaries? [Completeness, Spec §FR-012, Contracts/test-suite-api.md §6]
- [x] CHK002 - Is the formal annotation requirement for `testInfo.annotations` with type `"audit_scope"` explicitly specified? [Completeness, Spec §FR-012, Contracts/test-suite-api.md §6]
- [x] CHK003 - Does the specification formally delineate between the completed automated verification leg and the remaining manual human audit leg for tasks T144, T159, and T176 of Spec 001? [Completeness, Spec §SC-006, Clarification Q6, Research §3]
- [x] CHK004 - Are data fields for `AuditMetadata` (engine, version, browser, viewport, timestamp, classification, assertor) fully documented? [Completeness, Data-Model.md §1.1, Spec §FR-012]
- [x] CHK005 - Does the spec define requirements for the attachment schema validation against `contracts/audit-report.schema.json`? [Completeness, Plan §Project Structure, Contracts/audit-report.schema.json]
- [x] CHK006 - Are requirements specified for console output formatting when inconclusive checks (`incomplete`) are detected? [Completeness, Spec §FR-011, Contracts/test-suite-api.md §5.2]

---

## 2. Requirement Clarity

- [x] CHK007 - Is the exact verbatim text for the `audit_scope` annotation defined without ambiguity? [Clarity, Contracts/test-suite-api.md §6, Research §3]
- [x] CHK008 - Are file naming conventions for attachment artifacts (e.g. `axe-audit-<theme>-<state>.json` and `audit-summary-<theme>-<state>.md`) explicitly specified? [Clarity, Contracts/test-suite-api.md §6]
- [x] CHK009 - Is the distinction between machine-verifiable rules (Axe-Core / Playwright) and human-exclusive WCAG criteria (cognitive clarity, alt fidelity) clearly articulated? [Clarity, Spec §SC-006, Spec §Out of Scope]
- [x] CHK010 - Is the format of the Markdown executive summary table (Theme, Passed Rules, Violations, Incomplete Alerts, Duration) clearly defined? [Clarity, Contracts/test-suite-api.md §6]
- [x] CHK011 - Does the spec clarify whether JSON attachment payloads are stored on disk in `playwright-report/` or transmitted to external services? [Clarity, Plan §Technical Context]

---

## 3. Requirement Consistency

- [x] CHK012 - Is the audit classification ("Machine-Verifiable Automated Regression Gate") consistent between `data-model.md` and `contracts/audit-report.schema.json`? [Consistency, Data-Model.md §1.1, Contracts/audit-report.schema.json]
- [x] CHK013 - Does the scope limitation in §SC-006 align with the governance notes in `specs/001-cinematic-player/tasks.md` regarding T144, T159, and T176? [Consistency, Spec §SC-006, Research §3]
- [x] CHK014 - Is the assertor schema in `data-model.md` (`earl:Software`) consistent with W3C Evaluation and Report Language (EARL 1.0) standards? [Consistency, Data-Model.md §1.1, Research §3]
- [x] CHK015 - Do the attachment MIME types (`application/json` and `text/markdown`) match the Playwright `testInfo.attach()` API specification? [Consistency, Contracts/test-suite-api.md §6]
- [x] CHK016 - Is the fail-fast rule in §FR-010 consistent with the zero-violation criterion in §SC-001? [Consistency, Spec §FR-010, Spec §SC-001]

---

## 4. Acceptance Criteria & Measurability

- [x] CHK017 - Can attachment presence in `playwright-report/` be verified programmatically in CI test runs? [Measurability, Spec §FR-012, Contracts/test-suite-api.md §6]
- [x] CHK018 - Can the generated JSON evidence payload be validated against `contracts/audit-report.schema.json` with zero schema violations? [Measurability, Contracts/audit-report.schema.json]
- [x] CHK019 - Can the failure message formatting (rule ID, impact, help URL, target selector) be tested for presence when an injected violation occurs? [Measurability, Spec §FR-010, Contracts/test-suite-api.md §5.1]
- [x] CHK020 - Can the retention of artifacts during CI failure runs (`if: failure()` in GitHub Actions) be objectively audited in workflow configuration? [Measurability, Research §3, .github/workflows/ci.yml]

---

## 5. Scenario & Governance Boundary Coverage

- [x] CHK021 - Are requirements specified for audit evidence generation when a test fails midway through the 4-state traversal? [Edge Case, Coverage, Spec §FR-012, Contracts/test-suite-api.md §6] — *Resolvido: Padrão Eager Attachment anexa relatórios antes de asserções; gancho test.afterEach captura automaticamente DOM, screenshot e telemetria do player em falha.*
- [x] CHK022 - Does the spec define retention requirements when running tests locally in `--headed` or `--debug` mode versus headless CI? [Edge Case, Coverage, Contracts/test-suite-api.md §2.1] — *Resolvido: Documentado explicitamente em Contracts/test-suite-api.md §2.1 que modos --headed e --debug retêm artefatos normalmente em test-results/.*
- [x] CHK023 - Are legal / compliance disclaimer requirements documented to prevent stakeholders from mistaking automated passes for full legal ADA/EAA/WCAG certification? [Coverage, Governance, Spec §SC-006, Data-Model.md §1.1]
- [x] CHK024 - Does the spec specify how evidence updates are recorded in `specs/001-cinematic-player/tasks.md` when closing the automated leg of T144/T159/T176? [Coverage, Governance, Spec §SC-006, Plan §Technical Context] — *Resolvido: Governança especificada mantendo tarefas como partial e adicionando registro formal de encerramento da perna automatizada na Spec 001.*
- [x] CHK025 - Are requirements specified for handling large attachment payloads to prevent Playwright report size bloat in CI? [Edge Case, Non-Functional, Plan §Technical Context, Contracts/test-suite-api.md §6] — *Resolvido: Teto de <=50 KB por JSON e <=10 KB por Markdown com filtragem de nós brutos de passes/inapplicable.*
