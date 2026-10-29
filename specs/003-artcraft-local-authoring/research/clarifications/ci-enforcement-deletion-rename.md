# Clarification: CI Enforcement — Master Deletion, Rename, and the Forward-Only Boundary

**Feature**: `specs/003-artcraft-local-authoring` (FR-013e CI step: fail-closed trailer + `review` gate over `media-src/`)
**Created**: 2026-10-17
**Status**: Research-backed clarification (resolves two open design questions: how the fail-closed gate handles commits that delete or rename a master under `media-src/`, and how the "forward-only" enforcement start boundary should be defined deterministically)

---

## 1. Direct Answer

### 1.1 Deleting a master under `media-src/`

**A deletion commit must carry the `Authored-With` and `Reviewed-By` trailers but must NOT be required to carry (or point to) a sidecar. The deletion must be atomic: master and sidecar are deleted in the same commit. If the master is deleted while its sidecar remains, the gate fails (orphan sidecar).**

Rationale: the two requirements in FR-013e are complementary but have different subjects.

- **Trailers certify the commit** (DCO-analog): every commit that touches `media-src/` — add, modify, delete, or rename — is a contribution and must carry `Authored-With` + `Reviewed-By`. Deletion is a contribution like any other.
- **The sidecar certifies the artifact** (provenance-analog): a sidecar is per-master-path, binding `subject.name` (basename) + `subject.digest.sha256` + the `review` block. A deleted master has no bytes, no basename in the tree, and no digest — there is no subject to attest. No provenance framework (SLSA, in-toto, sigstore) defines or requires a "deletion attestation"; verification obligations attach to artifacts that exist. Requiring a sidecar for a deleted master would make the gate unsatisfiable-by-design, which is a spec bug, not a security property.

Fail-closed completeness is preserved by the project's existing bidirectional invariant (orphan sidecar → throw, FR-008/FR-013): the only new rule the CI step needs is **"for every master path the commit deletes, the extension-swapped sidecar path must also be deleted (or already absent) in the same commit."** A commit that deletes the master but leaves the sidecar produces a tree the build already rejects (`orphan-sidecar`); the CI gate must reject it too, with the same error, so the failure happens at PR time rather than at build time.

### 1.2 Renaming a master under `media-src/`

**A rename is handled as a delete+add pair, detected with git rename detection (`git diff-tree -M --raw`). The new path is treated as an addition and must satisfy the full sidecar rule: a sidecar at the new path whose `subject.name` equals the new basename, whose digest matches the (possibly unchanged) master bytes, with `review.decision: approve`. The old path's sidecar must be deleted in the same commit. No special-case "rename grandfathering" is needed or recommended.**

Consequences:

- **Pure rename (content unchanged, `R100`):** the master digest is unchanged, so the review evidence transfers naturally — but the sidecar file itself must change (`subject.name` must equal the new basename; the staleness rule already throws otherwise), so the new sidecar is a new artifact that must itself carry an `approve` review block in the same commit. The author moves the sidecar and updates `subject.name` atomically with the master move.
- **Rename + content edit:** ordinary add rule on the new path (digest must be recomputed); the old sidecar must be deleted.
- **Master renamed, sidecar left behind:** the new path has no sidecar (fail) and the old sidecar is orphaned (fail). Correct on both counts: a renamed master without an updated sidecar has no valid provenance at its new location.
- **Rename detection threshold:** with the default 50% similarity threshold, a heavily rewritten file that is also moved may not pair as a rename and will appear as `D`+`A`. That is the safe classification — new content at the new path requires a fresh sidecar and review anyway.

The existing `subject.name` staleness check ("must equal master basename; stale → throw", FR-008) is exactly the mechanism that catches an un-updated sidecar after a rename. The gate only needs to apply the add-rule to the *destination* path; no rename-specific code path is required beyond reading git's `R` status.

### 1.3 Forward-only enforcement start boundary

**Do not define a fixed boundary constant (SHA, tag, or date). Define the checked range per CI event using merge-base semantics:**

- **Pull request:** enumerate `git rev-list <base-ref>..<head>` (equivalently `<git merge-base base head>..<head>`), i.e. the commits introduced by the PR.
- **Push:** enumerate `git rev-list <before-sha>..<after-sha>` from the push event payload.

This is deterministic given the refs at run time, requires no maintained constant, needs no exception list, and grandfathers all pre-enforcement history automatically: commits merged before the gate existed are never part of any future event's range, so they are never re-checked. "Forward-only" is a property of the range definition, not a stored watermark.

