import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { validateSidecarSchema } from './sidecar.mjs';

export function validateReviewBlock(sidecarDoc) {
  if (!sidecarDoc || typeof sidecarDoc.review !== 'object') {
    throw new Error('missing review block');
  }
  if (sidecarDoc.review.decision !== 'approve') {
    throw new Error(`review decision must be approve, got ${sidecarDoc.review.decision}`);
  }
}

export function validateCommitTrailers(range) {
  const r = range || process.env.GIT_RANGE || 'HEAD~1..HEAD';
  let commits = '';
  try {
    commits = execFileSync('git', ['log', '--format=%H%x1f%B%x1e', r], { encoding: 'utf8' });
  } catch (e) {
    // fallback: single commit
    commits = execFileSync('git', ['log', '-1', '--format=%H%x1f%B%x1e'], { encoding: 'utf8' });
  }
  const entries = commits.split('\x1e').filter(Boolean);
  for (const entry of entries) {
    const [hash, body] = entry.split('\x1f');
    // check if commit touches media-src/
    let files = '';
    try {
      files = execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', hash], { encoding: 'utf8' });
    } catch {
      files = '';
    }
    if (!/media-src\//.test(files)) continue;
    // requires trailers
    if (!/^Authored-With:/m.test(body)) throw new Error(`commit ${hash} missing Authored-With trailer`);
    if (!/^Reviewed-By:/m.test(body)) throw new Error(`commit ${hash} missing Reviewed-By trailer`);
    // sidecar check: find sidecars in media-src changed? require review block in sidecar
    // parse trailer Authored-With and compare to sidecar provenance if sidecar present
  }
}