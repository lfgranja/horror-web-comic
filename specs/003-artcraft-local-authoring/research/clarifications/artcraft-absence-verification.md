# Clarification: How to verify "no ArtCraft binary in the repo/CI" (SC-005)

**Feature**: `specs/003-artcraft-local-authoring`
**Question**: SC-005 requires "Nenhum binário ArtCraft no repositório/CI (verificável por inspeção dos arquivos versionados e pelo gate de ambiente)". No FR, task, or CI step defines an ArtCraft-absence check. What is the recommended way to verify that no ArtCraft binary enters the repo/CI? Is a *presence*-check sufficient, or is an explicit *absence/allowlist* check needed? What do supply-chain / SLSA / artifact-provenance practices recommend for "no unexpected tools/binaries in the artifact"?

**Status**: answered (research-backed). Recommendation: **a presence-check is not sufficient — it is a category error.** Adopt a **fail-closed artifact-allowlist gate over `git ls-files`** as the primary, automated control, plus a **CI-scoped environment assertion** that the ArtCraft suite is absent. Do **not** rely on a name denylist, and do **not** enforce absence in local preflight in a way that fails a developer who legitimately has the suite installed.

---

## 0. What is actually in the repo

| Fact | Evidence |
|:---|:---|
| SC-005 names two mechanisms — "inspeção dos arquivos versionados" **and** "gate de ambiente" | `spec.md:188` |
| FR-004 forbids adding an ArtCraft binary to the repo, `package.json`, or CI; `npm run ci` must run without the suite installed | `spec.md:169` |
| The verification method was already sketched as **`git ls-files` + preflight** | `checklists/pipeline-constitution.md:79` (CHK039) |
| Today the only "checks" are **one-shot manual audits**, not a gate | `tasks.md:182` (T031), `tasks.md:217` (T039a), `tasks.md:399` (T086, marked *missing*) |
| `scripts/preflight.mjs` is a **presence** gate for *required* tools (node, ffmpeg, browsers…); it has no absence check and never reads `git ls-files` | `preflight.mjs:9-37`, `347-377` |
| No ArtCraft reference exists in `scripts/`, `.github/`, or `package.json` today; the only occurrences are prose in `spec.md`, `research.md`, and `contracts/sidecar.schema.json` | repo grep (confirmed) |
| The repo already has a **fail-closed allowlist** over the publishable tree: anything present in `assets/` that the manifest does not reference fails | `scripts/build.mjs:479-483` (`findUnreferencedAssets`) |
| The build also rejects a whole **format class** in a tree (`.wav` under `assets/`) | `AGENTS.md` ("Do Not" / File Layout); `scripts/build.mjs:473` |
| CI is a versioned file with a fixed step list; preflight rejects masked failures in `scripts.ci` | `.github/workflows/ci.yml`; `preflight.mjs:67-76` |

The repo's tracked extensions today are: `md js mjs json yml sh css html toml svg jpg jpeg webp avif wav aac opus mp3` plus extensionless files (`.gitignore`, `LICENSE`, `AGENTS.md`, `README.md`, …). **Binary formats are legitimate here** (masters are SVG/PNG/JPG/WAV; delivery is AVIF/WebP/JPEG/AAC/Opus), so "no binary" cannot mean "no binary content" — it must mean **no executable program and no unexpected file role**.

---

## 1. Direct answer

**A presence-check is not sufficient, and a bare "assert ArtCraft is absent" check is not sufficient either.** Two complementary, fail-closed controls are needed:

1. **Primary — a fail-closed artifact-allowlist gate over the versioned files (`git ls-files`).** Every tracked path must resolve to an expected *role* (source, docs, config, CI, a manifest-referenced master, a manifest-referenced delivery asset, a sidecar). Anything that does not — in particular any tracked file that is an **executable program** (ELF/PE/Mach-O) or carries the **executable bit** outside an allowlisted script — fails. `package.json` dependencies must equal a frozen allowlist, and CI `run:`/`uses:` + package scripts must not reference ArtCraft. This is what SC-005's "inspeção dos arquivos versionados" clause actually demands, made continuous and machine-checkable.

2. **Secondary — a CI-scoped environment assertion** that no ArtCraft executable resolves on `PATH` and no ArtCraft package is installed. This is SC-005's "gate de ambiente". It is cheap and it directly evidences FR-004 ("`npm run ci` must run without the suite installed"). It must **not** be the only control, and it must not fail a developer who has the suite installed locally (authoring is local-only).