This is exactly how the dominant trailer/signing enforcement mechanisms work: the GitHub DCO app checks **all commits in the pull request** (excluding bots and merges) and blocks the PR until each is signed off — no history scan, no start boundary ([dcoapp/app README](https://raw.githubusercontent.com/dcoapp/app/master/README.md)); GitHub's "require signed commits" branch protection verifies commits **as they are pushed** ("Persistent commit signature verification applies to new commits pushed to GitHub", [GitHub docs](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)); gitsign verifies a given revision/range and binds it to expected identities in Rekor ([gitsign README](https://raw.githubusercontent.com/sigstore/gitsign/main/README.md)). None of them retroactively scan history from a fixed point.

Fixed-boundary alternatives are strictly worse (full tradeoff analysis in §3.2): a hard-coded SHA breaks when the boundary is rebased away and is bypassable by force-push; a tag adds movability/deletability risk and ceremony; a date is forgeable (`GIT_COMMITTER_DATE`) and non-reproducible across clones. The one complementary control that matters is **branch protection on the default branch (no force-push, no delete)**, so history cannot be rewound below the implicit boundary.

---

## 2. Practices and Recommendations from Primary Sources

### 2.1 SLSA: provenance is per-artifact, verified at consumption; deletion is not a provenance event

- **SLSA v1.0 Provenance** ([slsa.dev/spec/v1.0/provenance](https://slsa.dev/spec/v1.0/provenance)): provenance is "an attestation that a particular build platform produced a **set of software artifacts**" — the `subject` list. Artifacts are identified by digest (`ResourceDescriptor.digest`), and inputs by `resolvedDependencies`. Nothing in the model records or requires the disappearance of an artifact; the framework's threat model covers tampering with artifacts that exist, not the absence of artifacts from a repository.
- **SLSA v1.0 "Verifying artifacts"** ([slsa.dev/spec/v1.0/verifying-artifacts](https://slsa.dev/spec/v1.0/verifying-artifacts)): verification is performed **per artifact, against expectations** — "Verify that `statement.subject` matches the digest of the artifact in question." An artifact that has no bytes cannot be verified and creates no verification obligation. The spec also formalizes the separation this project already implements: expectations/policy are decided by the verifier ("Forming Expectations": trust-on-first-use / defined-by-producer / defined-in-source), while attestations are produced per artifact — i.e., **the policy gate and the artifact attestation are different layers**, which is precisely the split between `ci-trailers.mjs` (policy) and the sidecar (artifact attestation).
- Design consequence for this repo: a CI gate over `media-src/` should validate **the artifacts present in the commit's tree** (added/modified paths) and should not construct obligations for paths that no longer exist. Deletion handling belongs to the policy layer, and the only deletion-specific policy needed is referential integrity (no orphan sidecar), which the project already has.

### 2.2 in-toto: artifact transitions are constrained by rules; deletion is modeled as a transition constraint, not a deletion record

- **in-toto Specification v1.0.0** ([in-toto.io](https://in-toto.io), [full text](https://raw.githubusercontent.com/in-toto/docs/master/in-toto-spec.md)): steps record `materials`/`products`; artifact rules connect steps. The rule vocabulary includes **`DELETE` ("materials matched by the pattern must not appear as products of this step")** and **`MODIFY`** — i.e., in-toto constrains *transitions* of artifacts between steps. There is no "deletion attestation" artifact; a deleted artifact simply ceases to be a product of subsequent steps.
- **`REQUIRE`** ("the specified artifact must appear as a material or product of this step") is the direct ancestor of this project's sidecar rule: it enforces that a named artifact exists at a point in the chain. And the spec's fail-closed guidance — *"it is generally recommended that all rule lists include a `DISALLOW *` at the end"* so that artifacts cannot "sneak into the step or inspection undetected" — is the same principle as this project's orphan-sidecar rule and `findUnreferencedAssets === []`: **anything not explicitly accounted for fails the gate.**
- Verification binds attestations to artifacts by digest (in-toto validation model, [attestation spec](https://raw.githubusercontent.com/in-toto/attestation/main/docs/validation.md)): `matchedSubjects` = subjects whose digest equals `hash(artifact)`; no match → reject. Content-addressing again confirms: the unit of provenance is the *content* (digest), and the gate's job is to ensure every master's content in the tree is accompanied by a valid attestation.

### 2.3 DCO: per-commit certification over the PR range; every commit, including deletions, must be signed off

- **Developer Certificate of Origin 1.1** ([developercertificate.org](https://developercertificate.org/)): a per-commit certification that the contributor has the right to submit the work. It certifies *contributions*, not artifact states — a commit that deletes files is as much a contribution as one that adds them.
- **GitHub DCO app** ([dcoapp/app README](https://raw.githubusercontent.com/dcoapp/app/master/README.md)): "enforces the presence of valid DCO signoffs **on all commits** (excluding bots and merges). If a PR contains commits that lack a valid Signed-off-by line, Probot DCO blocks it until someone pushes a signed-off revision of the commit." Enforcement is scoped to **the commits of the pull request** — the range between the PR base and head — with **no fixed start boundary and no history scan**. Pre-existing commits already merged are never re-checked; grandfathering is automatic.
- The app also institutionalizes **remediation** (retroactive sign-off commits) — the accepted industry answer to "a commit slipped in without certification" is to fix the commit, not to add an exemption list. This supports the recommendation below: never accumulate per-commit exceptions in the gate's configuration.
- Design consequence: mirror this structure exactly — per-commit trailer certification for every commit in the event range that touches `media-src/` (all statuses: A/M/D/R), plus per-artifact sidecar verification for the added/modified masters.

### 2.4 Git commit signing / GitHub / Sigstore: enforcement is per-push, verification binds identity + content

- **`git verify-commit`** ([git-scm.com docs](https://git-scm.com/docs/git-verify-commit)): validates the GPG signature over named commit objects — the canonical primitive for "is this commit object authentic."
- **GitHub commit signature verification** ([docs.github.com](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)): repository admins "can enforce required commit signing on a branch to block all commits that are not signed and verified" — enforcement happens **on push**, and "Persistent commit signature verification applies **to new commits pushed** to GitHub." Again: per-event, never a history scan from a fixed boundary. GitHub also distinguishes signing from sign-off (DCO) — the same two-layer split as this project's trailers vs. sidecar.
- **Sigstore gitsign** ([gitsign README](https://raw.githubusercontent.com/sigstore/gitsign/main/README.md)): keyless commit signing; `gitsign verify <revision>` checks the signature **and** the Rekor transparency-log entry **and** expected certificate identity (`--certificate-identity`, `--certificate-issuer`). The documented limitation of plain `git verify-commit` — it "only verify[ies] cryptographic integrity and that the data exists on Rekor, but not **who** put the data there" — is exactly why this project's gate has two independent layers: the sidecar (+ digest) answers *what the bytes are*; the trailers + review block answers *who attested and under what policy*. Neither layer alone suffices.
- Sigstore's broader model (Rekor transparency log, Fulcio ephemeral certs) binds attestations to **artifact digests**, reinforcing that artifact provenance is content-keyed, not history-keyed.

### 2.5 Git rename detection: the deterministic mechanism for rename-aware diffs

- **`git diff --find-renames[=<n>]` / `-M`** ([git-scm.com/docs/git-diff](https://git-scm.com/docs/git-diff)): "Detect renames. If `<n>` is specified, it is a threshold on the similarity index… To limit detection to exact renames, use `-M100%`. The default similarity index is 50%."
- **Raw diff format** (same page): per-path status entries — `A` (create), `D` (delete), `M` (modify), `R<score>` (rename, score = % similarity), `C<score>` (copy) — e.g. `:100644 100644 abcd123 1234567 R86 file1 file3`. This gives the gate a deterministic, content-aware classification of every path a commit touches, which is what makes delete/rename handling precise instead of special-cased.
- For per-commit classification in `ci-trailers.mjs`, the plumbing command is `git diff-tree -M --raw --no-commit-id -r <sha> -- media-src/` (one line per path, `R`/`C` entries carry old and new path).

### 2.6 Empirical research: keep the gate simple, automated, and exception-free

- **Holtgrave et al., "Attributing Open-Source Contributions is Critical but Difficult"** (NDSS Symposium; DOI [10.1145/3756681.3756959](https://dl.acm.org/doi/10.1145/3756681.3756959); [paper page](https://www.ndss-symposium.org/ndss-paper/attributing-open-source-contributions-is-critical-but-difficult-a-systematic-analysis-of-github-practices-and-their-impact-on-software-supply-chain-security/)): across 50,328 critical OSS projects, contribution workflows can be abused in 85.9% of projects; **95.4% of users never signed a commit** and 72.1% of projects had no signed commit; only 2.0% of users signed every commit. Git identities are freely configurable, so trailers/sign-offs are **policy attestations, not authentication** — a caveat that applies to this project's gate as well (it enforces process, it does not cryptographically prove authorship; that would require commit signing, which the empirical data shows is rarely adopted and hard to operate).
- **Shittu, Sadik & Ruoti, "A Multi-Month Study of Git Commit Signing"** (arXiv [2608.29283](https://arxiv.org/html/2608.29283v1), 2026): even when signing was mandatory, participants identified on average only 4.77 of 13 anomalous commits; **27.3% found none**; nearly half held misconceptions about what signing guarantees. Conclusion: "making signing easier is not enough… [adoption requires] tooling that actively support[s] developers in interpreting verification states." Design consequence for this repo: the gate's value is the **automated, fail-closed check**, not human auditability of history — so keep its rules simple, deterministic, and free of accumulated exemptions (no grandfather lists beyond what the range definition grants automatically).
- Measurement context: Sharma et al. found ~10% of commits verified in 60 top repositories; Mockus found signatures in 17.59% of 5.87 billion commits (both cited in the above) — trailer-based gates (DCO-style) are the widely adopted mechanism precisely because key-based signing is not.

---

## 3. Options and Tradeoffs

### 3.1 Handling deletion and rename in the gate

| Option | Description | Verdict |
|---|---|---|
| **A. Diff-aware classification (recommended)** | For each commit in range, run `git diff-tree -M --raw` over `media-src/`; classify every touched path as A/M/D/R. Trailers required for any commit touching `media-src/` (all statuses). Sidecar required for A/M paths and R-deletions' destinations (validated against the tree at that commit: digest, `subject.name` = new basename, `review.decision=approve`). For D paths and R-sources (masters), require the extension-swapped sidecar to also be deleted in the same commit, else fail (`orphan-sidecar`). | **Recommended.** Satisfiable in every case (deletion is always possible; rename is always possible), deterministic, no exceptions, consistent with the build-time invariants, and mirrors DCO (per-commit certification of every status) + in-toto (REQUIRE for what exists, integrity for what was removed). |
| B. Path-existence rule (current literal reading of FR-013e) | "For each commit touching `media-src/`, require a sidecar for the master." | **Rejected.** Unsatisfiable for deletions (no master → no sidecar possible) and ambiguous for renames (old sidecar orphaned by the `subject.name` staleness rule). A fail-closed gate must not contain cases that can never pass. |
| C. Special-case exemption list | Allow deletions/renames via a maintained exception list in the repo (e.g., an `exemptions.json`). | **Rejected.** Empirical evidence (§2.6) shows exception lists and manual verification states are where security degrades; DCO practice fixes non-compliant commits via remediation instead. Exceptions also re-introduce the very ambiguity the fail-closed gate exists to remove. |

### 3.2 Defining the forward-only start boundary

| Option | Deterministic? | Robust to rebase? | Bypassable? | Maintenance | Verdict |
|---|---|---|---|---|---|
| **A. Per-event range via merge-base** — PR: `rev-list <base>..<head>`; push: `rev-list <before>..<after>` | Yes — fully determined by refs at run time | Yes — rebased commits are new SHAs and are checked as forward commits | Only by force-pushing the base branch below compliant history; mitigated by default-branch protection | None | **Recommended.** Matches DCO / GitHub branch protection / gitsign practice; grandfathering is automatic; no constant to maintain or document. |
| B. Hard-coded SHA ("enforce after `<sha>`") | Yes, until the boundary is rewritten | No — if the boundary SHA is rebased away or the base is force-pushed, `rev-list <sha>..HEAD` errors or silently excludes | Yes — force-push main below the boundary reintroduces non-compliant commits with no check | Boundary must be tracked; force-pushes break ancestry | Rejected. |
| C. Tag (e.g., `enforcement-start`) | Yes, if the tag is protected | Same ancestry fragility as SHA | Tags can be moved/deleted unless protected; otherwise same as B | Tag lifecycle + protection ceremony | Rejected — strictly more moving parts than B with no added determinism. |
| D. Date ("commits after 2026-10-17") | No — committer date is forgeable (`GIT_COMMITTER_DATE`) and clone-independent only by convention | n/a | Yes — trivially | n/a | Rejected by every practice; no standard uses dates for enforcement boundaries. |

**Complementary control (recommended regardless of option):** enable GitHub branch protection on the default branch (no force-push, no deletion). This is the standard defense that makes per-event range enforcement sound, and it protects the history the gate relies on.

---

## 4. Recommendation (concrete contract for `scripts/ci-trailers.mjs` and `ci.yml`)

1. **Range resolution (replaces any fixed boundary):**
   - PR event: `base = <PR base ref>`, `head = <head SHA>`; commits = `git rev-list <base>..<head>`, skipping commits with more than one parent (merge commits introduce no content; DCO precedent).
   - Push event: commits = `git rev-list <before-sha>..<after-sha>`.
   - `fetch-depth: 0` (already mandated by FR-013e) is what makes the merge-base/range computation possible.
2. **Per-commit path classification:** for each commit, `git diff-tree -M --raw --no-commit-id -r <sha> -- media-src/` → entries `A`/`M`/`D`/`R<score>` (and `C<score>`, ignored or rejected as policy). If the commit touches nothing under `media-src/`, it is out of scope (gate passes for it).
3. **Trailer rule (all touched commits, all statuses):** commit message must contain `Authored-With:` and `Reviewed-By:` trailers. Missing either → fail. (Trailers certify the commit; they are required even when the commit only deletes.)
4. **Sidecar rule (A/M paths, and R-destination paths, that are masters):** the commit's tree must contain the extension-swapped sidecar; validate it with the existing `sidecar.mjs` rules — recomputed SHA-256 matches, `subject.name` equals the new basename, `review.decision === "approve"`. Missing/invalid/rejected → fail.
5. **Deletion rule (D paths, and R-source paths, that are masters):** the extension-swapped sidecar path must also appear as deleted in the same commit diff. If the master is deleted while the sidecar remains → fail with `orphan-sidecar` (same error as the build-time gate; the PR fails before the build ever sees the tree).
6. **Orphan rule (unchanged):** any `.json` sidecar in `media-src/` without a corresponding master at the event's head tree → fail (`orphan-sidecar`). This catches master-deleted/sidecar-kept even when the deletion and the check are separated across commits.
7. **No exception lists, no fixed boundary constant.** Non-compliant commits are remediated (new commit with trailers/sidecar), following the DCO app's remediation model. Pre-enforcement history (the single squash touching `media-src/` today) stays grandfathered automatically because it is never in any future event's range; optionally perform a one-time manual audit of it outside CI.
8. **Workflow note for `docs/authoring.md`:** document that renaming a master requires moving **and** updating its sidecar (`subject.name`) in the same commit, and that deleting a master requires deleting its sidecar in the same commit — both are enforced by CI, not just by convention.

---

## 5. Sources

- SLSA v1.0 — Provenance: https://slsa.dev/spec/v1.0/provenance
- SLSA v1.0 — Verifying artifacts: https://slsa.dev/spec/v1.0/verifying-artifacts
- in-toto Specification v1.0.0 (in-toto.io): https://in-toto.io · full text: https://raw.githubusercontent.com/in-toto/docs/master/in-toto-spec.md
- in-toto Attestation Framework — Validation model: https://raw.githubusercontent.com/in-toto/attestation/main/docs/validation.md
- Developer Certificate of Origin 1.1: https://developercertificate.org/
- GitHub DCO app (enforcement model): https://raw.githubusercontent.com/dcoapp/app/master/README.md
- git-verify-commit: https://git-scm.com/docs/git-verify-commit
- GitHub — About commit signature verification: https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
- Sigstore gitsign (keyless commit signing/verification): https://raw.githubusercontent.com/sigstore/gitsign/main/README.md
- git-diff — rename detection (`-M`/`--find-renames`) and raw format (`R`/`C`/`A`/`D`): https://git-scm.com/docs/git-diff
- Holtgrave et al., "Attributing Open-Source Contributions is Critical but Difficult" (NDSS Symposium; DOI 10.1145/3756681.3756959): https://dl.acm.org/doi/10.1145/3756681.3756959 · https://www.ndss-symposium.org/ndss-paper/attributing-open-source-contributions-is-critical-but-difficult-a-systematic-analysis-of-github-practices-and-their-impact-on-software-supply-chain-security/
- Shittu, Sadik & Ruoti, "A Multi-Month Study of Git Commit Signing" (arXiv:2608.29283, 2026): https://arxiv.org/html/2608.29283v1
