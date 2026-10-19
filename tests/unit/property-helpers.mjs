// Scaffold (T011a) — property-based test helper (deterministic PRNG, no new deps).
// To be refined after T011b finalizes the SVG allow-list vocabulary.

/**
 * Create a deterministic PRNG from a numeric seed.
 * @param {number} seed
 * @returns {{next:()=>number,int: (min:number,max:number)=>number,pick:(arr:any[])=>any}}
 */
export function createPrng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)]
  };
}

/**
 * Generate a random SVG string from a grammar (placeholder until T011b).
 * @param {ReturnType<typeof createPrng>} prng
 * @returns {string}
 */
export function randomSvgGrammar(prng) {
  return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
}

/**
 * Generate a random sidecar document (placeholder until T011b).
 * @param {ReturnType<typeof createPrng>} prng
 * @returns {object}
 */
export function randomSidecarDoc(prng) {
  return { schemaVersion: '1.0', subject: { name: 'frame-01.svg', digest: { sha256: '0'.repeat(64) } }, provenance: { tool: 'vectorcraft', toolVersion: '0.12.0', timestamp: '2026-10-17T00:00:00Z', author: 'maintainer' } };
}

/**
 * Generate a random image pair for monotonicity tests (placeholder until T011b).
 * @param {ReturnType<typeof createPrng>} prng
 * @returns {{variant:Buffer,reference:Buffer}}
 */
export function randomImagePair(prng) {
  return { variant: Buffer.alloc(0), reference: Buffer.alloc(0) };
}
EOF