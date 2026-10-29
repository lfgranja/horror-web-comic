# CI/CD Pipeline Integration, Performance & Toolchain Integrity Requirements Quality Checklist

**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)  
**Feature Directory**: `specs/004-wcag-aaa-audit-pipeline`  
**Purpose**: Reviewer-owned requirements-quality checklist validating completeness, clarity, consistency, measurability, and platform constraints for the CI pipeline integration, runtime budget ($\le 10$s), preflight gates, and package pinning.  
**Created**: 2026-10-24  

> **Ownership & Lifecycle Note**: This checklist is a reviewer-owned requirements-quality review artifact ("Unit Tests for English"). An item marked `[x]` indicates that the reviewer has determined the requirement specification satisfies the criterion (clarity, completeness, consistency, measurability, coverage). An unchecked item `[ ]` indicates an open review item or specification gap. Generated items must NEVER be automatically checked by tools. `/speckit-implement` reads checklist state but does not modify markers.

---

## 1. Requirement Completeness

- [x] CHK001 - Is the exact package version `@axe-core/playwright@4.13.0` documented as a strict devDependency without semver range prefixes (`^` or `~`)? [Completeness, Spec §FR-001, AGENTS.md]
- [x] CHK002 - Are the target browser projects (`desktop-chromium` and `mobile-chromium`) explicitly documented as the exclusive execution targets for the Axe suite? [Completeness, Clarification Q1, Spec §SC-004]
- [x] CHK003 - Is the modular coexistence with pre-existing accessibility test files (`wcag-audit.spec.js`, `contrast.spec.js`, `theme-a11y.spec.js`, `reduced-motion.spec.js`) documented without test churn or deletions? [Completeness, Spec §FR-002, Clarification Q8, Research §5]
- [x] CHK004 - Are preflight integrity requirements defined to ensure `npm run preflight` passes 16 of 16 checks after dependency installation? [Completeness, Spec §SC-005, Quickstart §2]
- [x] CHK005 - Does the spec define whether the accessibility audit suite executes as part of `npm run test:e2e` and `npm run ci`? [Completeness, Spec §User Story 3, Quickstart §3]
- [x] CHK006 - Are requirements defined for web server initialization via `scripts/serve-e2e.mjs` supporting HTTP Range requests during local and CI execution? [Completeness, Spec §Assumptions, Contracts/test-suite-api.md §1, AGENTS.md] — *Resolvido: Documentado explicitamente em Assumptions e Contracts §1 que o webServer gerencia scripts/serve-e2e.mjs para suporte a RFC 7233.*

---

## 2. Requirement Clarity

- [x] CHK007 - Is the execution budget quantified as $\le 10\text{ seconds}$ specifically on the `desktop-chromium` project? [Clarity, Spec §SC-004, Plan §Performance Goals]
- [x] CHK008 - Is the skipping mechanism for non-Chromium projects (`desktop-firefox`, `desktop-webkit`, `mobile-webkit`) clearly defined as a declarative `test.skip()` rather than runtime aborts? [Clarity, Contracts/test-suite-api.md §3, Clarification Q1]
- [x] CHK009 - Is the headless browser requirement clarified regarding viewport dimensions ($1280 \times 720$ for desktop, $360 \times 800$ for mobile)? [Clarity, Contracts/test-suite-api.md §3, Spec §SC-003]
- [x] CHK010 - Is the dependency on Node.js $\ge 20.0.0$ and lockfile v3 consistency clearly explained in relation to the `@axe-core/playwright` version choice? [Clarity, Clarification Q2, Research §6]
- [x] CHK011 - Does the spec define whether test worker parallelism is restricted (`workers: 1`) to guarantee deterministic execution timing? [Clarity, Spec §FR-002, Plan §Technical Context, Contracts/test-suite-api.md §1] — *Resolvido: Suíte declara test.describe.configure({ retries: 0 }) (sem mode: 'serial') para isolamento determinístico em passagem única e anexação de marcos sem acoplamento serial ou cancelamento em cascata.*

---

## 3. Requirement Consistency

- [x] CHK012 - Does the $\le 10\text{s}$ execution limit in §SC-004 align with the orthogonal state traversal strategy in §FR-008 (avoiding the 20-scan Cartesian explosion)? [Consistency, Spec §SC-004, Spec §FR-008, Research §4]
- [x] CHK013 - Is the exact pinning requirement in §FR-001 consistent with the repository zero-semver-drift policy enforced in `scripts/preflight.mjs`? [Consistency, Spec §FR-001, AGENTS.md]
- [x] CHK014 - Is the dedicated test path `tests/e2e/accessibility.spec.js` consistent across `spec.md`, `plan.md`, `contracts/test-suite-api.md`, and `quickstart.md`? [Consistency, Spec §FR-002, Plan §Project Structure]
- [x] CHK015 - Do the performance goals align with Constitution Principle IV regarding pipeline budgets and zero bundle overhead in `dist/`? [Consistency, Constitution Principle IV, Plan §Constitution Check]

---

## 4. Acceptance Criteria & Measurability

- [x] CHK016 - Can the 16/16 preflight check requirement in §SC-005 be objectively verified through the process exit code of `npm run preflight`? [Measurability, Spec §SC-005]
- [x] CHK017 - Can the aggregate execution duration of `tests/e2e/accessibility.spec.js` be objectively measured and asserted to be $\le 10.0\text{s}$ in Playwright output? [Measurability, Spec §SC-004]
- [x] CHK018 - Can zero regression in pre-existing test suites be objectively proven by running the full `npm run test:e2e` suite without failures? [Measurability, Spec §FR-002, Spec §SC-006]
- [x] CHK019 - Is the requirement for zero additional runtime dependencies in production verifiable by inspecting `package.json` `dependencies`? [Measurability, Plan §Constitution Check]

---

## 5. Scenario & Platform Matrix Coverage

- [x] CHK020 - Are requirements specified for running the test suite in headless Linux environments without physical audio devices (PulseAudio null-sink requirement)? [Edge Case, Coverage, AGENTS.md, Quickstart §1]
- [x] CHK021 - Does the spec define behavior on platforms where WebKit system libraries are unavailable (e.g. Fedora host limitations noted in AGENTS.md)? [Edge Case, Coverage, Clarification Q1, AGENTS.md]
- [x] CHK022 - Are requirements defined for CI retry behavior (`retries: 2` in CI) to ensure flaky network calls do not inflate test execution budgets? [Edge Case, Coverage, Spec §FR-002, Contracts/test-suite-api.md §1] — *Resolvido: retries configurado explicitamente como 0 para testes de acessibilidade; SC-004 mede a passagem única determinística.*
- [x] CHK023 - Does the spec define how local execution against `localhost:8080` behaves if port 8080 is already occupied by another service? [Edge Case, Spec §Assumptions, AGENTS.md] — *Resolvido: Documentado que CI falha imediatamente se a porta estiver ocupada (reuseExistingServer=false) e ambiente local exige scripts/serve-e2e.mjs.*
- [x] CHK024 - Are requirements specified for Playwright trace and video generation policies during CI failure scenarios? [Coverage, Contracts/test-suite-api.md §6] — *Resolvido: Gancho test.afterEach captura snapshots DOM, screenshots e telemetria estruturada do player em caso de falha.*
- [x] CHK025 - Does the spec define pipeline behavior when Node.js is executed under version 22 vs version 20? [Coverage, Assumptions, Research §6]
