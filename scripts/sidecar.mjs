// Scaffold (T008) — implementation pending TDD gate (T013) and T011c (safe-reference).
// Contract: verificação de digest do sidecar (FR-008). Fail-fast on mismatch/invalid
// JSON/stale subject.name/orphan sidecar/unknown fields.

import { isSafeLocalReference } from '../src/scripts/safe-reference.js';

/**
 * Verify a sidecar against its master. Throws on any violation.
 * @param {string} masterPath - Absolute/relative path to the master file.
 * @param {string} [sidecarPath] - Override sidecar path (default: extension-swap).
 * @returns {void}
 * @throws {Error} On invalid JSON, schema violation, digest mismatch, stale subject.name, orphan sidecar, unsafe inputs[].uri.
 */
export function verifySidecar(masterPath, sidecarPath) {
  throw new Error('verifySidecar: not implemented (scaffold T008)');
}

/**
 * Find sidecars whose master does not exist (orphan sidecars).
 * @param {string} root - Repository root.
 * @returns {string[]} Paths of orphan sidecars.
 */
export function findOrphanSidecars(root) {
  throw new Error('findOrphanSidecars: not implemented (scaffold T008)');
}

/**
 * Validate a sidecar document against the schema (strict, no unknown fields).
 * @param {object} doc - Parsed sidecar JSON.
 * @returns {void}
 * @throws {Error} On schema violation.
 */
export function validateSidecarSchema(doc) {
  throw new Error('validateSidecarSchema: not implemented (scaffold T008)');
}

export { isSafeLocalReference };
EOF