**Why a presence-check alone fails:**

- **Category error.** "A binary is in the repository" is a property of the *source revision*; "tool X is installed" is a property of the *host environment*. A presence probe queries `PATH`/`node_modules` and never reads `git ls-files`. A committed `vectorcraft` binary is not "installed", so `command -v vectorcraft` still fails — the check **passes while SC-005 is violated**.
- **A denylist of names is incomplete.** Enumerating ArtCraft app names misses a renamed, vendored, base64-embedded, or differently-named binary. Standards posture is fail-closed allowlisting and a complete inventory, not a denylist of known-bad names (§2).
- **Human inspection decays.** SC-005's "verificável por inspeção" is satisfiable once, at review time. The one-shot audits T031/T039a/T086 do not gate anything and are already stale (T086 is *missing*). SLSA explicitly prioritises automated, mistake-resistant mitigations (§2.1).
- **Local enforcement contradicts the spec.** Preflight is the *environment* gate, but ArtCraft is local-only. Making preflight fail when the suite is *present* would break the maintainer's own authoring machine and contradict `spec.md:46` ("no minimum/recommended version is enforced in CI or preflight") and FR-004.

The correct reading of SC-005 is therefore: **two different properties, two different checks** — repo contents (allowlist, in the versioned-files gate) and environment (absence assertion, in CI).

---

## 2. What the primary sources say

### 2.1 SLSA: unexpected ⇒ reject; expectations must be explicit; prefer automation

