// Scaffold (T011) — implementation pending TDD gate (T022).
// Contract: validação fail-closed de trailers/review para commits que tocam media-src/
// (FR-013e). Runs only in CI (fetch-depth: 0), never in npm run ci.

/**
 * Validate commit trailers and review block for commits touching media-src/.
 * @param {string} [range] - Git range (e.g. base..head). Defaults to CI env.
 * @returns {void}
 * @throws {Error} On missing trailers/review block or sidecar mismatch.
 */
export function validateCommitTrailers(range) {
  throw new Error('validateCommitTrailers: not implemented (scaffold T011)');
}

/**
 * Validate the Tier A review block of a sidecar document.
 * @param {object} sidecarDoc - Parsed sidecar JSON.
 * @returns {void}
 * @throws {Error} If review block is missing/invalid or decision !== 'approve'.
 */
export function validateReviewBlock(sidecarDoc) {
  throw new Error('validateReviewBlock: not implemented (scaffold T011)');
}
EOF