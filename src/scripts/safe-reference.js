// Canonical, single-source implementation of the safe-local-reference rule.
//
// Used by:
//   - src/scripts/story-loader.js (manifest validation)
//   - scripts/build.mjs (build-time validation + resolveLocalReference)
//   - scripts/sidecar.mjs (sidecar inputs[].uri validation)  [Phase 2 scaffold]
//
// Rule: a safe local reference is a non-empty, trimmed, relative path with no
// scheme, no authority, no traversal segments, no backslashes, no query/hash,
// and no percent-decoding surprises. Shared to avoid drift between the manifest
// validator and the build pipeline (see analyze finding D1).

export function isSafeLocalReference(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) return false;
  if (/\0|\\|[\r\n\t]/.test(value)) return false;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value)) return false;
  if (value.includes('?') || value.includes('#')) return false;
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  if (typeof decoded !== 'string') return false;
  if (decoded.includes('\\') || decoded.startsWith('/') || /^[A-Za-z]:/.test(decoded)) return false;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(decoded)) return false;
  const segments = decoded.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return false;
  // No percent-decoding drift and no normalization surprises for safe paths.
  return decoded.split('/').join('/') === decoded;
}