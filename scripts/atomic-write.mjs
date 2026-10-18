// Scaffold (T010) — implementation pending TDD gate (T016).
// Contract: escrita atômica write-temp→rename no mesmo diretório (FR-013d).

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Atomically write data to targetPath (temp file in same dir + rename).
 * @param {string} targetPath
 * @param {string|Buffer|Uint8Array} data
 * @returns {Promise<void>}
 */
export async function writeFileAtomic(targetPath, data) {
  throw new Error('writeFileAtomic: not implemented (scaffold T010)');
}

export { fs, path };
EOF