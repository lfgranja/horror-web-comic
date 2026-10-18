// Scaffold (T009) — implementation pending TDD gate (T014).
// Contract: portão Tier B (SSIM/PSNR) via ffmpeg nativo (FR-007/SC-007a).

/**
 * Measure fidelity of a generated variant against a lossless PNG reference.
 * @param {string} variantPath
 * @param {string} referencePath
 * @returns {Promise<{ssim:number,psnr:number}>}
 */
export async function measureFidelity(variantPath, referencePath) {
  throw new Error('measureFidelity: not implemented (scaffold T009)');
}

/**
 * Assert fidelity thresholds. Throws for standard below threshold; warns for light.
 * @param {{ssim:number,psnr:number}} result
 * @param {{light?:boolean}} [options]
 * @returns {void}
 * @throws {Error} When standard variant is below threshold or PSNR < 30 dB.
 */
export function assertFidelity(result, options = {}) {
  throw new Error('assertFidelity: not implemented (scaffold T009)');
}

/**
 * Tier B thresholds (single source; mirror in plan.md is read-only).
 * @type {Readonly<{ssimStandard:number,ssimLight:number,psnrFloor:number}>}
 */
export const FIDELITY_THRESHOLDS = Object.freeze({
  ssimStandard: 0.95,
  ssimLight: 0.90,
  psnrFloor: 30
});
EOF