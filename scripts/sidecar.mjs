import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isSafeLocalReference } from '../src/scripts/safe-reference.js';

export { isSafeLocalReference };

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const SHA256_RE = /^[0-9a-f]{64}$/;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|\+00:00)$/;

export function validateSidecarSchema(doc) {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    throw fail('invalid-sidecar', 'sidecar must be an object');
  }
  const allowedTop = new Set(['schemaVersion', 'subject', 'provenance', 'inputs', 'review']);
  for (const k of Object.keys(doc)) {
    if (!allowedTop.has(k)) throw fail('unknown-field', `unknown field: ${k}`);
  }
  if (doc.schemaVersion !== '1.0') throw fail('invalid-schemaVersion', 'schemaVersion must be "1.0"');
  // subject
  if (typeof doc.subject !== 'object' || doc.subject === null) throw fail('invalid-subject', 'subject must be an object');
  const subjAllowed = new Set(['name', 'digest']);
  for (const k of Object.keys(doc.subject)) if (!subjAllowed.has(k)) throw fail('unknown-field', `unknown subject field: ${k}`);
  if (typeof doc.subject.name !== 'string' || doc.subject.name === '') throw fail('invalid-subject-name', 'subject.name must be a non-empty string');
  if (typeof doc.subject.digest !== 'object' || doc.subject.digest === null) throw fail('invalid-digest', 'subject.digest must be an object');
  const digAllowed = new Set(['sha256']);
  for (const k of Object.keys(doc.subject.digest)) if (!digAllowed.has(k)) throw fail('unknown-field', `unknown digest field: ${k}`);
  if (!SHA256_RE.test(doc.subject.digest.sha256)) throw fail('invalid-sha256', 'sha256 must be 64 lowercase hex');
  // provenance
  if (typeof doc.provenance !== 'object' || doc.provenance === null) throw fail('invalid-provenance', 'provenance must be an object');
  const provAllowed = new Set(['tool', 'toolVersion', 'timestamp', 'author']);
  for (const k of Object.keys(doc.provenance)) if (!provAllowed.has(k)) throw fail('unknown-field', `unknown provenance field: ${k}`);
  for (const f of ['tool', 'toolVersion', 'author']) {
    if (typeof doc.provenance[f] !== 'string' || doc.provenance[f] === '') throw fail('invalid-provenance-field', `${f} must be a non-empty string`);
  }
  if (!UTC_RE.test(doc.provenance.timestamp)) throw fail('invalid-timestamp', 'timestamp must be ISO-8601 UTC');
  // inputs
  if (doc.inputs !== undefined) {
    if (!Array.isArray(doc.inputs)) throw fail('invalid-inputs', 'inputs must be an array');
    for (const item of doc.inputs) {
      if (typeof item !== 'object' || item === null) throw fail('invalid-input', 'input must be an object');
      const inAllowed = new Set(['uri', 'digest']);
      for (const k of Object.keys(item)) if (!inAllowed.has(k)) throw fail('unknown-field', `unknown input field: ${k}`);
      if (typeof item.uri !== 'string') throw fail('invalid-uri', 'uri must be a string');
      if (!isSafeLocalReference(item.uri)) throw fail('unsafe-uri', `unsafe inputs[].uri: ${item.uri}`);
      if (typeof item.digest !== 'object' || item.digest === null) throw fail('invalid-digest', 'input.digest must be an object');
      const dinAllowed = new Set(['sha256']);
      for (const k of Object.keys(item.digest)) if (!dinAllowed.has(k)) throw fail('unknown-field', `unknown digest field: ${k}`);
      if (!SHA256_RE.test(item.digest.sha256)) throw fail('invalid-sha256', 'input sha256 must be 64 lowercase hex');
    }
  }
  // review
  if (doc.review !== undefined) {
    if (typeof doc.review !== 'object' || doc.review === null) throw fail('invalid-review', 'review must be an object');
    const revAllowed = new Set(['reviewer', 'reviewedAt', 'oversight', 'notes', 'decision', 'measuredSSIM']);
    for (const k of Object.keys(doc.review)) if (!revAllowed.has(k)) throw fail('unknown-field', `unknown review field: ${k}`);
    for (const f of ['reviewer', 'notes']) {
      if (typeof doc.review[f] !== 'string' || doc.review[f] === '') throw fail('invalid-review-field', `${f} must be a non-empty string`);
    }
    if (!UTC_RE.test(doc.review.reviewedAt)) throw fail('invalid-reviewedAt', 'reviewedAt must be ISO-8601 UTC');
    if (!['human_authored', 'human_assisted', 'human_reviewed'].includes(doc.review.oversight)) throw fail('invalid-oversight', 'invalid oversight');
    if (!['approve', 'reject'].includes(doc.review.decision)) throw fail('invalid-decision', 'invalid decision');
    if (doc.review.measuredSSIM !== undefined && typeof doc.review.measuredSSIM !== 'number') throw fail('invalid-measuredSSIM', 'measuredSSIM must be a number');
  }
}

export function verifySidecar(masterPath, sidecarPath) {
  const sp = sidecarPath || masterPath.replace(/\.[^.]+$/, '.json');
  if (!fs.existsSync(sp)) return; // no-op
  // orphan check: if master missing
  if (!fs.existsSync(masterPath)) {
    throw fail('orphan-sidecar', `orphan sidecar: ${sp}`);
  }
  let raw;
  try { raw = fs.readFileSync(sp, 'utf8'); } catch (e) { throw fail('read-error', String(e)); }
  let doc;
  try { doc = JSON.parse(raw); } catch (e) { throw fail('invalid-json', `invalid JSON in ${sp}`); }
  validateSidecarSchema(doc);
  const base = path.basename(masterPath);
  if (doc.subject.name !== base) throw fail('stale-subject-name', `subject.name ${doc.subject.name} !== ${base}`);
  const buf = fs.readFileSync(masterPath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  if (hash !== doc.subject.digest.sha256) throw fail('digest-mismatch', `digest mismatch for ${masterPath}`);
  // inputs safe already validated in schema
}

export function findOrphanSidecars(root) {
  const orphans = [];
  const roots = [path.join(root, 'media-src'), path.join(root, 'marketing')];
  const masters = new Set();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(svg|png|jpe?g|wav)$/i.test(e.name)) masters.add(full.replace(/\.[^.]+$/, '.json'));
    }
  }
  for (const r of roots) walk(r);
  function walkJson(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walkJson(full);
      else if (e.name.endsWith('.json')) {
        // sidecar if a non-json master with same stem could exist
        const stemPath = full.replace(/\.json$/, '');
        // check if any master extension exists
        const hasMaster = ['.svg', '.png', '.jpg', '.jpeg', '.wav'].some((ext) => fs.existsSync(stemPath + ext));
        if (!hasMaster) orphans.push(full);
      }
    }
  }
  for (const r of roots) walkJson(r);
  return orphans;
}