- **SLSA v1.2, Build: Verifying artifacts** — "Ensuring that the values for `buildType` and `externalParameters` in the provenance match the expected values. The package ecosystem MAY allow an approved list of `externalParameters` to be ignored during verification. **Any unrecognized `externalParameters` SHOULD cause verification to fail.**" And: "Verification tools SHOULD **reject unrecognized fields** … to err on the side of caution." ([slsa.dev/spec/v1.2/verifying-artifacts](https://slsa.dev/spec/v1.2/verifying-artifacts)). This is the canonical statement of the **fail-closed allowlist** posture: a declared, expected set; anything outside it fails.
- **SLSA v1.2, Build: Requirements** — the producer "MUST build their artifact in a consistent manner **such that verifiers can form expectations about the build process**"; at Build L3, "External parameters MUST be **fully enumerated**." ([slsa.dev/spec/v1.2/build-requirements](https://slsa.dev/spec/v1.2/build-requirements)). A complete, explicit expectation set is the *precondition* for verification — it is exactly what an artifact allowlist encodes.
- **SLSA v1.2, Threats & mitigations** — threat **(D) External build parameters** ("Build from unofficial build steps / unofficial parameters") is mitigated by comparing against expectations. Under **dependency threats**: "**Any artifact that is present in the build environment and has the ability to influence the output is considered a build dependency**" ([slsa.dev/spec/v1.2/threats](https://slsa.dev/spec/v1.2/threats)). An ArtCraft binary in the environment is a build dependency; in the repo it is a supply-chain artifact.
- **SLSA v1.2, Guiding principles** — "**Trust platforms, verify artifacts** … Verifying that an artifact is produced by a trusted platform … is easy to automate." And "**Prefer attestations over inferences**: … do not infer security properties from a platform's configurations. … these configurations are almost impossible to get right and keep right." ([slsa.dev/spec/v1.2/principles](https://slsa.dev/spec/v1.2/principles)). "CI runs on a clean runner" is an *inference*; SC-005 needs an *assertion*.
- **SLSA v1.2, Threats (intro)** — "SLSA prioritizes mitigations that can be broadly adopted in an **automated fashion**, minimizing the chance of mistakes." ([same](https://slsa.dev/spec/v1.2/threats)). Human inspection is not that.
- **SLSA v1.2, Source track** — Source L1 is "version controlled"; the SCS "MUST provide tooling to display Changes … in a human readable form … for all plain-text changes and SHOULD provide mechanisms to provide human understandable interpretations of **non-plain-text changes (e.g. render images, verify and display provenance for binaries)**" ([slsa.dev/spec/v1.2/source-requirements](https://slsa.dev/spec/v1.2/source-requirements)). Binaries are a first-class source-layer review concern, not a footnote.

**Proportionality note.** This repo is not targeting SLSA Build L3, and the spec already concluded ArtCraft authoring is local and "at most SLSA Build L1-analogous" (`spec.md:46`). The recommendation adopts SLSA's **posture** — fail-closed, explicit expectations, automated verification, assert-don't-infer — without adopting its platform requirements.

### 2.2 NIST SSDF: inventory and integrity across *all* forms of code

- **NIST SP 800-218 (SSDF) v1.1** — **PS.1** "Protect all forms of code from unauthorized access and tampering" (source, build scripts, IaC, **CI/CD configurations**); **PS.2** "Provide a mechanism for verifying software release integrity"; **PW.4.4** "Verify that acquired commercial, open-source, and all other third-party software components **comply with the requirements, as defined by the organization, throughout their life cycles**"; **PO.3** toolchain. ([nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf)). PS.1 explicitly extends the protected surface to CI configuration — i.e. "no ArtCraft in `.github/workflows/`" is in scope, not just `media-src/`.

### 2.3 SBOM / inventory: "complete and accurate", machine-readable, automated

- **NTIA, *The Minimum Elements For a SBOM* (2021)** — an SBOM is "a formal record containing the details and supply chain relationships of various components"; the inventory must be machine-processable and support automation. ([ntia.gov/report/2021/minimum-elements-software-bill-materials-sbom](https://www.ntia.gov/report/2021/minimum-elements-software-bill-materials-sbom), [PDF](https://www.ntia.gov/sites/default/files/publications/sbom_minimum_elements_report_0.pdf)). Superseded in 2026 by CISA's *2026 Minimum Elements for a SBOM*, which adds component hash and signature fields. ([cisa.gov/resources-tools/resources/2026-minimum-elements-software-bill-materials-sbom](https://www.cisa.gov/resources-tools/resources/2026-minimum-elements-software-bill-materials-sbom)).
- **OWASP SCVS** — V1.1 "All direct and transitive components and their versions are **known at completion of a build**"; V1.2 "Package managers are used to manage **all third-party binary components**"; V2.9 "SBOM contains a **complete and accurate inventory** of all components the SBOM describes". ([scvs.owasp.org/scvs/v1-inventory](https://scvs.owasp.org/scvs/v1-inventory), [V2](https://scvs.owasp.org/scvs/v2-software-bill-of-materials)). An unmanaged binary that appears in the tree is precisely a component that is *not* in the inventory.
- **OpenSSF S2C2F** (Microsoft → OpenSSF) — Practice 1 "Control all artifact inputs", Practice 2 "**Inventory It**", Practice 3 "Scan all inputs to trust them … for vulnerabilities, malware, malicious or anomalous behavior, **extraneous code**". ([github.com/ossf/s2c2f/…/framework.md](https://github.com/ossf/s2c2f/blob/main/specification/framework.md)). "Extraneous code" is the direct analogue of an unexpected binary.
- **SBOM drift detection** — generating the inventory repeatedly along the pipeline "detect[s] any unexpected changes (drift) in your supply chain — whether accidental or malicious" ([anchore.com/sbom/…](https://anchore.com/sbom/how-to-tackle-sbom-sprawl-and-secure-your-supply-chain)). The allowlist gate is that drift check for this repo.

### 2.4 Hermetic builds: only *declared* inputs exist

- **Bazel, Hermeticity** — "hermetic builds are **insensitive to libraries and other software installed on the local or remote host machine**" ([bazel.build/basics/hermeticity](https://bazel.build/basics/hermeticity)). A hermetic build's file view is exactly its declared inputs.
- **Bazel sandboxing** — `--sandbox_default_allow_network=false` "blocks the classic 'postinstall script downloads a tarball' supply chain pattern" ([safeguard.sh](https://safeguard.sh/resources/blog/bazel-hermetic-builds-supply-chain-benefits)). The same source states the honest limit: "**Hermeticity is orthogonal to trust.** … You still need … human review of what gets into `MODULE.bazel`." So hermeticity/allowlisting *bounds the surface*; it does not replace review of what is declared.
- **Konflux** — hermetic builds are "restricted to building only from dependencies listed in your Git repository … you must **declare all required resources and dependencies in your build definition**" ([konflux-ci.dev/docs/building/hermetic-builds](https://konflux-ci.dev/docs/building/hermetic-builds)). Declared-in-git is the invariant an allowlist enforces.

### 2.5 Reproducible builds: rebuild + diff exposes anything unexpected

- **Lamb & Zacchiroli, "Reproducible Builds: Increasing the Integrity of Software Supply Chains", IEEE Software (2021/2022), DOI [10.1109/MS.2021.3073045](https://doi.org/10.1109/MS.2021.3073045), preprint [arXiv:2104.06020](https://arxiv.org/abs/2104.06020)** — bit-for-bit reproducibility lets independent parties verify that a released binary corresponds to the claimed source; a deviation is evidence of tampering. The reproducibility community's framing is that this makes silent tampering (including injected binaries) *hard to hide*.
- **Debian 14 ("Forky")** will **block** packages that fail reproducibility checks ([linuxsecurity.com](https://linuxsecurity.com/features/debian-reproducible-builds)) — a primary-ecosystem precedent for a *hard gate* rather than a report.

### 2.6 The attack this defends against (why it is worth a gate at all)

- **Ohm, Plate, Sykosch, Meier, "Backstabber's Knife Collection: A Review of Open Source Software Supply Chain Attacks", DIMVA 2020, [arXiv:2005.09535](https://arxiv.org/abs/2005.09535)** — a dataset of 174 real malicious packages and attack trees for injecting malicious code into the dependency tree.
- **Ladisa, Plate, Martinez, Barais, "Taxonomy of Attacks on Open-Source Software Supply Chains", IEEE S&P 2023, pp. 1509–1526, DOI [10.1109/SP46215.2023.00010](https://doi.org/10.1109/SP46215.2023.00010), [arXiv:2204.04008](https://arxiv.org/abs/2204.04008)** — 107 attack vectors mapped to 33 mitigating safeguards, spanning "all supply chain stages from code contributions to package distribution". Both works establish that the *artifact/component set* is the unit of defence, which is why an inventory/allowlist check is the standard-shaped control.

### 2.7 Allowlist vs denylist, and fail-closed

- **Denylist failure mode** — "A denylist **misses new or unexpected** … paths", while "An allowlist **forces explicit approval before** a flow exists", which "reduces the chance that an **unexpected** … becomes part of the … trust boundary" ([nhimg.org](https://nhimg.org/faq/why-does-an-allowlist-model-reduce-risk-more-effectively-than-a-denylist-in-mode)). The same source names the allowlist's cost: it must be kept current, or legitimate things fail closed — which is why the allowlist here should be **by file role/type**, a small and stable set, not a per-file enumeration.
- **Fail-closed** — on error, deny rather than allow ([authzed.com/blog/fail-open](https://authzed.com/blog/fail-open)). An unknown tracked file must fail the gate, not warn.

### 2.8 CI-level allowlisting precedent

- **GitHub Actions, secure use** — pin every action to a full commit SHA; "Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release." ([docs.github.com/en/actions/reference/security/secure-use](https://docs.github.com/en/actions/reference/security/secure-use)).
- **GitHub Actions allowed-actions policy** — org/repo-level **allowlisting** of Marketplace actions, with optional SHA-pinning enforcement that "will check for a full commit SHA, and any workflow that attempts to use an action that isn't pinned will fail" ([github.blog changelog, 2025-08-15](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions)). This is the CI analogue of "only declared inputs may execute".
- **`pre-commit`** ships `check-added-large-files` and executable/shebang checks — the tooling precedent for preventing binaries at the source ([github.com/pre-commit/pre-commit-hooks](https://github.com/pre-commit/pre-commit-hooks)). Local hooks are bypassable (`--no-verify`), so they are prevention, not evidence.

---

## 3. Options, tradeoffs, and recommendation

| # | Option | Pros | Cons | Verdict |
|:--|:---|:---|:---|:---|
| **A** | **Presence-check only** — assert ArtCraft is absent from `PATH`/`node_modules` ("gate de ambiente") | Trivial; directly evidences FR-004 on a clean runner | **Category error**: never reads the versioned files, so a committed binary passes; environment-scoped; can't be a hard *local* gate without breaking the maintainer's machine (contradicts FR-004 / `spec.md:46`) | **Necessary but not sufficient.** Keep as a **CI-scoped** assertion. |
| **B** | **Name denylist** — grep tracked files for `artcraft\|vectorcraft\|photocraft\|…` | Trivial; catches naive additions | **False positives**: the names legitimately appear in `docs/authoring.md`, sidecars, trailers, `spec.md`, and `contracts/sidecar.schema.json` (confirmed). **False negatives**: renamed/vendored/embedded binaries, names not on the list. Denylist incompleteness (§2.7) | **Reject as the primary control.** At most a scoped secondary signal over *executable contexts*. |
| **C** | **Fail-closed artifact allowlist over `git ls-files`** + declared-toolchain check | Covers SC-005's "arquivos versionados" clause directly; deterministic, offline, reproducible; catches renamed/vendored binaries (role + executable-magic, not name); reuses the repo's own `findUnreferencedAssets === []` and WAV-rejection patterns; no local-environment coupling | Needs a small allowlist kept current (bounded here: ~20 extensions + extensionless set); must be phrased as "no *executable*/unexpected *role*", since legitimate binary media exists | **Recommended — primary control.** |
| **D** | **Structural prevention** — `.gitignore`, pre-commit hook, branch protection, CODEOWNERS, GitHub allowed-actions policy | Stops the artifact *before* it lands; cheapest catch point; complements C | Local hooks are bypassable and unshared; org policies live outside the repo; can't be the sole evidence for SC-005 | **Recommended as defense-in-depth**, not as the verifiable gate. |

**Recommended combination: C (primary, automated, fail-closed, in the versioned-files gate) + A (CI-scoped absence assertion) + D (prevention).** Reject B as a gate.

### What the check must actually assert (C)

1. **Role/type allowlist over tracked files.** Enumerate `git ls-files`; every path must map to a known role: source (`*.js/mjs`), styles (`*.css`), markup (`*.html`), docs (`*.md`), config (`*.json/yml/toml`, `package.json`, `lighthouserc.json`, `budget.json`), CI (`.github/**`), scripts (`scripts/**`, `.specify/**/*.sh`), masters (`media-src/**` with extensions `svg/png/jpg/jpeg/wav` + sidecar `json`), delivery assets (`assets/**` with `avif/webp/jpg/aac/opus/mp3`), and the extensionless set (`.gitignore`, `LICENSE`, `AGENTS.md`, `README.md`, `.editorconfig`). Anything else → **fail**.
2. **No executable program.** Reject any tracked file whose content matches an executable magic (`\x7fELF`, `MZ`, Mach-O `\xcf\xfa\xed\xfe` / `\xfe\xed\xfa\xce`), and any tracked file with the executable bit set outside the allowlisted scripts. This is the property "binário" actually denotes — *not* binary media.
3. **Declared toolchain unchanged.** `package.json` `dependencies`/`devDependencies` must equal a frozen allowlist (the existing `pinned-dependencies` + `lockfile` checks already constrain *versions*; this constrains the *set*).
4. **No ArtCraft in executable contexts.** CI `run:`/`uses:` and `package.json` `scripts` must not invoke any ArtCraft app. (Scoped to executable contexts — prose in `docs/` is legitimate.)
5. **Environment (A), CI-scoped.** Assert no ArtCraft executable resolves on `PATH` and no ArtCraft package is in `node_modules`.

### Where it should live

- SC-005 names "o gate de ambiente", and CHK039 already says **`git ls-files` + preflight** — so the natural home is a new check id in `scripts/preflight.mjs` (e.g. `artcraft-absence`), which runs in both `npm run ci` and the CI workflow, offline. Unlike the trailers/review gate (FR-013(e), CI-only because it needs `fetch-depth: 0` history), this check needs **no git history** — only the working tree — so it does not have to be CI-only.
- **Implementation caveat:** `git ls-files` requires a git work tree. Preflight must therefore either (a) fall back to a filesystem walk that honours `.gitignore` when no work tree is present (tarball/export), or (b) scope the git-based variant to CI. This matters because FR-013 keeps "execuções locais/offline/tarball" working. Prefer (a): a tree walk excluding ignored paths is the same invariant and needs no git.
- **Prevention (D):** add the executable/magic rejection to a pre-commit hook and/or `.gitignore` patterns, but treat that as best-effort — the preflight check is the evidence.

### Consequence for the spec/tasks

T031, T039a, and T086 should not remain one-shot manual audits. Replace them with a single deterministic gate (the preflight check above) plus its unit test, so SC-005 becomes continuously verifiable rather than a review-time observation. This is the SLSA "automated, mistake-resistant mitigation" posture applied proportionately (§2.1), not an SLSA L3 commitment.

---

## 4. References

**Primary standards / frameworks**

- SLSA v1.2 — Build: Verifying artifacts — https://slsa.dev/spec/v1.2/verifying-artifacts
- SLSA v1.2 — Build: Requirements for producing artifacts — https://slsa.dev/spec/v1.2/build-requirements
- SLSA v1.2 — Threats & mitigations — https://slsa.dev/spec/v1.2/threats
- SLSA v1.2 — Guiding principles — https://slsa.dev/spec/v1.2/principles
- SLSA v1.2 — Source: Requirements for producing source — https://slsa.dev/spec/v1.2/source-requirements
- NIST SP 800-218, *Secure Software Development Framework (SSDF) v1.1* — https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf
- NTIA, *The Minimum Elements For a Software Bill of Materials (SBOM)* (2021) — https://www.ntia.gov/report/2021/minimum-elements-software-bill-materials-sbom · https://www.ntia.gov/sites/default/files/publications/sbom_minimum_elements_report_0.pdf
- CISA et al., *2026 Minimum Elements for a SBOM* — https://www.cisa.gov/resources-tools/resources/2026-minimum-elements-software-bill-materials-sbom
- OWASP SCVS — V1 Inventory — https://scvs.owasp.org/scvs/v1-inventory · V2 SBOM — https://scvs.owasp.org/scvs/v2-software-bill-of-materials
- OpenSSF S2C2F — https://github.com/ossf/s2c2f/blob/main/specification/framework.md
- Bazel — Hermeticity — https://bazel.build/basics/hermeticity
- Konflux — Enabling hermetic builds — https://konflux-ci.dev/docs/building/hermetic-builds
- GitHub — Secure use reference (Actions) — https://docs.github.com/en/actions/reference/security/secure-use
- GitHub changelog — Actions policy: blocking and SHA pinning — https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions
- pre-commit hooks (`check-added-large-files`) — https://github.com/pre-commit/pre-commit-hooks

**Scientific / peer-reviewed**

- Ohm, Plate, Sykosch, Meier. "Backstabber's Knife Collection: A Review of Open Source Software Supply Chain Attacks." DIMVA 2020. arXiv:2005.09535 — https://arxiv.org/abs/2005.09535
- Ladisa, Plate, Martinez, Barais. "Taxonomy of Attacks on Open-Source Software Supply Chains." IEEE S&P 2023, pp. 1509–1526. DOI 10.1109/SP46215.2023.00010; arXiv:2204.04008 — https://arxiv.org/abs/2204.04008
- Lamb, Zacchiroli. "Reproducible Builds: Increasing the Integrity of Software Supply Chains." IEEE Software (2021/2022). DOI 10.1109/MS.2021.3073045; arXiv:2104.06020 — https://arxiv.org/abs/2104.06020

**Secondary / practice**

- Allowlist vs denylist and unexpected paths — https://nhimg.org/faq/why-does-an-allowlist-model-reduce-risk-more-effectively-than-a-denylist-in-mode
- Fail-open vs fail-closed — https://authzed.com/blog/fail-open
- Bazel hermetic builds & supply-chain sandboxing — https://safeguard.sh/resources/blog/bazel-hermetic-builds-supply-chain-benefits
- SBOM drift detection — https://anchore.com/sbom/how-to-tackle-sbom-sprawl-and-secure-your-supply-chain
- Debian 14 reproducibility gate — https://linuxsecurity.com/features/debian-reproducible-builds

**In-repo evidence**

- `spec.md:188` (SC-005), `spec.md:169` (FR-004), `spec.md:46` (version policy)
- `checklists/pipeline-constitution.md:79` (CHK039 — `git ls-files` + preflight)
- `tasks.md:182` (T031), `tasks.md:217` (T039a), `tasks.md:399` (T086)
- `scripts/preflight.mjs:9-37,347-377` (presence-only checks)
- `scripts/build.mjs:479-483` (`findUnreferencedAssets` — fail-closed allowlist precedent)
- `.github/workflows/ci.yml` (versioned CI step list)
